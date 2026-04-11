/* AI FOR FILE (claude) */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export default function WorkerDashboard() {
	const { token, user, setUser } = useAuth();
	const [stats, setStats] = useState({ invitations: 0, interests: 0 });
	const [toggling, setToggling] = useState(false);
	const [availError, setAvailError] = useState('');

	useEffect(() => {
		const load = async () => {
			try {
				const [inv, int] = await Promise.all([
					api.get('/users/me/invitations', token, { limit: 1 }),
					api.get('/users/me/interests', token, { limit: 1 }),
				]);
				setStats({ invitations: inv.count, interests: int.count });
			} catch {}
		};
		load();
	}, [token]);

	const toggleAvailable = async () => {
		setAvailError('');
		setToggling(true);
		try {
			const res = await api.patch(
				'/users/me/available',
				{ available: !user.available },
				token,
			);
			setUser((u) => ({ ...u, available: res.available }));
		} catch (err) {
			setAvailError(err.message || 'Could not update availability.');
		} finally {
			setToggling(false);
		}
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>
					Welcome back, {user?.first_name || 'Worker'}
				</h1>
				<p className='page-subtitle'>
					Here's what's happening with your account.
				</p>
			</div>

			{/* Availability toggle */}
			<div
				className='card'
				style={{ marginBottom: 24 }}
			>
				<div className='flex-between'>
					<div>
						<div
							className='card-title'
							style={{ marginBottom: 4 }}
						>
							Availability
						</div>
						<p className='text-muted'>
							{user?.available
								? 'You are visible to businesses and can receive job invitations.'
								: 'You are hidden from businesses. Toggle on to be discoverable.'}
						</p>
						{availError && (
							<p
								style={{
									color: 'var(--error)',
									fontSize: '0.85rem',
									marginTop: 6,
								}}
							>
								{availError}
							</p>
						)}
					</div>
					<button
						onClick={toggleAvailable}
						disabled={toggling}
						style={{
							padding: '10px 24px',
							borderRadius: 4,
							border: 'none',
							cursor: toggling ? 'not-allowed' : 'pointer',
							fontFamily: 'DM Sans, sans-serif',
							fontWeight: 600,
							fontSize: '0.85rem',
							background: user?.available
								? 'rgba(224,82,82,0.15)'
								: 'rgba(82,192,122,0.15)',
							color: user?.available
								? 'var(--error)'
								: 'var(--success)',
							transition: 'all 0.15s',
							opacity: toggling ? 0.6 : 1,
						}}
					>
						{toggling
							? '…'
							: user?.available
								? 'Go Offline'
								: 'Go Available'}
					</button>
				</div>
			</div>

			{/* Stats */}
			<div
				className='grid-3'
				style={{ marginBottom: 24 }}
			>
				<StatCard
					label='Pending Invitations'
					value={stats.invitations}
					to='/invitations'
				/>
				<StatCard
					label='Active Interests'
					value={stats.interests}
					to='/interests'
				/>
				<StatCard
					label='Qualifications'
					value='View'
					to='/qualifications'
				/>
			</div>

			{/* Quick links */}
			<div className='card'>
				<div className='card-title'>Quick Actions</div>
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
					<Link
						to='/jobs'
						className='btn btn-primary'
						style={{ width: 'auto', padding: '10px 20px' }}
					>
						Browse Jobs
					</Link>
					<Link
						to='/profile'
						className='btn btn-ghost'
						style={{ padding: '10px 20px' }}
					>
						Edit Profile
					</Link>
					<Link
						to='/qualifications'
						className='btn btn-ghost'
						style={{ padding: '10px 20px' }}
					>
						Manage Qualifications
					</Link>
				</div>
			</div>
		</AppLayout>
	);
}

function StatCard({ label, value, to }) {
	return (
		<Link
			to={to}
			style={{ textDecoration: 'none' }}
		>
			<div
				className='card'
				style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
				onMouseEnter={(e) =>
					(e.currentTarget.style.borderColor = 'var(--accent)')
				}
				onMouseLeave={(e) =>
					(e.currentTarget.style.borderColor = 'var(--border)')
				}
			>
				<div
					style={{
						fontSize: '2rem',
						fontFamily: 'DM Serif Display, serif',
						color: 'var(--accent)',
					}}
				>
					{value}
				</div>
				<div className='text-muted mt-8'>{label}</div>
			</div>
		</Link>
	);
}
