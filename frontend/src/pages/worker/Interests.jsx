import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;

export default function Interests() {
	const { token } = useAuth();
	const navigate = useNavigate();
	const [interests, setInterests] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [acting, setActing] = useState(null);
	const [error, setError] = useState('');

	const load = async () => {
		setLoading(true);
		try {
			const data = await api.get('/users/me/interests', token, {
				page,
				limit: LIMIT,
			});
			setInterests(data.results);
			setTotal(data.count);
		} catch {}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, [page, token]);

	const startNegotiation = async (interestId) => {
		setActing(interestId);
		setError('');
		try {
			await api.post('/negotiations', { interest_id: interestId }, token);
			navigate('/negotiation');
		} catch (err) {
			setError(err.message || 'Could not start negotiation.');
			setActing(null);
		}
	};

	const withdrawInterest = async (jobId) => {
		setActing(jobId);
		setError('');
		try {
			await api.patch(
				`/jobs/${jobId}/interested`,
				{ interested: false },
				token,
			);
			await load();
		} catch (err) {
			setError(err.message || 'Could not withdraw interest.');
		} finally {
			setActing(null);
		}
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>My Interests</h1>
				<p className='page-subtitle'>
					Jobs you've expressed interest in. Mutual interest unlocks
					negotiation.
				</p>
			</div>

			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 16 }}
				>
					{error}
				</div>
			)}

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{interests.length === 0 ? (
						<div className='empty-state'>
							<h3>No active interests</h3>
							<p>
								Browse available jobs and express interest to
								see them here.
							</p>
						</div>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
							}}
						>
							{interests.map(({ interest_id, mutual, job }) => (
								<div
									key={interest_id}
									className='card'
									style={{
										borderColor: mutual
											? 'rgba(232,197,71,0.4)'
											: 'var(--border)',
										background: mutual
											? 'rgba(232,197,71,0.04)'
											: 'var(--surface)',
									}}
								>
									<div
										className='flex-between'
										style={{ flexWrap: 'wrap', gap: 12 }}
									>
										<div style={{ flex: 1 }}>
											<div
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: 10,
													marginBottom: 6,
												}}
											>
												<span
													style={{
														fontWeight: 600,
														fontSize: '1rem',
													}}
												>
													{job.position_type?.name}
												</span>
												<span
													className={`badge badge-${job.status}`}
												>
													{job.status}
												</span>
												{mutual && (
													<span className='badge badge-mutual'>
														Mutual Interest
													</span>
												)}
											</div>
											<div
												className='text-muted'
												style={{ fontSize: '0.85rem' }}
											>
												{job.business?.business_name} ·
												${job.salary_min}–$
												{job.salary_max}/hr
											</div>
											<div
												className='text-muted'
												style={{
													fontSize: '0.82rem',
													marginTop: 4,
												}}
											>
												{new Date(
													job.start_time,
												).toLocaleString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
												{' → '}
												{new Date(
													job.end_time,
												).toLocaleString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</div>
											{!mutual && (
												<div
													style={{
														fontSize: '0.8rem',
														color: 'var(--text-dim)',
														marginTop: 6,
													}}
												>
													Waiting for business to
													express interest…
												</div>
											)}
										</div>
										<div
											style={{
												display: 'flex',
												gap: 8,
												alignItems: 'center',
												flexShrink: 0,
											}}
										>
											<button
												className='btn btn-ghost'
												style={{
													padding: '6px 14px',
													fontSize: '0.82rem',
												}}
												onClick={() =>
													navigate(`/jobs/${job.id}`)
												}
											>
												View Job
											</button>
											{mutual &&
												job.status === 'open' && (
													<button
														className='btn btn-primary'
														style={{
															padding: '6px 16px',
															fontSize: '0.82rem',
														}}
														onClick={() =>
															startNegotiation(
																interest_id,
															)
														}
														disabled={
															acting ===
															interest_id
														}
													>
														{acting === interest_id
															? 'Starting…'
															: '⚡ Negotiate'}
													</button>
												)}
											{job.status === 'open' && (
												<button
													className='btn btn-ghost'
													style={{
														padding: '6px 14px',
														fontSize: '0.82rem',
														color: 'var(--error)',
														borderColor:
															'transparent',
													}}
													onClick={() =>
														withdrawInterest(job.id)
													}
													disabled={acting === job.id}
												>
													Withdraw
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
					<Pagination
						page={page}
						total={total}
						limit={LIMIT}
						onPage={setPage}
					/>
				</>
			)}
		</AppLayout>
	);
}
