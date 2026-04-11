'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { authenticate } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/users');
const businessesRouter = require('./routes/businesses');
const positionTypesRouter = require('./routes/position-types');
const jobsRouter = require('./routes/jobs');
const negotiationsRouter = require('./routes/negotiations');
const qualificationsRouter = require('./routes/qualifications');

const systemRouter = require('./routes/system');

function create_app() {
	const app = express();

	app.use(cors());
	app.use(express.json());
	app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

	app.use('/auth', authRouter);

	app.use(authenticate);
	app.use('/users', userRouter);
	app.use('/businesses', businessesRouter);
	app.use('/jobs', jobsRouter);
	app.use('/position-types', positionTypesRouter);
	app.use('/qualifications', qualificationsRouter);
	app.use('/negotiations', negotiationsRouter);
	app.use('/system', systemRouter);

	app.use((req, res) => {
		res.status(404).json({ error: 'Not found' });
	});

	return app;
}

module.exports = { create_app };
