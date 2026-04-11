const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const system_timers = require('../config');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { config } = require('process');

const imageUploader = multer({
	storage: multer.memoryStorage(),
	fileFilter: (req, file, cb) => {
		if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
			return cb(null, false);
		}
		cb(null, true);
	},
});

function isValidPassword(password) {
	if (typeof password !== 'string') {
		return false;
	}
	if (!password) {
		return false;
	}

	if (password.length > 20 || password.length < 8) {
		return false;
	}

	if (
		password.toUpperCase() == password ||
		password.toLowerCase() == password
	) {
		return false;
	}

	// checks for numbers loll
	if (!/\d/.test(password)) {
		return false;
	}

	// checks for special character
	if (!/[^a-zA-Z0-9 ]/.test(password)) {
		return false;
	}
	return true;
}

function isValidEmail(email) {
	if (typeof email !== 'string') {
		return false;
	}

	// email format in Regex
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return false;
	}

	return true;
}

function isValidBirthday(birthday) {
	if (typeof birthday !== 'string') {
		return false;
	}

	const [year, month, day] = birthday.split('-');
	if (!year || !month || !day) {
		return false;
	}

	if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
		return false;
	}
	// maybe we need to check birthday > curr day?

	return true;
}

function isValidName(name) {
	return typeof name == 'string';
}

function isValidPhoneNumber(phonenumber) {
	if (typeof phonenumber !== 'string') {
		return false;
	}

	return true;
}

// ------------------------------
router.post('/', async (req, res) => {
	const now = new Date();

	const {
		business_name,
		owner_name,
		email,
		password,
		phone_number,
		postal_address,
		location,
	} = req.body;

	if (!business_name || !isValidName(business_name)) {
		return res.status(400).json({ error: 'Need valid name of business' });
	}
	if (!owner_name || !isValidName(owner_name)) {
		return res.status(400).json({ error: 'need valid name of owner' });
	}
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ error: 'Invalid email' });
	}
	if (!password || !isValidPassword(password)) {
		return res.status(400).json({ error: 'Invalid password' });
	}
	if (!phone_number || !isValidPhoneNumber(phone_number)) {
		return res.status(400).json({ error: 'invalid phone' });
	}
	if (!postal_address || typeof postal_address !== 'string') {
		return res.status(400).json({ error: 'Need valid Postal address' });
	}
	if (location) {
		location.lat = parseFloat(location.lat);
		location.lon = parseFloat(location.lon);

		if (
			isNaN(location.lon) ||
			isNaN(location.lat) ||
			location.lat < -90 ||
			location.lat > 90 ||
			location.lon < -180 ||
			location.lon > 180
		) {
			return res.status(400).json({
				error: 'lat or lon wrong',
			});
		}
	} else {
		return res.status(400).json({ error: 'location required' });
	}
	const resetToken = uuidv4();
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	const emailExists = await prisma.account.findFirst({
		where: { email: email },
	});

	if (emailExists) {
		return res
			.status(409)
			.json({ error: 'email aready exists in database' });
	}

	const newAccount = await prisma.account.create({
		data: {
			email,
			password: password,
			role: 'business',
			activated: false,
			phone_number,
			postal_address,
			resetToken,
			resetExpiryDate: expiresAt,
			resetUsed: false,
		},
	});

	const newBusinessAccount = await prisma.businessAccount.create({
		data: {
			id: newAccount.id,
			business_name: business_name,
			owner_name: owner_name,
			locationLat: location ? location.lat : null,
			locationLong: location ? location.lon : null,
			verified: false,
		},
	});

	return res.status(201).json({
		id: newAccount.id,
		business_name: newBusinessAccount.business_name,
		owner_name: newBusinessAccount.owner_name,
		email: newAccount.email,
		activated: newAccount.activated,
		verified: newBusinessAccount.verified,
		role: newAccount.role,
		phone_number: newAccount.phone_number,
		postal_address: newAccount.postal_address,
		location: {
			lon: newBusinessAccount.locationLong,
			lat: newBusinessAccount.locationLat,
		},
		createdAt: newAccount.createdAt,
		resetToken: newAccount.resetToken,
		expiresAt,
	});
});

// --------------------------------

router.get('/', async (req, res) => {
	let { keyword, activated, verified, sort, order, page, limit } = req.query;

	if (!order) {
		order = 'asc';
	}

	if (!page) {
		page = 1;
	}

	if (!limit) {
		limit = 10;
	}

	const userIsAdmin = req.user?.role === 'admin';

	if (!userIsAdmin && (activated || verified)) {
		return res.status(400).json({
			error: '400 Bad Request: User is not authenticated and specfied one or more of the admin-only fields',
		});
	}

	let allowed = [];
	if (!userIsAdmin) {
		allowed = ['business_name', 'email'];
	} else {
		allowed = ['business_name', 'email', 'owner_name'];
	}

	if (sort && !allowed.includes(sort)) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid sort',
		});
	}

	allowed = ['asc', 'desc'];
	if (order && !allowed.includes(order)) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid order',
		});
	}

	page = parseInt(page);
	if (isNaN(page) || page < 1) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid page',
		});
	}

	limit = parseInt(limit);
	if (isNaN(limit) || limit < 1) {
		return res.status(400).json({
			error: '400 Bad Request: Invalid limit',
		});
	}

	const where = {};
	if (verified) {
		where.verified = verified === 'true';
	}

	if (activated) {
		where.account = { activated: activated === 'true' };
	}
	if (keyword) {
		let filter = [
			{ business_name: { contains: keyword } },
			{ account: { email: { contains: keyword } } },
			{ account: { postal_address: { contains: keyword } } },
			{ account: { phone_number: { contains: keyword } } },
		];

		if (userIsAdmin) {
			filter = [
				{ business_name: { contains: keyword } },
				{ account: { email: { contains: keyword } } },
				{ account: { postal_address: { contains: keyword } } },
				{ account: { phone_number: { contains: keyword } } },
				{ owner_name: { contains: keyword } },
			];
		}

		where.OR = filter.filter(Boolean);
	}

	// only way we get here is if admin (bc if not and specified, then error)

	let orderBy = {};
	if (sort) {
		if (['business_name', 'owner_name'].includes(sort)) {
			orderBy = { [sort]: order };
		} else {
			// access account account
			orderBy = { account: { email: order } };
		}
	}

	const count = await prisma.businessAccount.count({ where });
	const data = await prisma.businessAccount.findMany({
		where,
		orderBy,
		skip: (page - 1) * limit,
		take: limit,
		include: { account: true },
	});

	const output = data.map((business) => {
		const entry = {
			id: business.id,
			business_name: business.business_name,
			email: business.account.email,
			role: business.account.role,
			phone_number: business.account.phone_number,
			postal_address: business.account.postal_address,
			location: {
				lat: business.locationLat,
				lon: business.locationLong,
			},
		};

		if (userIsAdmin) {
			entry.owner_name = business.owner_name;
			entry.verified = business.verified;
			entry.activated = business.account.activated;
		}
		return entry;
	});

	return res.status(200).json({ count, results: output });
});

// --------------------------
router.patch(
	'/:businessId/verified',
	requireRole('admin'),
	async (req, res) => {
		const { verified } = req.body;
		let businessId = parseInt(req.params.businessId);

		if (verified === undefined || typeof verified != 'boolean') {
			return res.status(400).json({ error: 'invalid verified' });
		}

		if (isNaN(businessId)) {
			return res.status(400).json({ error: 'invalid businessId' });
		}

		const busAcc = await prisma.businessAccount.findUnique({
			where: { id: businessId },
		});

		if (!busAcc) {
			return res.status(404).json({ error: ' business not found' });
		}

		const updatedBus = await prisma.businessAccount.update({
			where: { id: businessId },
			data: { verified: verified },
			include: { account: true },
		});

		return res.status(200).json({
			id: updatedBus.id,
			owner_name: updatedBus.owner_name,
			email: updatedBus.account.email,
			activated: updatedBus.account.activated,
			verified: updatedBus.verified,
			role: updatedBus.account.role,
			phone_number: updatedBus.account.phone_number ?? '',
			postal_address: updatedBus.account.postal_address ?? '',
		});
	},
);

// ---
router.get('/me', requireRole('business'), async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: 'no token' });
	}

	if (req.user.role !== 'business') {
		return res.status(403).json({ error: 'not business' });
	}

	const business = await prisma.businessAccount.findUnique({
		where: { id: req.user.id },
		include: { account: true },
	});

	if (!business) {
		return res.status(404).json({ error: 'Business not found' });
	}

	return res.status(200).json({
		id: business.id,
		business_name: business.business_name,
		owner_name: business.owner_name,
		email: business.account.email,
		role: business.account.role,
		phone_number: business.account.phone_number ?? '',
		postal_address: business.account.postal_address ?? '',
		location: {
			lon: business.locationLong,
			lat: business.locationLat,
		},
		avatar: business.account.avatar ?? '',
		biography: business.account.biography ?? '',
		activated: business.account.activated,
		verified: business.verified,
		createdAt: business.account.createdAt,
	});
});

// -----
router.patch('/me', requireRole('business'), async (req, res) => {
	const {
		business_name,
		owner_name,
		phone_number,
		postal_address,
		location,
		avatar,
		biography,
	} = req.body;
	let businessData = {};
	let accountData = {};

	if (business_name) {
		if (typeof business_name === 'string') {
			businessData.business_name = business_name;
		} else {
			return res.status(400).json({ error: 'Invalid business_name' });
		}
	}

	if (owner_name) {
		if (typeof owner_name === 'string') {
			businessData.owner_name = owner_name;
		} else {
			return res.status(400).json({ error: 'Invalid owner_name' });
		}
	}

	if (phone_number) {
		if (isValidPhoneNumber(phone_number)) {
			accountData.phone_number = phone_number;
		} else {
			return res.status(400).json({ error: 'Invalid phone number' });
		}
	}

	if (postal_address) {
		if (typeof postal_address === 'string') {
			accountData.postal_address = postal_address;
		} else {
			return res.status(400).json({ error: 'Invalid postal addr.' });
		}
	}

	if (location) {
		businessData.locationLong = parseFloat(location.lon);
		businessData.locationLat = parseFloat(location.lat);
		if (
			isNaN(businessData.locationLat) ||
			isNaN(businessData.locationLong) ||
			businessData.locationLat < -90 ||
			businessData.locationLat > 90 ||
			businessData.locationLong < -180 ||
			businessData.locationLong > 180
		) {
			return res.status(400).json({ error: 'Invalid location' });
		}
	}
	if (biography) {
		if (typeof biography === 'string') {
			accountData.biography = biography;
		} else {
			return res.status(400).json({ error: 'Invalid biography' });
		}
	}
	if (avatar) {
		if (typeof avatar === 'string') {
			accountData.avatar = avatar;
		} else {
			return res.status(400).json({ error: 'Invalid avatar' });
		}
	}
	let response = { ...businessData, ...accountData };
	response.id = req.user.id;

	businessData.account = { update: accountData };

	await prisma.businessAccount.update({
		where: { id: req.user.id },
		data: businessData,
	});

	return res.status(200).json(response);
});

// -------
router.put('/me/avatar', requireRole('business'), async (req, res) => {
	imageUploader.single('file')(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		if (!req.file) {
			return res.status(400).json({ error: 'Missing file' });
		}

		const avatarDir = `uploads/business/${req.user.id}`;
		const avatarPath = `${avatarDir}/avatar${path.extname(req.file.originalname)}`;

		fs.mkdirSync(avatarDir, { recursive: true });
		fs.writeFileSync(avatarPath, req.file.buffer);

		await prisma.account.update({
			where: { id: req.user.id },
			data: { avatar: `/${avatarPath}` },
		});

		return res.status(200).json({ avatar: `/${avatarPath}` });
	});
});

// --
router.post('/me/jobs', requireRole('business'), async (req, res) => {
	let {
		position_type_id,
		salary_min,
		salary_max,
		start_time,
		end_time,
		note,
	} = req.body;

	const business = await prisma.businessAccount.findUnique({
		where: { id: req.user.id },
	});

	if (!business || !business.verified) {
		return res.status(403).json({ error: 'business not verified' });
	}

	if (!position_type_id || !Number.isInteger(position_type_id)) {
		return res.status(400).json({ error: 'invalid position_type_id' });
	}

	const position = await prisma.positionType.findUnique({
		where: { id: position_type_id },
	});

	if (!position) {
		return res.status(400).json({ error: 'invalid position_type_id' });
	}

	if (salary_max === undefined || salary_max === null) {
		return res.status(400).json({ error: 'salary_max required' });
	}

	salary_max = parseFloat(salary_max);
	if (salary_max === undefined || salary_max === null) {
		return res.status(400).json({ error: 'salary_max ' });
	}

	if (salary_min === undefined || salary_min === null) {
		return res.status(400).json({ error: 'salary_min required' });
	}
	salary_min = parseFloat(salary_min);
	if (isNaN(salary_min) || salary_min < 0) {
		return res.status(400).json({ error: 'invalid salary_min' });
	}

	if (!start_time) {
		return res.status(400).json({ error: 'invalid start_time' });
	}

	if (!end_time) {
		return res.status(400).json({ error: 'invalid end_time' });
	}

	const startTimeDate = new Date(start_time);
	const endTimeDate = new Date(end_time);
	const now = new Date();
	const maxStart =
		now.getTime() + system_timers.jobStartWindow * 60 * 60 * 1000;

	if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
		return res.status(400).json({ error: 'wrong date' });
	}

	if (
		startTimeDate <= now ||
		endTimeDate <= now ||
		startTimeDate >= endTimeDate ||
		startTimeDate.getTime() > maxStart
	) {
		return res.status(400).json({ error: 'time issue' });
	}

	let status = 'open';
	const minStart = now.getTime() + system_timers.negotiationWindow * 1000;
	if (startTimeDate.getTime() < minStart) {
		status = 'expired';
	}

	const job = await prisma.job.create({
		data: {
			status,
			salary_min,
			salary_max,
			start_time: startTimeDate,
			end_time: endTimeDate,
			note: note ?? '',
			position_type_id,
			business_id: business.id,
		},
		include: {
			position_type: true,
			business: true,
			worker: true,
		},
	});

	return res.status(201).json({
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
		worker: job.worker
			? {
					id: job.worker.id,
					first_name: job.worker.first_name,
					last_name: job.worker.last_name,
				}
			: null,
		note: job.note,
		salary_min: job.salary_min,
		salary_max: job.salary_max,
		start_time: job.start_time,
		end_time: job.end_time,
		updatedAt: job.updatedAt,
	});
});

router.get('/me/jobs', requireRole('business'), async (req, res) => {
	let {
		position_type_id,
		salary_min,
		salary_max,
		start_time,
		end_time,
		status,
		page,
		limit,
	} = req.query;

	let filter = [];
	filter.push({
		business_id: req.user.id,
	});

	if (position_type_id) {
		position_type_id = parseInt(position_type_id);
		if (isNaN(position_type_id)) {
			return res.status(400).json({ error: 'invalid position_type_id' });
		}

		filter.push({
			position_type_id: position_type_id,
		});
	}

	if (salary_min) {
		salary_min = parseFloat(salary_min);
		if (isNaN(salary_min)) {
			return res.status(400).json({ error: 'invalid salary_min' });
		}

		filter.push({
			salary_min: {
				gte: salary_min,
			},
		});
	}

	if (salary_max) {
		salary_max = parseFloat(salary_max);
		if (isNaN(salary_max)) {
			return res.status(400).json({ error: 'invalid salary_max' });
		}

		filter.push({
			salary_max: {
				lte: salary_max,
			},
		});
	}

	if (start_time) {
		start_time = new Date(start_time);
		if (isNaN(start_time.getTime())) {
			return res.status(400).json({ error: 'invalid start_time' });
		}

		filter.push({
			start_time: {
				gte: start_time,
			},
		});
	}

	if (end_time) {
		end_time = new Date(end_time);
		if (isNaN(end_time.getTime())) {
			return res.status(400).json({ error: 'invalid start_time' });
		}

		filter.push({
			end_time: {
				lte: end_time,
			},
		});
	}

	if (status) {
		if (!Array.isArray(status)) {
			status = [status];
		}
		const statusses = [
			'open',
			'expired',
			'filled',
			'canceled',
			'completed',
		];

		const isValidStatus = status.every((s) => statusses.includes(s));
		if (!isValidStatus) {
			return res.status(400).json({ error: 'invalid status' });
		}
	} else {
		status = ['open', 'filled'];
	}

	filter.push({
		status: {
			in: status,
		},
	});

	if (page) {
		page = parseInt(page);
		if (isNaN(page) || page < 0) {
			return res.status(400).json({ error: 'invalid page' });
		}
	} else {
		page = 1;
	}

	if (limit) {
		limit = parseInt(limit);
		if (isNaN(limit) || limit < 1) {
			return res.status(400).json({ error: 'invalid limit' });
		}
	} else {
		limit = 10;
	}

	const count = await prisma.job.count({ where: { AND: filter } });
	const jobs = await prisma.job.findMany({
		where: { AND: filter },
		take: limit,
		skip: (page - 1) * limit,
		include: { position_type: true },
	});

	const results = jobs.map((job) => ({
		id: job.id,
		status: job.status,
		position_type: {
			id: job.position_type.id,
			name: job.position_type.name,
		},
		worker: job.worker
			? {
					id: job.worker.id,
					first_name: job.worker.first_name,
				}
			: null,
		note: job.note ?? null,
		salary_min: job.salary_min,
		salary_max: job.salary_max,
		start_time: job.start_time,
		end_time: job.end_time,
		updatedAt: job.updatedAt,
	}));

	return res.status(200).json({ count, results });
});

router.patch('/me/jobs/:jobId', requireRole('business'), async (req, res) => {
	let { salary_min, salary_max, start_time, end_time, note } = req.body;

	let jobID = parseInt(req.params.jobId);

	const now = new Date();
	let data = { updatedAt: now };
	if (isNaN(jobID)) {
		return res.status(400).json({ error: 'invalid jobId' });
	}

	if (salary_min) {
		salary_min = parseFloat(salary_min);
		if (isNaN(salary_min) || salary_min < 0) {
			return res.status(400).json({ error: 'invalid salary_min' });
		}
		data.salary_min = salary_min;
	}

	const todayStr = new Date().toISOString().split('T')[0];

	if (start_time) {
		const startDate = new Date(start_time);
		if (isNaN(startDate.getTime()) || startDate < now) {
			return res.status(400).json({ error: 'start time in past' });
		}
		start_time = startDate;
		data.start_time = start_time;
	}

	if (end_time || end_time < todayStr) {
		const endDate = new Date(end_time);
		if (isNaN(endDate.getTime()) || endDate < now) {
			return res.status(400).json({ error: 'end_time in the past' });
		}
		end_time = endDate;
		data.end_time = end_time;
	}

	if (note) {
		data.note = note;
	}

	const job = await prisma.job.findUnique({
		where: { id: jobID },
	});

	if (!job) {
		return res.status(404).json({ error: 'Job not found' });
	}

	if (salary_max) {
		salary_max = parseFloat(salary_max);
		if (
			isNaN(salary_max) ||
			salary_max < salary_min ||
			salary_max < job.salary_min
		) {
			return res.status(400).json({ error: 'invalid salary_max' });
		}
		data.salary_max = salary_max;
	}

	if (job.status !== 'open' || job.start_time < todayStr) {
		return res.status(409).json({
			error: '409 Conflict:  job is no longer in the open state, or if the current time is past the start time (i.e., in the expired state)',
		});
	}

	if (salary_max) {
		salary_max = parseFloat(salary_max);
		if (
			isNaN(salary_max) ||
			salary_max < salary_min ||
			salary_max < job.salary_min
		) {
			return res.status(400).json({ error: 'invalid salary_max' });
		}
		data.salary_max = salary_max;
	}

	if (req.user.id !== job.business_id) {
		return res.status(403).json({ error: 'unoauthorized to see' });
	}

	if (job.negotiation) {
		await prisma.negotiation.delete({ where: { id: job.negotiation.id } });
	}

	await prisma.job.update({
		where: { id: jobID },
		data: data,
	});

	// merges two dict into one dict
	let stuff = { ...{ id: jobID }, ...data };

	return res.status(200).json(stuff);
});

router.delete('/me/jobs/:jobId', requireRole('business'), async (req, res) => {
	const jobId = parseInt(req.params.jobId);

	if (isNaN(jobId)) {
		return res.status(400).json({ error: 'invalid jobID' });
	}

	const job = await prisma.job.findUnique({
		where: { id: jobId },
		include: { negotiation: true },
	});

	if (!job) {
		return res.status(404).json({ error: 'Job not found' });
	}

	if (job.status !== 'open') {
		return res.status(409).json({ error: 'job isnt open' });
	}

	if (req.user.id !== job.business_id) {
		return res.status(403).json({ error: 'unoauthorized to see' });
	}

	if (!['open', 'expired'].includes(job.status) || job.negotiation) {
		return res.status(409).json({
			error: '409 Conflict if the position is not in the "open" or "expired" state, or if there is an active negotiation',
		});
	}

	await prisma.interest.deleteMany({
		where: { jobId: jobId },
	});

	await prisma.negotiation.deleteMany({
		where: { jobId: jobId },
	});

	await prisma.job.delete({
		where: { id: jobId },
	});

	return res.status(204).json({});
});

router.get('/:businessId', async (req, res) => {
	let businessId = parseInt(req.params.businessId);

	if (isNaN(businessId)) {
		return res.status(404).json({ error: 'invalid businessId' });
	}

	const business = await prisma.businessAccount.findUnique({
		where: { id: businessId },
		include: {
			account: true,
		},
	});

	if (!business) {
		return res.status(404).json({ error: 'not found' });
	}

	const is_admin = req.user && req.user.role === 'admin';

	return res.status(200).json({
		id: business.id,
		business_name: business.business_name,
		email: business.account.email,
		role: business.account.role,
		phone_number: business.account.phone_number ?? '',
		postal_address: business.account.postal_address ?? '',
		location: {
			lon: business.locationLong,
			lat: business.locationLat,
		},
		avatar: business.account.avatar ?? null,
		biography: business.account.biography ?? null,

		...(is_admin && {
			owner_name: business.owner_name,
			activated: business.account.activated,
			verified: business.verified,
			createdAt: business.account.createdAt,
		}),
	});
});

router.all('/', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});
module.exports = router;
