'use strict';

const { PrismaClient } = require('@prisma/client');
// const bcrypt = require('bcrypt');	
const prisma = new PrismaClient();

async function main() {
	const hashedPassword = '123123';
	const domain = 'csc309.utoronto.ca';

	console.log('Cleaning database...');
	await prisma.negotiation.deleteMany();
	await prisma.interest.deleteMany();
	await prisma.job.deleteMany();
	await prisma.qualification.deleteMany();
	await prisma.regularAccount.deleteMany();
	await prisma.businessAccount.deleteMany();
	await prisma.adminAccount.deleteMany();
	await prisma.account.deleteMany();
	await prisma.positionType.deleteMany();
	console.log('Database cleaned.');

	// 1. Position Types (10, all visible)
	const positionNames = [
		{
			name: 'Dental Assistant (Level 1)',
			description: 'Entry-level dental assistant.',
		},
		{
			name: 'Dental Assistant (Level 2)',
			description: 'Advanced dental assistant.',
		},
		{
			name: 'Dental Hygienist',
			description: 'Performs teeth cleanings and exams.',
		},
		{
			name: 'Orthodontist',
			description: 'Treats irregularities in teeth and jaws.',
		},
		{
			name: 'Oral Surgeon',
			description: 'Performs surgical procedures on mouth and jaw.',
		},
		{
			name: 'Periodontist',
			description: 'Specializes in gum disease treatment.',
		},
		{
			name: 'Endodontist',
			description: 'Specializes in root canal treatment.',
		},
		{
			name: 'Prosthodontist',
			description: 'Specializes in dental prosthetics.',
		},
		{ name: 'Pediatric Dentist', description: 'Dental care for children.' },
		{
			name: 'Dental Receptionist',
			description: 'Front desk and scheduling.',
		},
	];

	const positionTypes = [];
	for (const p of positionNames) {
		const pt = await prisma.positionType.create({
			data: { name: p.name, description: p.description, hidden: false },
		});
		positionTypes.push(pt);
	}
	console.log('Position types seeded.');

	// 2. Admin
	await prisma.account.create({
		data: {
			email: `admin1@${domain}`,
			password: hashedPassword,
			role: 'admin',
			activated: true,
			adminAccount: { create: {} },
		},
	});
	console.log('Admin seeded.');

	// 3. Businesses (12, all verified for simplicity, activated)
	const businesses = [];
	const businessLocations = [
		{ lat: 43.6598, lon: -79.3998 },
		{ lat: 43.6629, lon: -79.3957 },
		{ lat: 43.6544, lon: -79.4022 },
		{ lat: 43.6701, lon: -79.3881 },
		{ lat: 43.6487, lon: -79.4102 },
		{ lat: 43.6732, lon: -79.4215 },
		{ lat: 43.6812, lon: -79.4033 },
		{ lat: 43.6423, lon: -79.3876 },
		{ lat: 43.6554, lon: -79.4187 },
		{ lat: 43.6678, lon: -79.3765 },
		{ lat: 43.659, lon: -79.391 },
		{ lat: 43.6715, lon: -79.412 },
	];

	for (let i = 1; i <= 12; i++) {
		const loc = businessLocations[i - 1];
		const acc = await prisma.account.create({
			data: {
				email: `business${i}@${domain}`,
				password: hashedPassword,
				role: 'business',
				activated: true,
				phone_number: `416-555-${1000 + i}`,
				postal_address: `${i * 10} Dental Ave, Toronto, ON`,
				buissnessAccount: {
					create: {
						business_name: `Dental Clinic ${i}`,
						owner_name: `Owner ${i}`,
						locationLat: loc.lat,
						locationLong: loc.lon,
						verified: true,
					},
				},
			},
			include: { buissnessAccount: true },
		});
		businesses.push(acc.buissnessAccount);
	}
	console.log('Businesses seeded.');

	// 4. Regular Users (25)
	const now = new Date();
	const regularUsers = [];
	for (let i = 1; i <= 25; i++) {
		const acc = await prisma.account.create({
			data: {
				email: `regular${i}@${domain}`,
				password: hashedPassword,
				role: 'regular',
				activated: true,
				phone_number: `647-555-${2000 + i}`,
				postal_address: `${i * 5} User St, Toronto, ON`,
				regularAccount: {
					create: {
						first_name: `User${i}`,
						last_name: `Tester`,
						birthday: '1995-05-15',
						available: true,
						suspended: false,
						lastActive: now,
					},
				},
			},
			include: { regularAccount: true },
		});
		regularUsers.push(acc.regularAccount);
	}
	console.log('Regular users seeded.');

	// 5. Qualifications
	// Give each user an approved qualification for a specific position type
	// Users 1-10: approved for positionTypes[0] (Dental Assistant L1)
	// Users 11-20: approved for positionTypes[2] (Dental Hygienist)
	// Users 21-25: approved for positionTypes[3] (Orthodontist)
	// Also add some submitted/rejected for admin attention
	const userQualMap = {}; // userId -> position_type_id they are approved for

	for (let i = 0; i < regularUsers.length; i++) {
		const user = regularUsers[i];
		let posIndex, status;

		if (i < 10) {
			posIndex = 0; // Dental Assistant L1
			status = 'approved';
		} else if (i < 20) {
			posIndex = 2; // Dental Hygienist
			status = 'approved';
		} else {
			posIndex = 3; // Orthodontist
			status = 'approved';
		}

		await prisma.qualification.create({
			data: {
				user_id: user.id,
				position_type_id: positionTypes[posIndex].id,
				status,
				note: `Qualification for ${positionTypes[posIndex].name}`,
			},
		});
		userQualMap[user.id] = positionTypes[posIndex].id;

		// Add some extra submitted/revised qualifications for admin dashboard
		if (i < 8) {
			await prisma.qualification.create({
				data: {
					user_id: user.id,
					position_type_id: positionTypes[1].id, // Dental Assistant L2
					status: i < 4 ? 'submitted' : 'revised',
					note: 'Pending admin review.',
				},
			});
		}
	}
	console.log('Qualifications seeded.');

	// 6. Jobs (35 jobs across different states)
	const jobs = [];
	const oneHour = 60 * 60 * 1000;
	const oneDay = 24 * oneHour;

	// Helper to get business and matching position type
	// DA L1 jobs: businesses 0-3, Dental Hygienist jobs: businesses 4-7, Orthodontist: businesses 8-11
	const jobConfigs = [
		// Open DA L1 jobs (for users 1-10)
		...Array.from({ length: 12 }, (_, i) => ({
			business: businesses[i % 4],
			positionType: positionTypes[0],
			startOffset: (i + 1) * oneDay + 2 * oneHour,
			status: 'open',
		})),
		// Open Dental Hygienist jobs (for users 11-20)
		...Array.from({ length: 10 }, (_, i) => ({
			business: businesses[4 + (i % 4)],
			positionType: positionTypes[2],
			startOffset: (i + 2) * oneDay + 2 * oneHour,
			status: 'open',
		})),
		// Open Orthodontist jobs (for users 21-25)
		...Array.from({ length: 5 }, (_, i) => ({
			business: businesses[8 + (i % 4)],
			positionType: positionTypes[3],
			startOffset: (i + 3) * oneDay + 2 * oneHour,
			status: 'open',
		})),
		// Expired jobs
		...Array.from({ length: 4 }, (_, i) => ({
			business: businesses[i % 4],
			positionType: positionTypes[0],
			startOffset: 30 * 60 * 1000, // 30 mins from now - within negotiation window
			status: 'expired',
		})),
		// Canceled jobs
		...Array.from({ length: 2 }, (_, i) => ({
			business: businesses[i % 4],
			positionType: positionTypes[0],
			startOffset: oneDay,
			status: 'canceled',
		})),
		// Completed jobs
		...Array.from({ length: 2 }, (_, i) => ({
			business: businesses[i % 4],
			positionType: positionTypes[0],
			startOffset: -2 * oneDay, // in the past
			status: 'completed',
		})),
	];

	for (const config of jobConfigs) {
		const start = new Date(now.getTime() + config.startOffset);
		const end = new Date(start.getTime() + 8 * oneHour);
		const job = await prisma.job.create({
			data: {
				business_id: config.business.id,
				position_type_id: config.positionType.id,
				salary_min: 28,
				salary_max: 45,
				start_time: start,
				end_time: end,
				status: config.status,
				note: `${config.positionType.name} position available.`,
			},
		});
		jobs.push(job);
	}
	console.log('Jobs seeded.');

	// 7. Interests, Invitations, Negotiations, Filled Jobs
	// Filled jobs: pair first 3 DA L1 jobs with first 3 users
	for (let i = 0; i < 3; i++) {
		const job = jobs[i];
		const user = regularUsers[i];

		const interest = await prisma.interest.create({
			data: {
				jobId: job.id,
				candidateId: user.id,
				candidateInterested: true,
				businessInterested: true,
			},
		});

		await prisma.negotiation.create({
			data: {
				interestId: interest.id,
				jobId: job.id,
				candidateId: user.id,
				business_id: job.business_id,
				expiresAt: new Date(now.getTime() + oneDay),
				status: 'success',
				candidateDecision: 'accept',
				businessDecision: 'accept',
			},
		});

		await prisma.job.update({
			where: { id: job.id },
			data: { worker_id: user.id, status: 'filled' },
		});
	}

	// Active negotiation: job[3] with user[3]
	const activeNegJob = jobs[3];
	const activeNegUser = regularUsers[3];
	const activeInterest = await prisma.interest.create({
		data: {
			jobId: activeNegJob.id,
			candidateId: activeNegUser.id,
			candidateInterested: true,
			businessInterested: true,
		},
	});
	await prisma.negotiation.create({
		data: {
			interestId: activeInterest.id,
			jobId: activeNegJob.id,
			candidateId: activeNegUser.id,
			business_id: activeNegJob.business_id,
			expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 min window
			status: 'active',
		},
	});

	// Mutual interests (no negotiation yet): jobs 4-8 with users 4-8
	for (let i = 4; i < 9; i++) {
		await prisma.interest.create({
			data: {
				jobId: jobs[i].id,
				candidateId: regularUsers[i].id,
				candidateInterested: true,
				businessInterested: true,
			},
		});
	}

	// One-sided interests (candidate only): jobs 9-12 with users 9-12
	for (let i = 9; i < 13; i++) {
		await prisma.interest.create({
			data: {
				jobId: jobs[i].id,
				candidateId: regularUsers[i].id,
				candidateInterested: true,
				businessInterested: null,
			},
		});
	}

	// Business invitations (business only): jobs 13-15 with users 13-15
	for (let i = 13; i < 16; i++) {
		await prisma.interest.create({
			data: {
				jobId: jobs[i].id,
				candidateId: regularUsers[i].id,
				candidateInterested: null,
				businessInterested: true,
			},
		});
	}

	// Failed negotiations: jobs 16-17 with users 16-17
	for (let i = 16; i < 18; i++) {
		const interest = await prisma.interest.create({
			data: {
				jobId: jobs[i].id,
				candidateId: regularUsers[i].id,
				candidateInterested: null,
				businessInterested: null,
			},
		});
		await prisma.negotiation.create({
			data: {
				interestId: interest.id,
				jobId: jobs[i].id,
				candidateId: regularUsers[i].id,
				business_id: jobs[i].business_id,
				expiresAt: new Date(now.getTime() - oneHour), // already expired
				status: 'failed',
			},
		});
	}

	// Demo accounts for immediate negotiation testing
	const demoJob100Position = positionTypes[0]; // Dental Assistant L1

	const demoBusiness100 = await prisma.account.create({
		data: {
			email: `business100@${domain}`,
			password: hashedPassword,
			role: 'business',
			activated: true,
			phone_number: '416-555-9100',
			postal_address: '100 Demo Blvd, Toronto, ON',
			buissnessAccount: {
				create: {
					business_name: 'Demo Dental Clinic 100',
					owner_name: 'Demo Owner 100',
					locationLat: 43.66,
					locationLong: -79.4,
					verified: true,
				},
			},
		},
		include: { buissnessAccount: true },
	});

	const demoRegular100 = await prisma.account.create({
		data: {
			email: `regular100@${domain}`,
			password: hashedPassword,
			role: 'regular',
			activated: true,
			phone_number: '647-555-9100',
			postal_address: '100 Demo St, Toronto, ON',
			regularAccount: {
				create: {
					first_name: 'Demo',
					last_name: 'User100',
					birthday: '1995-01-01',
					available: true,
					suspended: false,
					lastActive: now,
				},
			},
		},
		include: { regularAccount: true },
	});

	// Give regular100 an approved qualification for Dental Assistant L1
	await prisma.qualification.create({
		data: {
			user_id: demoRegular100.regularAccount.id,
			position_type_id: demoJob100Position.id,
			status: 'approved',
			note: 'Demo qualification - pre-approved.',
		},
	});

	// Create a job for business100
	const demoJob100 = await prisma.job.create({
		data: {
			business_id: demoBusiness100.buissnessAccount.id,
			position_type_id: demoJob100Position.id,
			salary_min: 30,
			salary_max: 45,
			start_time: new Date(now.getTime() + 3 * oneDay),
			end_time: new Date(now.getTime() + 3 * oneDay + 8 * oneHour),
			status: 'open',
			note: 'Demo job - ready for negotiation.',
		},
	});

	// Create mutual interest so negotiation can begin immediately
	await prisma.interest.create({
		data: {
			jobId: demoJob100.id,
			candidateId: demoRegular100.regularAccount.id,
			candidateInterested: true,
			businessInterested: true,
		},
	});

	console.log(
		'  Demo Business: business100@csc309.utoronto.ca / 123123 (verified)',
	);
	console.log(
		'  Demo Regular:  regular100@csc309.utoronto.ca / 123123 (approved, available, mutual interest ready)',
	);

	console.log('Interests, negotiations, and filled jobs seeded.');
	console.log('Seeding completed successfully.');
	console.log('');
	console.log('Test accounts:');
	console.log('  Admin:    admin1@csc309.utoronto.ca / 123123');
	console.log('  Business: business1@csc309.utoronto.ca / 123123 (verified)');
	console.log(
		'  Regular:  regular1@csc309.utoronto.ca / 123123 (approved, available)',
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
