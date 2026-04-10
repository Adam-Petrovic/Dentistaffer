'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');
const prisma = require('../prisma');
const system_timers = require('../config');

router.patch('/reset-cooldown', requireRole('admin'), (req, res) => {
	const reset_cooldown = parseInt(req.body.reset_cooldown);

	if (isNaN(reset_cooldown) || reset_cooldown < 0) {
		return res.status(400).json({ error: 'Invalid cooldown value' });
	}

	system_timers.resetCooldown = reset_cooldown;

	return res.status(200).json({
		reset_cooldown,
	});
});

router.patch('/negotiation-window', requireRole('admin'), (req, res) => {
	const negotiation_window = parseInt(req.body.negotiation_window);

	if (isNaN(negotiation_window) || negotiation_window <= 0) {
		return res.status(400).json({ error: 'Invalid negotiation value' });
	}

	system_timers.negotiationWindow = negotiation_window;
	return res.status(200).json({
		negotiation_window,
	});
});

router.patch('/job-start-window', requireRole('admin'), (req, res) => {
	const job_start_window = parseInt(req.body.job_start_window);

	if (isNaN(job_start_window) || job_start_window <= 0) {
		return res.status(400).json({ error: 'Invalid negotiation value' });
	}

	system_timers.jobStartWindow = job_start_window;
	return res.status(200).json({
		job_start_window,
	});
});

router.patch('/availability-timeout', requireRole('admin'), (req, res) => {
	const availability_timeout = parseInt(req.body.availability_timeout);

	if (isNaN(availability_timeout) || availability_timeout <= 0) {
		return res.status(400).json({ error: 'Invalid negotiation value' });
	}

	system_timers.availabilityTimeout = availability_timeout;
	return res.status(200).json({
		availability_timeout
	});
});

router.all('/tokens', (req, res) => {
	res.status(405).json({ error: 'Not allowed' });
});

module.exports = router;
