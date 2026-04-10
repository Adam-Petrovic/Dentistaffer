import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;

export default function AdminUsers() {
	const { token } = useAuth();
	const [users, setUsers] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [activated, setActivated] = useState('');
	const [suspended, setSuspended] = useState('');
	const [acting, setActing] = useState(null);
	const [error, setError] = useState('');

	const load = async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT };
			if (keyword) params.keyword = keyword;
			if (activated !== '') params.activated = activated;
			if (suspended !== '') params.suspended = suspended;
			const data = await api.get('/users', token, params);
			setUsers(data.results);
			setTotal(data.count);
		} catch (err) {
			setError(err.message);
		}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, [page, keyword, activated, suspended]);

	const toggleSuspend = async (user) => {
		setActing(user.id);
		setError('');
		try {
			await api.patch(
				`/users/${user.id}/suspended`,
				{ suspended: !user.suspended },
				token,
			);
			await load();
		} catch (err) {
			setError(err.message || 'Action failed.');
		} finally {
			setActing(null);
		}
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Users</h1>
				<p className='page-subtitle'>
					Manage all regular user accounts.
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

			<div className='filters'>
				<input
					placeholder='Search name, email, phone…'
					value={keyword}
					onChange={(e) => {
						setKeyword(e.target.value);
						setPage(1);
					}}
					style={{ flex: 1, minWidth: 200 }}
				/>
				<select
					value={activated}
					onChange={(e) => {
						setActivated(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>All activation states</option>
					<option value='true'>Activated</option>
					<option value='false'>Not activated</option>
				</select>
				<select
					value={suspended}
					onChange={(e) => {
						setSuspended(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>All suspension states</option>
					<option value='false'>Active</option>
					<option value='true'>Suspended</option>
				</select>
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{users.length === 0 ? (
						<div className='empty-state'>
							<h3>No users found</h3>
						</div>
					) : (
						<div
							className='card'
							style={{ padding: 0, overflow: 'hidden' }}
						>
							<table className='data-table'>
								<thead>
									<tr>
										<th>Name</th>
										<th>Email</th>
										<th>Phone</th>
										<th>Activated</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{users.map((u) => (
										<tr key={u.id}>
											<td style={{ fontWeight: 500 }}>
												{u.first_name} {u.last_name}
											</td>
											<td className='text-muted'>
												{u.email}
											</td>
											<td className='text-muted'>
												{u.phone_number || '—'}
											</td>
											<td>
												<span
													className={`badge badge-${u.activated ? 'open' : 'expired'}`}
												>
													{u.activated ? 'Yes' : 'No'}
												</span>
											</td>
											<td>
												<span
													className={`badge badge-${u.suspended ? 'canceled' : 'approved'}`}
												>
													{u.suspended
														? 'Suspended'
														: 'Active'}
												</span>
											</td>
											<td>
												<button
													className='btn btn-ghost'
													style={{
														padding: '3px 12px',
														fontSize: '0.78rem',
														color: u.suspended
															? 'var(--success)'
															: 'var(--error)',
														borderColor: u.suspended
															? 'var(--success)'
															: 'var(--error)',
													}}
													onClick={() =>
														toggleSuspend(u)
													}
													disabled={acting === u.id}
												>
													{acting === u.id
														? '…'
														: u.suspended
															? 'Unsuspend'
															: 'Suspend'}
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
