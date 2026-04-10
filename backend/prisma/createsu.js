/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example:
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const prisma = require('../src/prisma');
const [, , utorid, email, password] = process.argv;

async function createAdmin() {
	try {
		if (!utorid || !email || !password) {
			console.error('Error: Missing arguments.');
			console.error(
				'Usage: node prisma/createsu.js <utorid> <email> <password>',
			);
			process.exit(1);
		}
		const newAccount = await prisma.account.create({
			data: {
				email: email,
				password: password,
				role: 'admin',
				activated: true,
			},
		});
		console.log(
			'Added user ' +
				utorid +
				' with email ' +
				email +
				' and password ' +
				password,
		);
		const newAdmin = await prisma.adminAccount.create({
			data: {
				id: newAccount.id,
			},
		});

		console.log('sucess!');
	} catch (err) {
		console.log('Error with admin: ' + err);
	}
}

createAdmin();
