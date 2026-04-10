import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function JobDetail() {
	const { jobId } = useParams();
	const { token } = useAuth();
	const navigate = useNavigate();
	const [job, setJob] = useState(null);
	const [interest, setInterest] = useState(null); // interest object if exists
	const [loading, setLoading] = useState(true);
	const [acting, setActing] = useState(false);
	const [error, setError] = useState('');
	const [coords, setCoords] = useState(null);

	useEffect(() => {
		navigator.geolocation?.getCurrentPosition(
			(pos) =>
				setCoords({
					lat: pos.coords.latitude,
					lon: pos.coords.longitude,
				}),
			() => {},
		);
	}, []);

	useEffect(() => {
		loadJob();
	}, [jobId, coords]);

	const loadJob = async () => {
		setLoading(true);
		try {
			const params = coords ? { lat: coords.lat, lon: coords.lon } : {};
			const data = await api.get(`/jobs/${jobId}`, token, params);
			setJob(data);
			// check if user already has interest
			const interests = await api.get('/users/me/interests', token, {
				limit: 100,
			});
			const existing = interests.results.find(
				(i) => i.job?.id === parseInt(jobId),
			);
			if (existing) setInterest(existing);
		} catch (err) {
			setError(err.message || 'Failed to load job.');
		}
		setLoading(false);
	};

	const handleInterest = async (interested) => {
		setActing(true);
		setError('');
		try {
			const res = await api.patch(
				`/jobs/${jobId}/interested`,
				{ interested },
				token,
			);
			if (interested) {
				setInterest({
					interest_id: res.id,
					mutual: res.business?.interested === true,
				});
			} else {
				setInterest(null);
			}
		} catch (err) {
			setError(err.message || 'Action failed.');
		} finally {
			setActing(false);
		}
	};

	if (loading)
		return (
			<AppLayout>
				<div className='loading'>Loading…</div>
			</AppLayout>
		);
	if (!job)
		return (
			<AppLayout>
				<div className='empty-state'>
					<h3>Job not found</h3>
				</div>
			</AppLayout>
		);

	const isOpen = job.status === 'open';
	const hasInterest = !!interest;

	return (
		<AppLayout>
			<div style={{ marginBottom: 16 }}>
				<button
					className='btn btn-ghost'
					style={{ padding: '6px 14px', fontSize: '0.83rem' }}
					onClick={() => navigate(-1)}
				>
					← Back
				</button>
			</div>

			<div className='page-header flex-between'>
				<div>
					<h1 className='page-title'>{job.position_type?.name}</h1>
					<p className='page-subtitle'>
						{job.business?.business_name}
					</p>
				</div>
				<span
					className={`badge badge-${job.status}`}
					style={{ fontSize: '0.85rem', padding: '5px 14px' }}
				>
					{job.status}
				</span>
			</div>

			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 16 }}
				>
					{error}
				</div>
			)}

			{interest?.mutual && (
				<div
					className='alert alert-info'
					style={{ marginBottom: 16 }}
				>
					🎉 Mutual interest reached! You can now initiate negotiation
					from <a href='/interests'>My Interests</a>.
				</div>
			)}

			<div
				className='grid-2'
				style={{ alignItems: 'start' }}
			>
				<div>
					<div
						className='card'
						style={{ marginBottom: 16 }}
					>
						<div className='card-title'>Job Details</div>
						<InfoRow
							label='Salary Range'
							value={
								<span style={{ color: 'var(--accent)' }}>
									${job.salary_min} – ${job.salary_max} / hr
								</span>
							}
						/>
						<InfoRow
							label='Start Time'
							value={new Date(job.start_time).toLocaleString()}
						/>
						<InfoRow
							label='End Time'
							value={new Date(job.end_time).toLocaleString()}
						/>
						{job.distance != null && (
							<InfoRow
								label='Distance'
								value={`${job.distance.toFixed(1)} km`}
							/>
						)}
						{job.eta != null && (
							<InfoRow
								label='ETA'
								value={`${job.eta} min`}
							/>
						)}
						{job.note && (
							<div style={{ marginTop: 14 }}>
								<div
									style={{
										fontSize: '0.72rem',
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.07em',
										color: 'var(--text-muted)',
										marginBottom: 6,
									}}
								>
									Note from Business
								</div>
								<p
									style={{
										fontSize: '0.9rem',
										color: 'var(--text)',
										lineHeight: 1.6,
									}}
								>
									{job.note}
								</p>
							</div>
						)}
					</div>

					<div className='card'>
						<div className='card-title'>Business</div>
						<InfoRow
							label='Name'
							value={job.business?.business_name}
						/>
					</div>
				</div>

				<div className='card'>
					<div className='card-title'>Your Interest</div>
					{!isOpen ? (
						<p className='text-muted'>
							This job is no longer accepting interest.
						</p>
					) : hasInterest ? (
						<>
							<div
								className='alert alert-success'
								style={{ marginBottom: 16 }}
							>
								You have expressed interest in this job.
							</div>
							{interest.mutual ? (
								<div
									className='alert alert-info'
									style={{ marginBottom: 16 }}
								>
									<span className='badge badge-mutual'>
										Mutual Interest
									</span>
									<span
										style={{
											marginLeft: 10,
											fontSize: '0.87rem',
										}}
									>
										Business also interested — negotiation
										available.
									</span>
								</div>
							) : (
								<p
									className='text-muted'
									style={{
										marginBottom: 16,
										fontSize: '0.87rem',
									}}
								>
									Waiting for the business to express
									interest.
								</p>
							)}
							<button
								className='btn btn-ghost'
								style={{
									width: '100%',
									color: 'var(--error)',
									borderColor: 'var(--error)',
								}}
								onClick={() => handleInterest(false)}
								disabled={acting}
							>
								{acting ? 'Withdrawing…' : 'Withdraw Interest'}
							</button>
						</>
					) : (
						<>
							<p
								className='text-muted'
								style={{
									marginBottom: 16,
									fontSize: '0.87rem',
								}}
							>
								Express interest to let this business know
								you're available and interested.
							</p>
							<button
								className='btn btn-primary'
								onClick={() => handleInterest(true)}
								disabled={acting}
							>
								{acting ? 'Submitting…' : 'Express Interest'}
							</button>
						</>
					)}
				</div>
			</div>
		</AppLayout>
	);
}

function InfoRow({ label, value }) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '8px 0',
				borderBottom: '1px solid var(--border)',
			}}
		>
			<span
				style={{
					fontSize: '0.78rem',
					fontWeight: 600,
					textTransform: 'uppercase',
					letterSpacing: '0.07em',
					color: 'var(--text-muted)',
				}}
			>
				{label}
			</span>
			<span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
				{value}
			</span>
		</div>
	);
}
