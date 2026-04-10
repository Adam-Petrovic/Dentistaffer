'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
const system_timers = require('../config');
const { isDiscoverable } = require('../utility/discoverability');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { count } = require('console');

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

router.get('/', requireRole('regular'), async (req, res) => {
	let { lat, lon, position_type_id, business_id, sort, order, page, limit } =
		req.query;

	let where = { status: 'open' };
	if (lat) {
		lat = parseFloat(lat);
		if (isNaN(lat)) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid latitude',
			});
		}
	}

	if (lon) {
		lon = parseFloat(lon);
		if (isNaN(lon)) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid longitude',
			});
		}
	}
	let filter = {};
	if (position_type_id) {
		position_type_id = parseInt(position_type_id);
		if (isNaN(position_type_id)) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid position_type_id',
			});
		}
		where.position_type_id = position_type_id;
	}

	if (business_id) {
		business_id = parseInt(business_id);
		if (isNaN(business_id)) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid business_id',
			});
		}

		where.business_id = business_id;
	}

	if (sort) {
		if (typeof sort !== 'string') {
			return res.status(400).json({
				error: '400 Bad Request: Invalid sort',
			});
		}
		if (
			![
				'updatedAt',
				'start_time',
				'salary_min',
				'salary_max',
				'distance',
				'eta',
			].includes(sort)
		) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid sort',
			});
		} else if (['distance', 'eta'].includes(sort) && (!lat || !lon)) {
			return res.status(400).json({
				error: '400 Bad Request: no lat or long when sorting by eta/distance',
			});
		}
	} else {
		sort = 'start_time';
	}

	if (order) {
		if (typeof sort !== 'string') {
			return res.status(400).json({
				error: '400 Bad Request: Invalid sort',
			});
		}

		if (!['asc', 'desc'].includes(order)) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid order',
			});
		}
	} else {
		order = 'asc';
	}

	if (page) {
		page = parseInt(page);
		if (isNaN(page) || page < 0) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid page',
			});
		}
	} else {
		page = 1;
	}

	if (limit) {
		limit = parseInt(limit);
		if (isNaN(limit) || limit < 0) {
			return res.status(400).json({
				error: '400 Bad Request: Invalid limit',
			});
		}
	} else {
		limit = 10;
	}

	const count = await prisma.job.count({ where });
	let jobs;
	if (!['distance', 'eta'].includes(sort)) {
		let orderBy = {
			[sort]: order,
		};
		jobs = await prisma.job.findMany({
			where,
			orderBy,
			skip: (page - 1) * limit,
			take: limit,
			include: { position_type: true, business: true },
		});
	} else {
		jobs = await prisma.job.findMany({
			where,
			include: { position_type: true, business: true },
		});
	}
	let results = jobs.map((job) => {
		const entry = {
			id: job.id,
			status: job.status,
			position_type: {
				id: job.position_type_id,
				name: job.position_type.name,
			},
			business: {
				id: job.business.id,
				business_name: job.business.business_name,
			},
			salary_min: job.salary_min,
			salary_max: job.salary_max,
			start_time: job.start_time,
			end_time: job.end_time,
			updatedAt: job.updatedAt,
		};
		if (lat && lon) {
			let R = 6371.2;
			let speed = 30;
			let phi_1 = (lat * Math.PI) / 180;
			let phi_2 = (job.business.locationLat * Math.PI) / 180;
			let lam_1 = (lon * Math.PI) / 180;
			let lam_2 = (job.business.locationLong * Math.PI) / 180;

			let d_phi = phi_2 - phi_1;
			let d_lam = lam_2 - lam_1;

			let hav_theta =
				(1 -
					(Math.cos(d_phi) +
						Math.cos(phi_1) *
							Math.cos(phi_2) *
							(1 - Math.cos(d_lam)))) /
				2;

			let theta = 2 * Math.asin(Math.sqrt(hav_theta));

			let distance = theta * R;
			let eta = distance * speed * 60;

			entry.distance = distance;
			entry.eta = eta;
		}
		return entry;
	});
	if (['distance'].includes(sort)) {
		if (order == 'asc') {
			results.sort((a, b) => a.distance - b.distance);
		} else {
			results.sort((a, b) => b.distance - a.distance);
		}
		results = results.slice((page - 1) * limit, (page - 1) * limit + limit);
	}

	if (['eta'].includes(sort)) {
		if (order == 'asc') {
			results.sort((a, b) => a.eta - b.eta);
		} else {
			results.sort((a, b) => b.eta - a.eta);
		}
		results = results.slice((page - 1) * limit, (page - 1) * limit + limit);
	}

	return res.status(200).json({ count, results });
});

router.get('/:jobId', requireRole('regular', 'business'), async (req, res) => {
	let { lat, lon } = req.query;
	const jobId = parseInt(req.params.jobId);

	if (isNaN(jobId)) {
		return res.status(404).json({ error: 'Bad jobID' });
	}

	if (lat) {
		lat = parseFloat(lat);
		if (isNaN(lat)) {
			return res.status(400).json({ error: 'Bad req' });
		}
	}

	if (lon) {
		lon = parseFloat(lon);
		if (isNaN(lon)) {
			return res.status(400).json({ error: 'Bad req' });
		}
	}

	if (req.user.role == 'business') {
		if (lat || lon) {
			return res.status(400).json({ error: 'Bad req' });
		}
	}

	if (req.user.role == 'regular') {
		if ((!lat && lon) || (lat && !lon)) {
			return res.status(400).json({ error: 'Bad lat/lon' });
		}
	}
	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
		},
		include: {
			position_type: true,
			business: true,
		},
	});

	if (!job) {
		return res.status(404).json({ error: 'Not found' });
	}

	if (req.user.role === 'business') {
		if (job.business_id !== req.user.id) {
			return res.status(404).json({ error: 'UNauthorized' });
		}
	}

	if (req.user.role === 'regular') {
		const isQualified = await prisma.qualification.findFirst({
			where: {
				user_id: req.user.id,
				position_type_id: job.position_type_id,
				status: 'approved',
			},
		});

		if (!isQualified) {
			return res.status(403).json({ error: 'not qualified' });
		}
	}

	const response = {
		id: job.id,
		status: job.status,
		position_type: {
			id: job.position_type.id,
			name: job.position_type.name,
		},
		business: {
			id: job.business.id,
			business_name: job.business.business_name,
		},
		worker: job.worker_id ? { id: job.worker_id } : null, // Or job.worker if included
		note: job.note ?? null,
		salary_min: job.salary_min,
		salary_max: job.salary_max,
		start_time: job.start_time.toISOString(),
		end_time: job.end_time.toISOString(),
		updatedAt: job.updatedAt.toISOString(),
	};

	if (lat && lon) {
		let R = 6371.2;
		let speed = 30;
		let phi_1 = (lat * Math.PI) / 180;
		let phi_2 = (job.business.locationLat * Math.PI) / 180;
		let lam_1 = (lon * Math.PI) / 180;
		let lam_2 = (job.business.locationLong * Math.PI) / 180;

		let d_phi = phi_2 - phi_1;
		let d_lam = lam_2 - lam_1;

		let hav_theta =
			(1 -
				(Math.cos(d_phi) +
					Math.cos(phi_1) *
						Math.cos(phi_2) *
						(1 - Math.cos(d_lam)))) /
			2;

		let theta = 2 * Math.asin(Math.sqrt(hav_theta));

		let distance = theta * R;
		let eta = distance * speed * 60;

		response.distance = distance;
		response.eta = eta;
	}

	return res.status(200).json(response);
});
router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});
// ------
router.patch('/:jobId/no-show', requireRole('business'), async (req, res) => {
	if (req.user.role !== 'business') {
		return res.status(403).json({ error: 'must be business' });
	}

	const jobId = parseInt(req.params.jobId);
	if (isNaN(jobId)) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid limit',
		});
	}

	const job = await prisma.job.findUnique({
		where: { id: jobId },
	});

	const business = await prisma.businessAccount.findUnique({
		where: { id: req.user.id },
	});

	if (!job) {
		return res.status(404).json({ error: 'Job not found' });
	}

	if (!business || business.id !== job.business_id) {
		return res.status(403).json({ error: 'cannot modify job' });
	}

	const now = new Date();
	if (
		now < job.start_time ||
		job.status !== 'filled' ||
		job.end_time <= now
	) {
		return res.status(409).json({ error: 'Job has not staruted' });
	}

	const updatedJob = await prisma.job.update({
		where: { id: jobId },
		data: {
			status: 'canceled',
		},
	});

	await prisma.regularAccount.update({
		where: { id: job.worker_id },
		data: {
			suspended: true,
		},
	});

	return res.status(200).json({
		id: updatedJob.id,
		status: updatedJob.status,
		updatedAt: updatedJob.updatedAt,
	});
});

// -----
router.patch('/:jobId/interested', requireRole('regular'), async (req, res) => {
	const jobId = parseInt(req.params.jobId);
	const { interested } = req.body;
	const now = new Date();

	if (isNaN(jobId)) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid limit',
		});
	}

	if (typeof interested !== 'boolean') {
		return res.status(400).json({
			error: '400 Bad Request: Invalid interested',
		});
	}

	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
		},
		include: {
			position_type: true,
		},
	});

	if (!job) {
		return res.status(404).json({ error: 'Job not found' });
	}

	const qualification = await prisma.qualification.findFirst({
		where: {
			user_id: req.user.id,
			position_type_id: job.position_type_id,
			status: 'approved',
		},
	});

	if (!qualification) {
		return res.status(403).json({ error: 'unqualified' });
	}

	if (job.status !== 'open') {
		return res.status(409).json({ error: 'No longer available' });
	}

	const timeBeforeStart = (job.start_time.getTime() - now.getTime()) / 1000;
	if (timeBeforeStart < system_timers.negotiationWindow) {
		return res.status(409).json({ error: 'negotiantion window past' });
	}

	const isInterested = await prisma.interest.findFirst({
		where: {
			jobId: jobId,
			candidateId: req.user.id,
		},
	});

	if (!interested && (!isInterested || !isInterested.candidateInterested)) {
		return res.status(400).json({ error: 'You are unitersted in job' });
	}

	if (isInterested) {
		const activeNegotiation = await prisma.negotiation.findFirst({
			where: { interestId: isInterested.id, status: 'active' },
		});

		if (activeNegotiation) {
			return res.status(409).json({
				error: 'You are currently in a negotiation for this job',
			});
		}
	}

	if (!interested && (!isInterested || !isInterested.candidateInterested)) {
		return res.status(400).json({ error: 'You are not interested in job' });
	}

	const interest = await prisma.interest.upsert({
		where: {
			jobId_candidateId: { jobId: jobId, candidateId: req.user.id },
		},
		create: {
			jobId: jobId,
			candidateId: req.user.id,
			candidateInterested: interested,
		},
		update: {
			candidateInterested: interested,
		},
	});

	if (interested) {
		await prisma.regularAccount.update({
			where: { id: req.user.id },
			data: { lastActive: now },
		});
	}

	return res.status(200).json({
		id: interest.id,
		job_id: jobId,
		candidate: {
			id: req.user.id,
			interested: interest.candidateInterested,
		},
		business: {
			id: job.business_id,
			interested: interest.businessInterested ?? null,
		},
	});
});

router.get('/:jobId/candidates', requireRole('business'), async (req, res) => {
	let { page, limit } = req.query;
	let jobId = parseInt(req.params.jobId);

	if (isNaN(jobId)) {
		return res.status(400).json({ error: 'incorrect job ID' });
	}

	const job = await prisma.job.findUnique({
		where: { id: jobId },
	});

	if (!job) {
		return res.status(404).json({ error: 'job not found' });
	}

	if (job.business_id !== req.user.id) {
		return res.status(404).json({ error: 'not your job' });
	}

	if (page) {
		page = parseInt(page);
		if (isNaN(page) || page < 1) {
			return res.status(400).json({ error: 'incorrect page' });
		}
	} else {
		page = 1;
	}

	if (limit) {
		limit = parseInt(limit);
		if (isNaN(limit) || limit < 1) {
			return res.status(400).json({ error: 'incorrect limit' });
		}
	} else {
		limit = 10;
	}

	const candidates = await prisma.regularAccount.findMany({
		where: {
			available: true,
			suspended: false,
			account: {
				activated: true,
			},
			qualifications: {
				some: {
					position_type_id: job.position_type_id,
					status: 'approved',
				},
			},
		},
		include: {
			account: true,
			interests: {
				where: { jobId: jobId },
			},
		},
		take: limit,
		skip: (page - 1) * limit,
	});

	const invited = await prisma.interest.findMany({
		where: {
			jobId: jobId,
			businessInterested: true,
		},
		take: limit,
		skip: (page - 1) * limit,
	});

	const count = await prisma.interest.count({
		where: {
			jobId: jobId,
			businessInterested: true,
			candidateInterested: null,
		},
		take: limit,
		skip: (page - 1) * limit,
	});

	const results = candidates.map((user) => ({
		id: user.id,
		first_name: user.first_name,
		last_name: user.last_name,
		invited: invited[user.id] ?? false,
	}));

	return res.status(200).json({
		count,
		results,
	});
});

router.get(
	'/:jobId/candidates/:userId',
	requireRole('business'),
	async (req, res) => {
		let { jobId, userId } = req.params;

		jobId = parseInt(jobId);
		userId = parseInt(userId);

		if (!jobId) {
			return res.status(404).json({ error: 'incorrect invlaid jobId' });
		}

		if (!userId) {
			return res.status(404).json({ error: 'incorrect invlaid userid' });
		}

		const user = await prisma.regularAccount.findUnique({
			where: { id: userId },
			include: { account: true },
		});

		if (!user) {
			return res.status(404).json({ error: 'user not found' });
		}

		const job = await prisma.job.findUnique({
			where: { id: jobId },
			include: { position_type: true },
		});

		if (!job) {
			return res.status(404).json({ error: 'job not found' });
		}

		const now = new Date();

		if (job.business_id != req.user.id) {
			return res.status(403).json({ error: 'forbidden' });
		}

		const discoverable = await isDiscoverable(user, job, now);
		if (!discoverable) {
			return res.status(404).json({ error: 'forbidden' });
		}

		const qualificaiton = await prisma.qualification.findFirst({
			where: {
				user_id: userId,
				position_type_id: job.position_type_id,
			},
		});

		let userJson = {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			avatar: user.account.avatar,
			resume: user.resume,
			biography: user.account.biography,
			qualification: qualificaiton
				? {
						id: qualificaiton.id,
						position_type_id: qualificaiton.position_type_id,
						document: qualificaiton.document,
						note: qualificaiton.note,
						updatedAt: qualificaiton.updatedAt,
					}
				: null,
		};

		if (job.worker_id == user.id) {
			userJson.email = user.account.email;
			userJson.phone_number = user.account.phone_number;
		}

		let response = {
			user: userJson,
			job: {
				id: job.id,
				status: job.status,
				position_type: {
					id: job.position_type_id,
					name: job.position_type.name,
					description: job.position_type.description,
				},
				start_time: job.start_time,
				end_time: job.end_time,
			},
		};

		return res.status(200).json(response);
	},
);

router.patch(
	'/:jobId/candidates/:userId/interested',
	requireRole('business'),
	async (req, res) => {
		let { jobId, userId } = req.params;
		let { interested } = req.body;

		if (typeof interested !== 'boolean') {
			return res
				.status(400)
				.json({ error: 'incorrect invlaid intersted' });
		}

		jobId = parseInt(jobId);
		userId = parseInt(userId);

		if (!jobId) {
			return res.status(404).json({ error: 'incorrect invlaid jobId' });
		}

		if (!userId) {
			return res.status(404).json({ error: 'incorrect invlaid userid' });
		}

		const user = await prisma.regularAccount.findUnique({
			where: { id: userId },
			include: { account: true },
		});

		if (!user) {
			return res.status(404).json({ error: 'user not found' });
		}
		const job = await prisma.job.findUnique({ where: { id: jobId } });

		if (!job) {
			return res.status(404).json({ error: 'job not found' });
		}

		if (job.status !== 'open') {
			return res.status(409).json({ error: 'conflict' });
		}

		const now = new Date();

		if (job.business_id !== req.user.id) {
			return res.status(404).json({ error: 'forbidden' });
		}

		const discoverable = await isDiscoverable(user, job, now);
		if (!discoverable) {
			return res.status(403).json({ error: 'hello' });
		}

		const interest = await prisma.interest.findUnique({
			where: { jobId_candidateId: { jobId, candidateId: userId } },
		});

		if (interested === false && !interest) {
			return res
				.status(400)
				.json({ error: 'incorrect invlaid intersted' });
		}

		const updatedInterest = await prisma.interest.upsert({
			where: {
				jobId_candidateId: {
					jobId: jobId,
					candidateId: userId,
				},
			},
			update: {
				businessInterested: interested,
			},
			create: {
				jobId: jobId,
				candidateId: userId,
				businessInterested: interested,
			},
			include: {
				candidate: true,
			},
		});

		return res.status(200).json({
			id: updatedInterest.id,
			job_id: jobId,
			candidate: {
				id: user.id,
				interested: updatedInterest.candidateInterested ?? false,
			},
			business: {
				id: req.user.id,
				interested: updatedInterest.businessInterested,
			},
		});
	},
);

router.get('/:jobId/interests', requireRole('business'), async (req, res) => {
	let { page, limit } = req.query;
	let jobId = parseInt(req.params.jobId);

	if (isNaN(jobId)) {
		return res.status(400).json({ error: 'incorrect limit' });
	}

	if (page) {
		page = parseInt(page);
		if (isNaN(page) || page < 1) {
			return res.status(400).json({ error: 'incorrect page' });
		}
	} else {
		page = 1;
	}

	if (limit) {
		limit = parseInt(limit);
		if (isNaN(limit) || limit < 1) {
			return res.status(400).json({ error: 'incorrect limit' });
		}
	} else {
		limit = 10;
	}

	const job = await prisma.job.findUnique({
		where: { id: jobId },
	});

	if (!job) {
		return res.status(404).json({ error: 'incorrect job not found' });
	}

	if (req.user.id !== job.business_id) {
		return res.status(403).json({ error: 'unoauthorized to see' });
	}

	const count = await prisma.interest.count({
		where: {
			jobId: jobId,
		},
	});

	const interests = await prisma.interest.findMany({
		where: { jobId: jobId },
		include: {
			candidate: true,
		},
		take: limit,
		skip: (page - 1) * limit,
	});

	let results = interests.map((interest) => ({
		interest_id: interest.id,
		mutual:
			(interest.businessInterested && interest.candidateInterested) ??
			false,
		user: {
			id: interest.candidate.id,
			first_name: interest.candidate.first_name,
			last_name: interest.candidate.last_name,
		},
	}));

	return res.status(200).json({ count, results });
});

module.exports = router;
