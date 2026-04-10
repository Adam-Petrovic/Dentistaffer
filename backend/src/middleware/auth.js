'use strict';

const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = 'BigManFrankie357';

const authenticate = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		req.user = null;
		return next();
	}

	const token = authHeader.split(' ')[1];

	try {
		const data = jwt.verify(token, JWT_SECRET);
		const account = await prisma.account.findUnique({
			where: { id: data.id },
		});

		if (!account) {
			req.user = null;
			return next();
		}
		req.user = account;
		next();
	} catch (err) {
		req.user = null;
		next();
	}
};

const requireRole =
	(...roles) =>
	(req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		if (!roles.includes(req.user.role)) {
			return res
				.status(403)
				.json({ error: 'Forbidden: you have then wrong role' });
		}
		next();
	};

module.exports = { authenticate, requireRole };
