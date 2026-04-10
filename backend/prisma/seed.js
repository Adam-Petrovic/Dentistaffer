const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
	const password = '123123'; // Standardized for testing
	const domain = 'csc309.utoronto.ca';

	console.log('Cleaning database...');
	await prisma.account.deleteMany();
	await prisma.positionType.deleteMany();

	// 1. Seed Position Types (At least 10)
	const positionNames = [
		'Software Engineer',
		'Nurse',
		'Graphic Designer',
		'Project Manager',
		'Data Analyst',
		'Sales Associate',
		'Chef',
		'Electrician',
		'Marketing Specialist',
		'Customer Support',
	];

	const positionTypes = [];
	for (const name of positionNames) {
		const pt = await prisma.positionType.create({
			data: {
				name,
				description: `Professional ${name} role.`,
				hidden: false,
			},
		});
		positionTypes.push(pt);
	}

	// 2. Seed Admin (At least 1)
	await prisma.account.create({
		data: {
			email: `admin1@${domain}`,
			password,
			role: 'admin',
			activated: true,
			adminAccount: { create: {} },
		},
	});

	// 3. Seed Businesses (At least 10)
	const businesses = [];
	for (let i = 1; i <= 10; i++) {
		const b = await prisma.account.create({
			data: {
				email: `business${i}@${domain}`,
				password,
				role: 'business',
				activated: true,
				buissnessAccount: {
					create: {
						business_name: `Corp ${i} Solutions`,
						owner_name: `Owner ${i}`,
						locationLat: 43.65 + i * 0.01,
						locationLong: -79.38 - i * 0.01,
						verified: i % 2 === 0,
					},
				},
			},
			include: { buissnessAccount: true },
		});
		businesses.push(b.buissnessAccount);
	}

	// 4. Seed Regular Users (At least 20)
	const candidates = [];
	for (let i = 1; i <= 20; i++) {
		const u = await prisma.account.create({
			data: {
				email: `regular${i}@${domain}`,
				password,
				role: 'regular',
				activated: true,
				regularAccount: {
					create: {
						first_name: `User${i}`,
						last_name: `Tester`,
						birthday: '1995-05-15',
						available: true,
					},
				},
			},
			include: { regularAccount: true },
		});
		candidates.push(u.regularAccount);

		// Seed Qualifications (At least 20 total)
		await prisma.qualification.create({
			data: {
				user_id: u.id,
				position_type_id: positionTypes[i % positionTypes.length].id,
				status:
					i % 3 === 0
						? 'approved'
						: i % 3 === 1
							? 'submitted'
							: 'rejected',
				note: 'Verified via automated seed script.',
			},
		});
	}

	// 5. Seed Job Postings (At least 30 for pagination)
	const jobs = [];
	for (let i = 1; i <= 35; i++) {
		const business = businesses[i % businesses.length];
		const pos = positionTypes[i % positionTypes.length];

		// Random thousand salary (e.g., 56000, 78000)
		const randomMin = Math.floor(Math.random() * (90 - 40 + 1) + 40) * 1000;
		const randomMax = randomMin + Math.floor(Math.random() * 20 + 5) * 1000;

		// Make every 3rd job start 7 days in the future
		const startsInFuture = i % 3 === 0;
		let futureOffset = 0;
		if (i % 3 === 0) {
			futureOffset = 14 * 24 * 60 * 60 * 1000; // 2 weeks out
		} else if (i % 2 === 0) {
			futureOffset = 3 * 24 * 60 * 60 * 1000; // 3 days out
		}
		const job = await prisma.job.create({
			data: {
				business_id: business.id,
				position_type_id: pos.id,
				salary_min: randomMin,
				salary_max: randomMax,
				start_time: new Date(Date.now() + futureOffset),
				end_time: new Date(Date.now() + futureOffset + 604800000), // +7 days from start
				status: 'open',
				note: `${startsInFuture ? '[Future Listing] ' : ''}Exciting opportunity ${i} at ${business.business_name}`,
			},
		});
		jobs.push(job);
	}

	// 6. Demonstrate Workflow (Interests -> Negotiations)
	for (let i = 0; i < 15; i++) {
		const job = jobs[i];
		const candidate = candidates[i];

		const interest = await prisma.interest.create({
			data: {
				jobId: job.id,
				candidateId: candidate.id,
				candidateInterested: true,
				businessInterested: true,
			},
		});

		// Create Negotiations for some interests
		if (i < 10) {
			await prisma.negotiation.create({
				data: {
					interestId: interest.id,
					jobId: job.id,
					candidateId: candidate.id,
					business_id: job.business_id,
					expiresAt: new Date(Date.now() + 86400000), // +24 hours
					status: i % 2 === 0 ? 'active' : 'completed',
				},
			});
		}

		// Fill a few jobs specifically
		if (i < 5) {
			await prisma.job.update({
				where: { id: job.id },
				data: { worker_id: candidate.id, status: 'filled' },
			});
		}
	}

	console.log('Seeding completed successfully.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
