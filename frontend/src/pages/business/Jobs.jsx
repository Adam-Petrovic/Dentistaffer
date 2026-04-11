/* AI FOR FILE (claude) */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;
const ALL_STATUSES = ['open', 'filled', 'expired', 'canceled', 'completed'];

export default function BusinessJobs() {
	const { token, user } = useAuth();
	const navigate = useNavigate();
	const [jobs, setJobs] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [statuses, setStatuses] = useState(['open', 'filled']);
	const [deleting, setDeleting] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		loadJobs();
	}, [page, statuses]);

	const loadJobs = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page, limit: LIMIT });
			statuses.forEach((s) => params.append('status', s));
			const data = await api.get(`/businesses/me/jobs?${params}`, token);
			setJobs(data.results);
			setTotal(data.count);
		} catch {}
		setLoading(false);
	};

	const toggleStatus = (s) => {
		setStatuses((prev) =>
			prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
		);
		setPage(1);
	};

	const handleDelete = async (jobId) => {
		if (!confirm('Delete this job posting? This cannot be undone.')) return;
		setDeleting(jobId);
		setError('');
		try {
			await api.delete(`/businesses/me/jobs/${jobId}`, token);
			await loadJobs();
		} catch (err) {
			setError(err.message || 'Could not delete job.');
		} finally {
			setDeleting(null);
		}
	};

	return (
		<AppLayout>
			<div className='page-header flex-between'>
				<div>
					<h1 className='page-title'>My Job Postings</h1>
					<p className='page-subtitle'>
						Manage all jobs posted by your business.
					</p>
				</div>
				{user?.verified && (
					<Link
						to='/business/jobs/new'
						className='btn btn-primary'
						style={{ width: 'auto', padding: '10px 20px' }}
					>
						+ Post a Job
					</Link>
				)}
			</div>

			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 16 }}
				>
					{error}
				</div>
			)}

			{/* Status filters */}
			<div
				style={{
					display: 'flex',
					gap: 8,
					flexWrap: 'wrap',
					marginBottom: 20,
				}}
			>
				{ALL_STATUSES.map((s) => (
					<button
						key={s}
						onClick={() => toggleStatus(s)}
						style={{
							padding: '5px 14px',
							borderRadius: 99,
							fontSize: '0.8rem',
							fontWeight: 600,
							border: '1px solid',
							cursor: 'pointer',
							fontFamily: 'DM Sans, sans-serif',
							background: statuses.includes(s)
								? 'var(--accent-dim)'
								: 'transparent',
							borderColor: statuses.includes(s)
								? 'var(--accent)'
								: 'var(--border)',
							color: statuses.includes(s)
								? 'var(--accent)'
								: 'var(--text-muted)',
							transition: 'all 0.15s',
						}}
					>
						{s}
					</button>
				))}
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{jobs.length === 0 ? (
						<div className='empty-state'>
							<h3>No jobs found</h3>
							<p>
								{user?.verified
									? 'Post your first job to get started.'
									: 'Your account must be verified before posting jobs.'}
							</p>
						</div>
					) : (
						<div
							className='card'
							style={{ padding: 0, overflow: 'hidden' }}
						>
							<table className='data-table'>
								<thead>
									<tr>
										<th>Position</th>
										<th>Status</th>
										<th>Worker</th>
										<th>Salary</th>
										<th>Start</th>
										<th>End</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{jobs.map((job) => (
										<tr key={job.id}>
											<td
												style={{
													fontWeight: 500,
													cursor: 'pointer',
												}}
												onClick={() =>
													navigate(
														`/business/jobs/${job.id}`,
													)
												}
											>
												{job.position_type?.name}
											</td>
											<td>
												<span
													className={`badge badge-${job.status}`}
												>
													{job.status}
												</span>
											</td>
											<td className='text-muted'>
												{job.worker
													? `${job.worker.first_name} ${job.worker.last_name}`
													: '—'}
											</td>
											<td
												style={{
													color: 'var(--accent)',
												}}
											>
												${job.salary_min}–$
												{job.salary_max}/hr
											</td>
											<td className='text-muted'>
												{fmtDate(job.start_time)}
											</td>
											<td className='text-muted'>
												{fmtDate(job.end_time)}
											</td>
											<td>
												<div
													style={{
														display: 'flex',
														gap: 6,
													}}
												>
													<button
														className='btn btn-ghost'
														style={{
															padding: '3px 10px',
															fontSize: '0.78rem',
														}}
														onClick={() =>
															navigate(
																`/business/jobs/${job.id}`,
															)
														}
													>
														View
													</button>
													{(job.status === 'open' ||
														job.status ===
															'expired') && (
														<button
															className='btn btn-ghost'
															style={{
																padding:
																	'3px 10px',
																fontSize:
																	'0.78rem',
																color: 'var(--error)',
																borderColor:
																	'var(--error)',
															}}
															onClick={() =>
																handleDelete(
																	job.id,
																)
															}
															disabled={
																deleting ===
																job.id
															}
														>
															{deleting === job.id
																? '…'
																: 'Delete'}
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
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

function fmtDate(iso) {
	return new Date(iso).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
