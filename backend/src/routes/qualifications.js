const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { availabilityTimeout } = require('../config');

const docUploader = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (file.mimetype !== 'application/pdf') {
			return cb(null, false);
		}
		cb(null, true);
	},
});

// ---
router.get('/', requireRole('admin'), async (req, res) => {
	if (req.user.role !== 'admin') {
		return res.status(403).json({ error: 'non admin' });
	}
	let { keyword, page, limit } = req.query;

	page = Math.max(1, parseInt(page) || 1);
	limit = Math.max(1, parseInt(limit) || 10);

	let where = {
		status: { in: ['submitted', 'revised'] },
	};

	if (keyword) {
		where.OR = [
			{ user: { first_name: { contains: keyword } } },
			{ user: { last_name: { contains: keyword } } },
			{ user: { account: { email: { contains: keyword } } } },
			{ user: { account: { postal_address: { contains: keyword } } } },
			{ user: { account: { phone_number: { contains: keyword } } } },
		];
	}
	const count = await prisma.qualification.count({ where });
	const quals = await prisma.qualification.findMany({
		where,
		skip: (page - 1) * limit,
		take: limit,
		include: {
			user: {
				include: { account: true }, // For email/phone
			},
			position_type: true,
		},
		orderBy: {
			updatedAt: 'desc', // Optional: usually expected for admin lists
		},
	});

	const results = quals.map((qual) => ({
		id: qual.id,
		status: qual.status,
		user: {
			id: qual.user.id,
			first_name: qual.user.first_name,
			last_name: qual.user.last_name,
		},
		position_type: {
			id: qual.position_type.id,
			name: qual.position_type.name,
		},
		updatedAt: qual.updatedAt,
	}));

	return res.status(200).json({ count, results });
});

// ---
router.post('/', requireRole('regular', 'admin'), async (req, res) => {
	let { position_type_id, note } = req.body;

	position_type_id = parseInt(position_type_id);

	if (isNaN(position_type_id)) {
		return res.status(400).json({ error: 'invalid position_type_id' });
	}

	if (!note || typeof note !== 'string') {
		note = '';
	}

	let position = await prisma.positionType.findUnique({
		where: { id: position_type_id },
	});

	if (!position) {
		return res.status(404).json({ error: 'invalid position' });
	}

	let qualExists = await prisma.qualification.findFirst({
		where: {
			user_id: req.user.id,
			position_type_id: position.id,
		},
	});

	if (qualExists) {
		return res.status(409).json({ error: 'duplicate' });
	}

	const qual = await prisma.qualification.create({
		data: {
			note: note,
			user_id: req.user.id,
			position_type_id: position.id,
			status: 'created',
		},
		include: {
			user: true,
			position_type: true,
		},
	});

	position = await prisma.positionType.findUnique({
		where: { id: position_type_id },
	});

	return res.status(201).json({
		id: qual.id,
		status: qual.status,
		note: qual.note,
		user: {
			id: qual.user.id,
			first_name: qual.user.first_name,
			last_name: qual.user.last_name,
		},
		position_type: {
			id: qual.position_type.id,
			name: qual.position_type.name,
		},
		updatedAt: qual.updatedAt,
	});
});

// ---
router.get(
	'/:qualificationId',
	requireRole('regular', 'business', 'admin'),
	async (req, res) => {
		const qualificationId = parseInt(req.params.qualificationId);

		if (isNaN(qualificationId)) {
			return res.status(400).json({ error: 'invalid qualificationId' });
		}

		const qualification = await prisma.qualification.findUnique({
			where: { id: qualificationId },
			include: {
				user: {
					include: {
						account: true,
						interests: {
							where: { jobId: { not: undefined } },
							include: { job: true },
						},
					},
				},
				position_type: true,
			},
		});

		if (!qualification) {
			return res.status(404).json({ error: 'Qualificiation not found' });
		}

		if (req.user.role == 'business') {
			if (qualification.status !== 'approved') {
				return res
					.status(403)
					.json({ error: 'Forbidden: not autheorized' });
			}

			// traversing the user interests
			let isInterested = false;
			qualification.user.interests.forEach((interest) => {
				if (
					interest.job.business_id === req.user.id &&
					interest.job.status == 'open'
				) {
					isInterested = true;
				}
			});

			if (!isInterested) {
				return res
					.status(403)
					.json({ error: 'Forbidden: not autheorized' });
			}

			// third check
			let isRequired = false;
			qualification.user.interests.forEach((interest) => {
				if (
					interest.candidateInterested &&
					interest.job.business_id == req.user.id &&
					interest.job.position_type_id ==
						qualification.position_type_id
				) {
					isRequired = true;
				}
			});

			if (!isRequired) {
				return res
					.status(403)
					.json({ error: 'Forbidden: not autheorized' });
			}
		}

		if (req.user.role === 'regular') {
			if (qualification.user_id !== req.user.id) {
				return res.status(404).json({ error: 'not found' });
			}
		}

		const response = {
			id: qualification.id,
			document: qualification.document ?? null,
			note: qualification.document,
			position_type: {
				id: qualification.position_type.id,
				name: qualification.position_type.name,
				description: qualification.position_type.description,
			},
		};

		let userData = {
			id: qualification.user_id,
			first_name: qualification.user.first_name,
			last_name: qualification.user.last_name,
			role: qualification.user.account.role,
			avatar: qualification.user.account.avatar ?? null,
			resume: qualification.user.resume ?? null,
			biography: qualification.user.biography ?? null,
		};

		if (req.user.role !== 'business') {
			userData.email = qualification.user.account.email;
			userData.phone_number = qualification.user.account.phone_number;
			userData.postal_address = qualification.user.account.postal_address;
			userData.birthday = qualification.user.birthday;
			userData.activated = qualification.user.account.activated;
			userData.suspended = qualification.user.suspended;
			userData.createdAt = qualification.user.account.createdAt;
			response.status = qualification.status;
		}
		response.user = userData;
		return res.status(200).json(response);
	},
);

// ---
router.patch(
	'/:qualificationId',
	requireRole('regular', 'admin'),
	async (req, res) => {
		const { status, note } = req.body;
		if (status && typeof status !== 'string') {
			return res.status(400).json({ error: 'Invalid status' });
		}

		if (note && typeof note !== 'string') {
			return res.status(400).json({ error: 'Invalid note' });
		}

		const qualificationId = parseInt(req.params.qualificationId);
		if (isNaN(qualificationId)) {
			return res.status(400).json({ error: 'Invalid qualificaiton' });
		}

		let qualification = await prisma.qualification.findUnique({
			where: { id: qualificationId },
			include: { position_type: true, user: true },
		});

		let now = new Date();

		let data = { updatedAt: now };

		if (!qualification) {
			return res.status(404).json({ error: ' qualification not found2' });
		}

		if (
			req.user.role === 'regular' &&
			qualification.user_id !== req.user.id
		) {
			return res.status(403).json({ error: 'Qualification not found' });
		}

		if (req.user.role == 'admin' && status) {
			if (!['approved', 'rejected'].includes(status)) {
				return res.status(403).json({ error: ' invalid status' });
			}

			if (!['submitted', 'revised'].includes(qualification.status)) {
				return res.status(403).json({ error: ' invalid status' });
			}
			data.status = status;
		}

		if (req.user.role == 'regular') {
			if (qualification.user_id !== req.user.id) {
				return res.status(403).json({ error: 'unauthorized' });
			}
			if (status) {
				if (
					(qualification.status == 'created' &&
						status == 'submitted') ||
					(['approved', 'rejected'].includes(qualification.status) &&
						status == 'revised')
				) {
					data.status = status;
				} else {
					return res.status(403).json({ error: 'unauthorized' });
				}
			}
		}

		if (note) {
			data.note = note;
		}

		await prisma.qualification.update({
			where: { id: qualificationId },
			data,
		});

		qualification = await prisma.qualification.findUnique({
			where: { id: qualificationId },
			include: { position_type: true, user: true },
		}); // get he new one

		const response = {
			id: qualification.id,
			status: status,
			document: qualification.document ?? null,
			note: qualification.note,
			position_type: {
				id: qualification.position_type.id,
				name: qualification.position_type.name,
				description: qualification.position_type.description,
			},
			updatedAt: qualification.updatedAt,
		};

		return res.status(200).json(response);
	},
);

// ---
router.put(
	'/:qualificationId/document',
	requireRole('regular'),
	async (req, res) => {
		docUploader.single('file')(req, res, async (err) => {
			if (err) {
				return res.status(400).json({ error: err.message });
			}

			if (!req.file) {
				return res.status(400).json({ error: 'Missing file' });
			}

			const qualificationId = parseInt(req.params.qualificationId);

			if (isNaN(qualificationId)) {
				return res
					.status(400)
					.json({ error: 'invalid qualificationId' });
			}

			const qual = await prisma.qualification.findUnique({
				where: { id: qualificationId },
			});

			if (!qual) {
				return res
					.status(404)
					.json({ error: 'Unauthorized or not found' });
			}

			if (qual.user_id !== req.user.id) {
				return res.status(403).json({ error: 'Forbidden' });
			}

			const documentDir = `/uploads/users/${req.user.id}/${qualificationId}`;

			fs.mkdirSync(`.{documentDir}`, { recursive: true });
			fs.writeFileSync(`.${documentDir}/document.pdf`, req.file.buffer);

			const finalDoc = await prisma.qualification.update({
				where: { id: qualificationId },
				data: {
					document: `${documentDir}/document.pdf`,
				},
			});

			return res.status(200).json({ document: finalDoc.document });
		});
	},
);

router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

module.exports = router;
