import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AppLayout.css';

const workerLinks = [
	{ to: '/dashboard', label: 'Dashboard' },
	{ to: '/jobs', label: 'Find Jobs' },
	{ to: '/invitations', label: 'Invitations' },
	{ to: '/interests', label: 'My Interests' },
	{ to: '/qualifications', label: 'Qualifications' },
	{ to: '/profile', label: 'Profile' },
];

const businessLinks = [
	{ to: '/business/dashboard', label: 'Dashboard' },
	{ to: '/business/jobs', label: 'My Jobs' },
	{ to: '/business/profile', label: 'Profile' },
];
 
const adminLinks = [
	{ to: '/admin/users', label: 'Users' },
	{ to: '/admin/businesses', label: 'Businesses' },
	{ to: '/admin/position-types', label: 'Position Types' },
	{ to: '/admin/qualifications', label: 'Qualifications' },
	{ to: '/admin/settings', label: 'Settings' },
];

export default function AppLayout({ children }) {
	const { role, logout, user } = useAuth();
	const navigate = useNavigate();

	const links =
		role === 'regular'
			? workerLinks
			: role === 'business'
				? businessLinks
				: adminLinks;

	const handleLogout = () => {
		logout();
		navigate('/login');
	};

	const displayName = user
		? user.first_name
			? `${user.first_name} ${user.last_name}`
			: user.business_name || user.email
		: '';

	return (
		<div className='app-shell'>
			<nav className='app-nav'>
				<NavLink
					to='/'
					className='nav-logo'
				>
					Staffly
				</NavLink>
				<div className='nav-links'>
					{links.map((l) => (
						<NavLink
							key={l.to}
							to={l.to}
							className={({ isActive }) =>
								'nav-link' + (isActive ? ' active' : '')
							}
						>
							{l.label}
						</NavLink>
					))}
				</div>
				<div className='nav-user'>
					<span className='nav-username'>{displayName}</span>
					<button
						className='nav-logout'
						onClick={handleLogout}
					>
						Sign out
					</button>
				</div>
			</nav>
			<main className='app-main'>{children}</main>
		</div>
	);
}
