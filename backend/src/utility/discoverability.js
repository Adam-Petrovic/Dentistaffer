const system_timers = require('../config');

const prisma = require('../prisma');
async function isDiscoverable(user, job, time) {
	const account = user.account;

	if (
		!account.activated ||
		user.suspended ||
		!user.available ||
		!user.lastActive
	) {
		return false;
	}

	const qualification = await prisma.qualification.findFirst({
		where: {
			user_id: user.id,
			position_type_id: job.position_type_id,
			status: 'approved',
		},
	});

	if (!qualification) {
		return false;
	}

	const isConflict = await prisma.job.findFirst({
		where: {
			worker_id: user.id,
			status: 'filled',
			start_time: { lt: job.end_time },
			end_time: { gt: job.start_time },
			id: { not: job.id },
		},
	});

	if (isConflict) {
		return false;
	}

	const inactiveDuration =
		(time.getTime() - user.lastActive.getTime()) / 1000;
	if (inactiveDuration > system_timers.availabilityTimeout) {
		return false;
	}

	return true;
}

module.exports = { isDiscoverable };
