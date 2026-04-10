const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
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

router.post('/', requireRole('admin'), async (req, res) => {
	const { name, description, hidden } = req.body;

	if (!name || typeof name !== 'string') {
		return res.status(400).json({ error: 'invalid name' });
	}

	if (!description || typeof description !== 'string') {
		return res.status(400).json({ error: 'invalid description' });
	}

	const result = await prisma.positionType.create({
		data: {
			name: name,
			description: description,
			hidden: hidden ?? true,
		},
	});

	return res.status(201).json({
		id: result.id,
		name: result.name,
		description: result.description,
		hidden: result.hidden,
		num_qualified: 0,
	});
});

router.get(
	'/',
	requireRole('admin', 'business', 'regular'),
	async (req, res) => {
		let { keyword, name, hidden, num_qualified, page, limit } = req.query;
		let where = {};

		if (!page) {
			page = 1;
		} else {
			page = parseInt(page);
		}

		if (isNaN(page) || page < 1) {
			return res.status(400).json({ error: 'Invalid page' });
		}

		if (!limit) {
			limit = 10;
		} else {
			limit = parseInt(limit);
		}

		if (isNaN(limit) || limit < 1) {
			return res.status(400).json({ error: 'Invalid page' });
		}

		if (req.user?.role === 'admin') {
			if (hidden === 'true') {
				where.hidden = true;
			} else if (hidden === 'false') {
				where.hidden = false;
			}
		} else {
			where.hidden = false;
		}

		if (keyword) {
			where.OR = [
				{ name: { contains: keyword } },
				{ description: { contains: keyword } },
			];
		}

		let orderBy = [{ name: name === 'desc' ? 'desc' : 'asc' }];

		if (req.user?.role === 'admin') {
			if (num_qualified === 'asc' || num_qualified === 'desc') {
				orderBy.push({ qualifications: { _count: num_qualified } });
			}
		}

		const count = await prisma.positionType.count({ where });
		const positions = await prisma.positionType.findMany({
			where,
			orderBy,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				qualifications: true,
			},
		});

		const results = positions.map((pos) => {
			let entry = {};
			if (req.user?.role == 'admin') {
				entry = {
					id: pos.id,
					name: pos.name,
					description: pos.description,
					hidden: pos.hidden,
					num_qualified: pos.qualifications.length,
				};
			} else {
				entry = {
					id: pos.id,
					name: pos.name,
					description: pos.description,
				};
			}

			return entry;
		});

		return res.status(200).json({ count, results });
	},
);
// ---
router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

// ---
router.patch('/:positionTypeId', requireRole('admin'), async (req, res) => {
	const positionTypeId = parseInt(req.params?.positionTypeId);
	const { name, description, hidden } = req.body;

	if (isNaN(positionTypeId)) {
		return res.status(404).json({ error: 'Incorect position type' });
	}

	const data = {};

	const position = await prisma.positionType.findUnique({
		where: {
			id: positionTypeId,
		},
	});

	if (!position) {
		return res.status(404).json({ error: 'Position not found' });
	}

	if (name) {
		data.name = name;
	}

	if (description) {
		data.description = description;
	}

	if (typeof hidden === 'boolean') {
		data.hidden = hidden;
	}

	const updated = await prisma.positionType.update({
		where: { id: positionTypeId },
		data: data,
	});

	return res.status(200).json({ ...{ id: positionTypeId }, ...data });
});

//---
router.delete('/:positionTypeId', requireRole('admin'), async (req, res) => {
	const positionTypeId = parseInt(req.params.positionTypeId);

	if (isNaN(positionTypeId)) {
		return res.status(400).json({
			error: 'invalid position id',
		});
	}

	const position = await prisma.positionType.findUnique({
		where: { id: positionTypeId },
		include: { qualifications: true },
	});

	if (!position) {
		return res.status(404).json({
			error: '404 not found',
		});
	}

	if (position.qualifications.length != 0) {
		return res.status(409).json({
			error: '409:  position has a non-zero number of qualified regular users',
		});
	}

	await prisma.positionType.delete({
		where: { id: positionTypeId },
	});

	return res.status(204).json({});
});

router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

router.all('/:id', (req, res) => {
	res.status(405).json({ error: 'Method Not Allowed' });
});

module.exports = router;
