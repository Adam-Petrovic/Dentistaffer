'use strict';

const JWT_SECRET = 'BigManFrankie357'; // move this to an env variable ideally
const system_timers = require('../config');
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

//-------------------------------------------------------
const timeOfLastResetFor = {};

router.post('/resets', async (req, res) => {
	const curr = new Date();

	const ip = req.ip;
	const email = req.body.email;
	if (email == 'undefined' || !isValidEmail(email)) {
		return res.status(400).json({ error: 'Invlaid email' });
	}

	if (
		timeOfLastResetFor[ip] &&
		(curr.getTime() - timeOfLastResetFor[ip]) / 1000 <
			system_timers.resetCooldown
	) {
		return res.status(429).json({ error: 'Too many requests' });
	}

	const account = await prisma.account.findUnique({
		where: { email: email },
	});

	if (!account) {
		return res
			.status(404)
			.json({ error: ' Not Found: the email address does not exist' });
	}

	const newToken = uuidv4();
	const expiresAt = new Date(curr.getTime() + 7 * 24 * 60 * 60 * 1000);

	await prisma.account.update({
		data: {
			resetToken: newToken,
			resetExpiryDate: expiresAt,
			resetUsed: false,
		},
		where: { email: email },
	});

	timeOfLastResetFor[ip] = curr.getTime();

	return res.status(202).json({
		expiresAt: expiresAt,
		resetToken: newToken,
	});
});

//---------------------------------------------------------------
router.post('/resets/:resetToken', async (req, res) => {
	try {
		const { email, password } = req.body;
		const resetToken = req.params.resetToken;
		const curr = new Date();

		if (!email) {
			return res.status(400).json({
				error: 'Gone: the reset token expired.',
			});
		}

		if (!isValidEmail(email)) {
			return res.status(401).json({
				error: 'no mathc ofr emiai',
			});
		}

		const account = await prisma.account.findUnique({
			where: { resetToken },
		});

		if (!account || account.resetUsed) {
			return res.status(401).json({
				error: ' Not Found: reset token does not exist or has already been used.',
			});
		}

		if (
			account.resetExpiryDate &&
			curr.getTime() > account.resetExpiryDate.getTime()
		) {
			return res.status(410).json({
				error: 'Gone: the reset token expired.',
			});
		}

		if (account.email !== email) {
			return res.status(401).json({
				error: 'Unauthorized: the email address provided does not match the reset token',
			});
		}

		if (password && !isValidPassword(password)) {
			return res.status(400).json({ error: 'Invalid password' });
		}

		const data = { resetUsed: true, activated: true };

		if (password !== undefined && password !== '' && password != null) {
			data.password = password;
		}

		await prisma.account.update({ where: { resetToken }, data });

		return res.status(200).json({
			activated: true,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});
// -----------------------------------------------
router.post('/tokens', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !isValidEmail(email) || !password) {
		return res.status(400).json({ error: 'invalid entrys' });
	}

	const account = await prisma.account.findUnique({
		where: {
			email: email,
		},
	});

	if (!account || account.password !== password) {
		return res.status(401).json({
			error: 'Invalid password',
		});
	}

	if (!account.activated) {
		return res
			.status(403)
			.json({ error: ' Forbidden: the account is not activated.' });
	}
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const token = jwt.sign({ id: account.id, role: account.role }, JWT_SECRET, {
		expiresIn: '7d',
	});

	return res.status(200).json({
		token,
		expiresAt,
	});
});

router.all('/tokens', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

module.exports = router;
