'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'BigManFrankie357';
const prisma = require('./prisma');
let io;

function attach_sockets(server) {
	io = new Server(server, { cors: { origin: '*' } });

	io.use((socket, next) => {
		const token = socket.handshake.auth.token;
		if (!token) {
			return next(new Error('no auth'));
		}
		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			socket.userId = decoded.id;
			socket.role = decoded.role;
			next();
		} catch (err) {
			return next(new Error('bad token'));
		}
	});

	io.on('connection', async (socket) => {
		socket.join(`account:${socket.userId}`);

		// Rejoin active negotiation room if one exists
		try {
			const negotiation = await prisma.negotiation.findFirst({
				where: {
					OR: [
						{ candidateId: socket.userId },
						{ business_id: socket.userId },
					],
					status: 'active',
				},
			});
			if (negotiation) {
				socket.join(`negotiation:${negotiation.id}`);
			}
		} catch {}

		socket.on('negotiation:message', async (data) => {
			// fix: was 'negotiation: '
			const { negotiation_id, text } = data;

			if (!negotiation_id || !text) {
				return socket.emit('negotiation:error', {
					error: 'Negotiation not found',
					message: 'need both _id and text',
				});
			}

			if (!socket.userId) {
				return socket.emit('negotiation:error', {
					error: 'Not authenticated',
					message: 'must be authenticated',
				});
			}

			const negotiation = await prisma.negotiation.findUnique({
				where: { id: negotiation_id },
				include: {
					interest: {
						include: {
							candidate: true,
							job: true,
						},
					},
				},
			});

			const now = new Date();
			if (
				!negotiation ||
				negotiation.status !== 'active' ||
				now > negotiation.expiresAt
			) {
				return socket.emit('negotiation:error', {
					error: 'Negotiation not found',
					message: 'DNE or not active',
				});
			}

			if (
				socket.userId !== negotiation.interest.candidateId &&
				socket.userId !== negotiation.interest.job.business_id
			) {
				return socket.emit('negotiation:error', {
					error: 'Not part of this negotiation',
					message: 'get out',
				});
			}

			io.to(`negotiation:${negotiation_id}`).emit('negotiation:message', {
				negotiation_id,
				sender: {
					role: socket.role,
					id: socket.userId,
				},
				text,
				createdAt: now,
			});
		});

		socket.on('disconnect', () => {
			console.log(`Socket disconnected: ${socket.userId}`);
		});
	});

	return io;
}

function getComms() {
	if (!io) {
		return null;
	}
	return io;
}

module.exports = { attach_sockets, getComms };
