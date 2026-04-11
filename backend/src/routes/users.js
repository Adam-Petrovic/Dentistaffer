'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
const system_timers = require('../config');

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

	return (
		/^\d{3}-\d{3}-\d{4}$/.test(phonenumber) || /^\d{10}$/.test(phonenumber)
	);
}

router.post('/', async (req, res) => {
	const {
		first_name,
		last_name,
		email,
		password,
		phone_number,
		postal_address,
		birthday,
	} = req.body;

	const currTime = new Date();

	if (!first_name || !isValidName(first_name)) {
		return res
			.status(400)
			.json({ error: 'first_name required or must be string' });
	}

	if (!last_name || !isValidName(last_name)) {
		return res
			.status(400)
			.json({ error: 'last_name required or must be string' });
	}
	if (!email || !isValidEmail(email)) {
		return res.status(400).json({ error: 'Invalid email' });
	}

	if (!password || !isValidPassword(password)) {
		return res.status(400).json({ error: 'Invalid password' });
	}

	if (phone_number && !isValidPhoneNumber(phone_number)) {
		return res.status(400).json({ error: 'Invalid phone number' });
	}

	if (birthday !== undefined && !isValidBirthday(birthday)) {
		return res
			.status(400)
			.json({ error: 'Invalid birthday. YYYY-MM-DD format' });
	}

	const resetToken = uuidv4();
	const expiresAt = new Date(currTime.getTime() + 7 * 24 * 60 * 60 * 1000);
	let result;
	try {
		result = await prisma.$transaction(async (tprisma) => {
			const newAccount = await tprisma.account.create({
				data: {
					email,
					password: password,
					role: 'regular',
					activated: false,
					phone_number: phone_number ?? '',
					postal_address: postal_address ?? '',
					resetToken,
					resetExpiryDate: expiresAt,
				},
			});

			const newRegAcc = await tprisma.regularAccount.create({
				data: {
					id: newAccount.id,
					first_name: first_name,
					last_name: last_name,
					birthday: birthday ?? '1970-01-01',
				},
			});

			return {
				id: newAccount.id,
				first_name: newRegAcc.first_name,
				last_name: newRegAcc.last_name,
				email: newAccount.email,
				activated: newAccount.activated,
				role: newAccount.role,
				phone_number: newAccount.phone_number,
				postal_address: newAccount.postal_address,
				birthday: newRegAcc.birthday,
				createdAt: newAccount.createdAt,
				resetToken: newAccount.resetToken,
				expiresAt,
			};
		});
	} catch (err) {
		if (err.code == 'P2002') {
			return res
				.status(409)
				.json({ error: 'Email already exists in system' });
		} else {
			return res.status(500).json({ error: 'Server error' });
		}
	}
	return res.status(201).json(result);
});

// ---------------------------------------------
router.get('/', requireRole('admin'), async (req, res) => {
	let { keyword, activated, suspended, page, limit } = req.query;

	if (!page) {
		page = 1;
	} else {
		page = parseInt(page);
	}

	if (!limit) {
		limit = 10;
	} else {
		limit = parseInt(limit);
	}

	if (isNaN(page) || page < 1) {
		return res.status(400).json({ error: 'Invalid page' });
	}
	if (isNaN(limit) || limit < 1) {
		return res.status(400).json({ error: 'Invalid limit' });
	}

	let where = { account: {} };
	let filter = [];
	if (keyword) {
		filter = [
			{ first_name: { contains: keyword } },
			{ last_name: { contains: keyword } },
			{ account: { email: { contains: keyword } } },
			{ account: { postal_address: { contains: keyword } } },
			{ account: { phone_number: { contains: keyword } } },
		];
		where.OR = filter;
	}

	if (activated) {
		where.account = {
			...where.account,
			activated: activated === 'true',
		};
	}

	if (suspended) {
		where.suspended = suspended === 'true';
	}
	const count = await prisma.regularAccount.count({ where });
	const data = await prisma.regularAccount.findMany({
		where,
		skip: (page - 1) * limit,
		take: limit,
		include: { account: true },
	});

	const results = data.map((reg) => ({
		id: reg.id,
		first_name: reg.first_name,
		last_name: reg.last_name,
		email: reg.account.email,
		activated: reg.account.activated,
		suspended: reg.suspended,
		role: reg.account.role,
		phone_number: reg.account.phone_number,
		postal_address: reg.account.postal_address,
	}));

	return res.status(200).json({ count, results });
});

router.patch('/:userId/suspended', requireRole('admin'), async (req, res) => {
	const { suspended } = req.body;
	let userId = parseInt(req.params.userId);

	if (suspended === undefined || typeof suspended != 'boolean') {
		return res.status(400).json({ error: 'invalid suspended' });
	}

	if (isNaN(userId)) {
		return res.status(400).json({ error: 'invalid userID' });
	}

	const regAcc = await prisma.regularAccount.findUnique({
		where: { id: userId },
	});

	if (!regAcc) {
		return res.status(404).json({ error: ' user not found' });
	}

	const updatedUser = await prisma.regularAccount.update({
		where: { id: userId },
		data: {
			suspended: suspended,
		},
		include: { account: true },
	});

	return res.status(200).json({
		id: updatedUser.id,
		first_name: updatedUser.first_name,
		last_name: updatedUser.last_name,
		email: updatedUser.account.email,
		activated: updatedUser.account.activated,
		suspended: updatedUser.suspended,
		role: updatedUser.account.role,
		phone_number: updatedUser.account.phone_number ?? '',
		postal_address: updatedUser.account.postal_address ?? '',
	});
});

// ----------
router.get('/me', requireRole('regular'), async (req, res) => {
	const regAcc = await prisma.regularAccount.findUnique({
		where: { id: req.user.id },
		include: {
			account: true,
		},
	});

	if (!regAcc) {
		return res.status(404).json({ error: 'User not found' });
	}

	let avalable = regAcc.available;
	if (avalable && !regAcc.lastActive) {
		avalable = false;
	} else if (avalable && regAcc.lastActive) {
		const time = new Date();
		const timeInactive = time.getTime() - regAcc.lastActive.getTime();
		if (timeInactive > system_timers.availabilityTimeout) {
			avalable = false;
		}
	}

	return res.status(200).json({
		id: regAcc.id,
		first_name: regAcc.first_name,
		last_name: regAcc.last_name,
		email: regAcc.account.email,
		activated: regAcc.account.activated,
		suspended: regAcc.suspended,
		available: avalable,
		role: regAcc.account.role,
		phone_number: regAcc.account.phone_number ?? '',
		postal_address: regAcc.account.postal_address ?? '',
		birthday: regAcc.birthday,
		createdAt: regAcc.account.createdAt,
		avatar: regAcc.account.avatar ?? null,
		resume: regAcc.resume ?? null,
		biography: regAcc.account.biography ?? null,
	});
});

// ----------
router.patch('/me', requireRole('regular'), async (req, res) => {
	const {
		first_name,
		last_name,
		phone_number,
		postal_address,
		birthday,
		avatar,
		biography,
	} = req.body;

	let data = {};
	let accountData = {};

	if (first_name) {
		if (typeof first_name === 'string') {
			data.first_name = first_name;
		} else {
			return res.status(400).json({ error: 'Invalid f_name' });
		}
	}

	if (last_name) {
		if (typeof last_name === 'string') {
			data.last_name = last_name;
		} else {
			return res.status(400).json({ error: 'Invalid l_name' });
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

	if (birthday) {
		if (isValidBirthday(birthday)) {
			data.birthday = birthday;
		} else {
			return res.status(400).json({ error: 'Invalid birdthday.' });
		}
	}

	if (avatar) {
		if (typeof avatar === 'string') {
			accountData.avatar = avatar;
		} else {
			return res.status(400).json({ error: 'Invalid avatar.' });
		}
	}

	if (biography) {
		if (typeof biography === 'string') {
			accountData.biography = biography;
		} else {
			return res.status(400).json({ error: 'Invalid biography.' });
		}
	}

	let result = { ...data, ...accountData };
	result.id = req.user.id;

	if (accountData) {
		data.account = { update: accountData };
	}

	await prisma.regularAccount.update({
		where: { id: req.user.id },
		data: data,
	});

	return res.status(200).json(result);
});

// -----

router.get('/me/qualifications', requireRole('regular'), async (req, res) => {
	const quals = await prisma.qualification.findMany({
		where: { user_id: req.user.id },
		include: { position_type: true },
	});

	const count = await prisma.qualification.count({
		where: { user_id: req.user.id },
	});
	const results = quals.map((qual) => ({
		id: qual.id,
		status: qual.status,
		note: qual.note,
		position_type: {
			id: qual.position_type.id,
			name: qual.position_type.name,
			description: qual.position_type.description,
		},
		updatedAt: qual.updatedAt,
	}));

	return res.status(200).json({ count, results });
});

router.patch('/me/available', requireRole('regular'), async (req, res) => {
	const { available } = req.body;

	if (typeof available !== 'boolean') {
		return res.status(400).json({ error: 'Invalid avaliable.' });
	}

	const user = await prisma.regularAccount.findUnique({
		where: { id: req.user.id },
	});

	if (!user) {
		return res.status(404).json({ error: 'HOW DID WE GET HERE.' });
	}

	if (user.suspended && available == true) {
		return res.status(400).json({ error: 'Bad Request user suspedned' });
	}

	if (available === true) {
		const qualExists = await prisma.qualification.findFirst({
			where: {
				user_id: req.user.id,
				status: 'approved',
			},
		});

		if (!qualExists) {
			return res.status(400).json({ error: 'No qualifications' });
		}
	}

	await prisma.regularAccount.update({
		where: { id: req.user.id },
		data: {
			available: available,
		},
	});

	return res.status(200).json({ available: available });
});

// ------------
router.put('/me/avatar', requireRole('regular'), async (req, res) => {
	imageUploader.single('file')(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		if (!req.file) {
			return res.status(400).json({ error: 'Missing file' });
		}

		const avatarDir = `uploads/users/${req.user.id}`;
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
// ----

router.put('/me/resume', requireRole('regular'), async (req, res) => {
	docUploader.single('file')(req, res, async (err) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}

		if (!req.file) {
			return res.status(400).json({ error: 'Missing file' });
		}

		const resumeDir = `/uploads/users/${req.user.id}`;

		fs.mkdirSync(`.${resumeDir}`, { recursive: true });
		fs.writeFileSync(`.${resumeDir}/resume.pdf`, req.file.buffer);

		await prisma.regularAccount.update({
			where: { id: req.user.id },
			data: {
				resume: `${resumeDir}/resume.pdf`,
			},
		});

		return res.status(200).json({ resume: `${resumeDir}/resume.pdf` });
	});
});

// --------
router.get('/me/invitations', requireRole('regular'), async (req, res) => {
	let { page, limit } = req.query;

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

	const count = await prisma.interest.count({
		where: {
			candidateId: req.user.id,
			businessInterested: true,
			job: { status: 'open' },
		},
		skip: (page - 1) * limit,
		take: limit,
	});
	const interests = await prisma.interest.findMany({
		where: {
			candidateId: req.user.id,
			businessInterested: true,
			job: { status: 'open' },
		},
		skip: (page - 1) * limit,
		take: limit,
		include: {
			job: {
				include: {
					position_type: true,
					business: true,
				},
			},
		},
	});

	const results = interests.map((interest) => ({
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
		updatedAt: interest.job.updatedAt,
	}));

	return res.status(200).json({ count, results });
});
// ---
router.get('/me/interests', requireRole('regular'), async (req, res) => {
	let { page, limit } = req.query;

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

	const count = await prisma.interest.count({
		where: {
			candidateId: req.user.id,
			candidateInterested: true,
			job: { status: 'open' },
		},
	});

	const interests = await prisma.interest.findMany({
		where: {
			candidateId: req.user.id,
			candidateInterested: true,
			job: { status: 'open' },
		},
		skip: (page - 1) * limit,
		take: limit,
		include: {
			job: {
				include: {
					position_type: true,
					business: true,
				},
			},
		},
	});

	const results = interests.map((interest) => ({
		interest_id: interest.id,
		mutual: interest.candidateInterested && interest.businessInterested,
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
			updatedAt: interest.job.updatedAt,
		},
	}));
	return res.status(200).json({ count, results });
});

router.all('/me', (req, res) => {
	return res.status(405).json({ error: 'Method Not Allowed' });
});
router.all('/me/interests', (req, res) => {
	return res.status(405).json({ error: 'Method Not Allowed' });
});
module.exports = router;
