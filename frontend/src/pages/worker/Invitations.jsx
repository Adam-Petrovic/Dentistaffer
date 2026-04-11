/* AI FOR FILE (claude) */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;

export default function Invitations() {
	const { token } = useAuth();
	const navigate = useNavigate();
	const [invitations, setInvitations] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const data = await api.get('/users/me/invitations', token, {
					page,
					limit: LIMIT,
				});
				setInvitations(data.results);
				setTotal(data.count);
			} catch {}
			setLoading(false);
		};
		load();
	}, [page, token]);

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Invitations</h1>
				<p className='page-subtitle'>
					Jobs where businesses have invited you to express interest.
				</p>
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{invitations.length === 0 ? (
						<div className='empty-state'>
							<h3>No invitations yet</h3>
							<p>
								Make yourself available and businesses will be
								able to invite you to jobs.
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
										<th>Business</th>
										<th>Salary</th>
										<th>Start Time</th>
										<th>Status</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{invitations.map((job) => (
										<tr key={job.id}>
											<td>
												<div
													style={{ fontWeight: 500 }}
												>
													{job.position_type?.name}
												</div>
											</td>
											<td className='text-muted'>
												{job.business?.business_name}
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
												{new Date(
													job.start_time,
												).toLocaleString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</td>
											<td>
												<span
													className={`badge badge-${job.status}`}
												>
													{job.status}
												</span>
											</td>
											<td>
												<button
													className='btn btn-ghost'
													style={{
														padding: '4px 12px',
														fontSize: '0.8rem',
													}}
													onClick={() =>
														navigate(
															`/jobs/${job.id}`,
														)
													}
												>
													View & Respond
												</button>
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
