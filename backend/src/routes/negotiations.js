'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
const system_timers = require('../config');
const { isDiscoverable } = require('../utility/discoverability');
const { getComms } = require('../socket');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const imageUploader = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
			return cb(null, false);
		}
		cb(null, true);
	},
});

const docUploader = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (file.mimetype !== 'application/pdf') {
			return cb(new Error('invalid pdf extension'), false);
		}
		cb(null, true);
	},
});
// ai help with debuggins
router.post('/', requireRole('regular', 'business'), async (req, res) => {
	let interest_id = parseInt(req.body.interest_id);
	if (isNaN(interest_id)) {
		return res.status(400).json({ error: 'invalid interest_id' });
	}
	const now = new Date();

	const interest = await prisma.interest.findUnique({
		where: { id: interest_id },
		include: {
			job: {
				include: {
					position_type: true,
					business: true,
				},
			},
			candidate: {
				include: { account: true },
			},
			negotiation: true,
		},
	});

	if (!interest) {
		return res.status(404).json({ error: 'interest not found' });
	}

	// ownership check — must be a party to this interest
	if (
		req.user.id !== interest.candidateId &&
		req.user.id !== interest.job.business_id
	) {
		return res.status(404).json({ error: 'interest not found' });
	}

	// if active negotiation already exists for this interest, return it
	if (interest.negotiation && interest.negotiation.status === 'active') {
		if (now < new Date(interest.negotiation.expiresAt)) {
			const neg = interest.negotiation;
			return res.status(200).json({
				id: neg.id,
				status: neg.status,
				createdAt: neg.createdAt,
				updatedAt: neg.updatedAt,
				expiresAt: neg.expiresAt,
				job: {
					id: interest.job.id,
					status: interest.job.status,
					position_type: {
						id: interest.job.position_type.id,
						name: interest.job.position_type.name,
					},
					business: {
						id: interest.job.business.id,
						business_name: interest.job.business.business_name,
					},
					salary_min: interest.job.salary_min,
					salary_max: interest.job.salary_max,
					start_time: interest.job.start_time,
					end_time: interest.job.end_time,
				},
				user: {
					id: interest.candidate.id,
					first_name: interest.candidate.first_name,
					last_name: interest.candidate.last_name,
				},
				decisions: {
					candidate: neg.candidateDecision ?? null,
					business: neg.businessDecision ?? null,
				},
			});
		}
	}

	// check if job is open
	if (interest.job.status !== 'open') {
		return res.status(409).json({ error: 'job is not open' });
	}

	// check mutual interest
	if (!interest.businessInterested || !interest.candidateInterested) {
		return res.status(403).json({ error: 'interest is not mutual' });
	}

	// check discoverability
	const discoverable = await isDiscoverable(
		interest.candidate,
		interest.job,
		now,
	);
	if (!discoverable) {
		return res.status(403).json({ error: 'candidate is not discoverable' });
	}

	// check negotiation window
	const timeBeforeStart =
		(interest.job.start_time.getTime() - now.getTime()) / 1000;
	if (timeBeforeStart < system_timers.negotiationWindow) {
		return res
			.status(409)
			.json({ error: 'not enough time before job start' });
	}

	// check if either party is already in a different active negotiation
	const candidateNeg = await prisma.negotiation.findFirst({
		where: {
			candidateId: interest.candidateId,
			status: 'active',
			expiresAt: { gt: now },
		},
	});

	if (candidateNeg && candidateNeg.interestId !== interest_id) {
		const waitTime = Math.ceil(
			(candidateNeg.expiresAt.getTime() - now.getTime()) / 1000,
		);
		return res
			.status(409)
			.json({ error: 'candidate in active negotiation', waitTime });
	}

	const businessNeg = await prisma.negotiation.findFirst({
		where: {
			business_id: interest.job.business_id,
			status: 'active',
			expiresAt: { gt: now },
		},
	});

	if (businessNeg && businessNeg.interestId !== interest_id) {
		const waitTime = Math.ceil(
			(businessNeg.expiresAt.getTime() - now.getTime()) / 1000,
		);
		return res
			.status(409)
			.json({ error: 'business in active negotiation', waitTime });
	}

	// check if job already has a different active negotiation
	const jobNeg = await prisma.negotiation.findFirst({
		where: {
			jobId: interest.job.id,
			status: 'active',
			expiresAt: { gt: now },
		},
	});

	if (jobNeg && jobNeg.interestId !== interest_id) {
		const waitTime = Math.ceil(
			(jobNeg.expiresAt.getTime() - now.getTime()) / 1000,
		);
		return res
			.status(409)
			.json({ error: 'job in active negotiation', waitTime });
	}

	const expiresAt = new Date(
		now.getTime() + system_timers.negotiationWindow * 1000,
	);

	const negotiation = await prisma.negotiation.create({
		data: {
			interestId: interest_id,
			jobId: interest.jobId,
			candidateId: interest.candidateId,
			business_id: interest.job.business_id,
			expiresAt,
		},
	});

	// socket notifications
	const io = getComms();
	if (io) {
		io.to(`account:${interest.job.business_id}`).emit(
			'negotiation:started',
			{
				negotiation_id: negotiation.id,
			},
		);
		io.to(`account:${interest.candidateId}`).emit('negotiation:started', {
			negotiation_id: negotiation.id,
		});
		const allSockets = await io.fetchSockets();
		allSockets.forEach((socket) => {
			if (
				socket.userId === interest.candidateId ||
				socket.userId === interest.job.business_id
			) {
				socket.join(`negotiation:${negotiation.id}`);
			}
		});
	}

	return res.status(201).json({
		id: negotiation.id,
		status: negotiation.status,
		createdAt: negotiation.createdAt,
		updatedAt: negotiation.updatedAt,
		expiresAt: negotiation.expiresAt,
		job: {
			id: interest.job.id,
			status: interest.job.status,
			position_type: {
				id: interest.job.position_type.id,
				name: interest.job.position_type.name,
			},
			business: {
				id: interest.job.business.id,
				business_name: interest.job.business.business_name,
			},
			salary_min: interest.job.salary_min,
			salary_max: interest.job.salary_max,
			start_time: interest.job.start_time,
			end_time: interest.job.end_time,
		},
		user: {
			id: interest.candidate.id,
			first_name: interest.candidate.first_name,
			last_name: interest.candidate.last_name,
		},
		decisions: {
			candidate: negotiation.candidateDecision ?? null,
			business: negotiation.businessDecision ?? null,
		},
	});
});
// -----
// ai help fo rdebgin
router.get('/me', requireRole('regular', 'business'), async (req, res) => {
	let uAccount;
	if (req.user.role === 'regular') {
		uAccount = await prisma.regularAccount.findUnique({
			where: { id: req.user.id },
			include: {
				negotiation: true,
			},
		});
	}
	if (req.user.role === 'business') {
		uAccount = await prisma.businessAccount.findUnique({
			where: { id: req.user.id },
			include: {
				negotiation: true,
			},
		});
	}

	if (
		!uAccount ||
		!uAccount.negotiation ||
		uAccount.negotiation.length === 0
	) {
		return res.status(404).json({ error: 'No negotiations found' });
	}

	const currentNegotiation = uAccount.negotiation[0];

	const interest = await prisma.interest.findUnique({
		where: {
			jobId_candidateId: {
				jobId: currentNegotiation.jobId, // Now this is defined
				candidateId: currentNegotiation.candidateId, // Now this is defined
			},
		},
		include: {
			job: {
				include: {
					position_type: true,
					business: true,
				},
			},
			candidate: true,
			negotiation: true,
		},
	});

	if (!interest) {
		return res.status(404).json({ error: 'Interest record missing' });
	}
	const negotiation = interest.negotiation;

	return res.status(200).json({
		id: interest.negotiation.id,
		status: interest.negotiation.status,
		createdAt: interest.negotiation.createdAt,
		updatedAt: interest.negotiation.updatedAt,
		expiresAt: interest.negotiation.expiresAt,
		job: {
			id: interest.job.id,
			status: interest.job.status,
			position_type: {
				id: interest.job.position_type_id,
				name: interest.job.position_type.name,
			},
			business: {
				id: interest.job.business.id,
				business_name: interest.job.business.business_name,
			},
			salary_min: interest.job.salary_min,
			salary_max: interest.job.salary_max,
			start_time: interest.job.start_time,
			end_time: interest.job.end_time,
		},
		user: {
			id: interest.candidate.id,
			first_name: interest.candidate.first_name,
			last_name: interest.candidate.last_name,
		},
		decisions: {
			candidate: negotiation.candidateDecision ?? null,
			business: negotiation.businessDecision ?? null,
		},
	});
});
// Ai help with debuggins
router.patch(
	'/me/decision',
	requireRole('regular', 'business'),
	async (req, res) => {
		const now = new Date();
		const { decision } = req.body;
		let { negotiation_id } = req.body;

		if (!decision || !['accept', 'decline'].includes(decision)) {
			return res
				.status(400)
				.json({ error: 'decision must be accept or decline' });
		}

		if (negotiation_id === undefined || negotiation_id === null) {
			return res
				.status(400)
				.json({ error: 'negotiation_id is required' });
		}
		negotiation_id = parseInt(negotiation_id);
		if (isNaN(negotiation_id)) {
			return res
				.status(400)
				.json({ error: 'negotiation_id must be a number' });
		}

		const isRegular = req.user.role === 'regular';

		const negotiation = await prisma.negotiation.findFirst({
			where: {
				status: 'active',
				expiresAt: { gt: now },
				...(isRegular
					? { candidateId: req.user.id }
					: { business_id: req.user.id }),
			},
			include: {
				interest: {
					include: {
						job: true,
						candidate: true,
					},
				},
			},
		});

		if (!negotiation) {
			return res
				.status(404)
				.json({ error: 'No active negotiation found' });
		}

		if (negotiation.id !== negotiation_id) {
			return res.status(409).json({
				error: 'negotiation_id does not match your active negotiation',
			});
		}

		const updateData = { updatedAt: now };

		if (isRegular) {
			updateData.candidateDecision = decision;
		} else {
			updateData.businessDecision = decision;
		}

		if (decision === 'decline') {
			updateData.status = 'failed';
		} else {
			// check if both accepted
			const candidateDecision = isRegular
				? decision
				: negotiation.candidateDecision;
			const businessDecision = isRegular
				? negotiation.businessDecision
				: decision;

			if (
				candidateDecision === 'accept' &&
				businessDecision === 'accept'
			) {
				updateData.status = 'success';
			}
		}

		const updated = await prisma.negotiation.update({
			where: { id: negotiation.id },
			data: updateData,
		});

		if (updated.status === 'success') {
			await prisma.job.update({
				where: { id: negotiation.jobId },
				data: {
					status: 'filled',
					worker_id: negotiation.candidateId,
				},
			});
		}

		if (updated.status === 'failed') {
			// reset inactivity timer and make available again
			await prisma.regularAccount.update({
				where: { id: negotiation.candidateId },
				data: {
					lastActive: now,
					available: true,
				},
			});
			// reset interests
			await prisma.interest.update({
				where: { id: negotiation.interestId },
				data: {
					candidateInterested: null,
					businessInterested: null,
				},
			});
		}

		if (updated.status === 'success') {
			// also reset inactivity timer on success per spec
			await prisma.regularAccount.update({
				where: { id: negotiation.candidateId },
				data: { lastActive: now },
			});
		}

		return res.status(200).json({
			id: updated.id,
			status: updated.status,
			createdAt: updated.createdAt,
			expiresAt: updated.expiresAt,
			updatedAt: updated.updatedAt,
			decisions: {
				candidate: updated.candidateDecision ?? null,
				business: updated.businessDecision ?? null,
			},
		});
	},
);

router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

router.all('/me', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

module.exports = router;
