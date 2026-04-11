/* AI FOR FILE (claude) */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export default function BusinessDashboard() {
	const { token, user } = useAuth();
	const [stats, setStats] = useState({ open: 0, filled: 0, total: 0 });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			try {
				const [open, filled, all] = await Promise.all([
					api.get('/businesses/me/jobs', token, {
						status: ['open'],
						limit: 1,
					}),
					api.get('/businesses/me/jobs', token, {
						status: ['filled'],
						limit: 1,
					}),
					api.get('/businesses/me/jobs', token, { limit: 1 }),
				]);
				setStats({
					open: open.count,
					filled: filled.count,
					total: all.count,
				});
			} catch {}
			setLoading(false);
		};
		load();
	}, [token]);

	const verified = user?.verified;

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Welcome, {user?.business_name}</h1>
				<p className='page-subtitle'>
					Manage your job postings and find qualified staff.
				</p>
			</div>

			{!verified && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 24 }}
				>
					⚠️ Your business is not yet verified. An admin must verify
					your account before you can post jobs.
				</div>
			)}

			<div
				className='grid-3'
				style={{ marginBottom: 24 }}
			>
				<StatCard
					label='Open Jobs'
					value={loading ? '…' : stats.open}
					to='/business/jobs'
					accent
				/>
				<StatCard
					label='Filled Jobs'
					value={loading ? '…' : stats.filled}
					to='/business/jobs'
				/>
				<StatCard
					label='Total Postings'
					value={loading ? '…' : stats.total}
					to='/business/jobs'
				/>
			</div>

			<div className='card'>
				<div className='card-title'>Quick Actions</div>
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
					{verified && (
						<Link
							to='/business/jobs/new'
							className='btn btn-primary'
							style={{ width: 'auto', padding: '10px 20px' }}
						>
							+ Post a Job
						</Link>
					)}
					<Link
						to='/business/jobs'
						className='btn btn-ghost'
						style={{ padding: '10px 20px' }}
					>
						View All Jobs
					</Link>
					<Link
						to='/business/profile'
						className='btn btn-ghost'
						style={{ padding: '10px 20px' }}
					>
						Edit Profile
					</Link>
				</div>
			</div>
		</AppLayout>
	);
}

function StatCard({ label, value, to, accent }) {
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
						color: accent ? 'var(--accent)' : 'var(--text)',
					}}
				>
					{value}
				</div>
				<div className='text-muted mt-8'>{label}</div>
			</div>
		</Link>
	);
}
