import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;

export default function AdminBusinesses() {
	const { token } = useAuth();
	const [businesses, setBusinesses] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [activated, setActivated] = useState('');
	const [verified, setVerified] = useState('');
	const [sort, setSort] = useState('');
	const [order, setOrder] = useState('asc');
	const [acting, setActing] = useState(null);
	const [error, setError] = useState('');

	const load = async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT };
			if (keyword) params.keyword = keyword;
			if (activated !== '') params.activated = activated;
			if (verified !== '') params.verified = verified;
			if (sort) {
				params.sort = sort;
				params.order = order;
			}
			const data = await api.get('/businesses', token, params);
			setBusinesses(data.results);
			setTotal(data.count);
		} catch (err) {
			setError(err.message);
		}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, [page, keyword, activated, verified, sort, order]);

	const toggleVerify = async (biz) => {
		setActing(biz.id);
		setError('');
		try {
			await api.patch(
				`/businesses/${biz.id}/verified`,
				{ verified: !biz.verified },
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
				<h1 className='page-title'>Businesses</h1>
				<p className='page-subtitle'>
					Manage and verify business accounts.
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
					placeholder='Search name, email, address…'
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
					value={verified}
					onChange={(e) => {
						setVerified(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>All verification states</option>
					<option value='true'>Verified</option>
					<option value='false'>Unverified</option>
				</select>
				<select
					value={sort}
					onChange={(e) => {
						setSort(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>No sort</option>
					<option value='business_name'>Sort: Business Name</option>
					<option value='owner_name'>Sort: Owner Name</option>
					<option value='email'>Sort: Email</option>
				</select>
				<select
					value={order}
					onChange={(e) => {
						setOrder(e.target.value);
						setPage(1);
					}}
				>
					<option value='asc'>Ascending</option>
					<option value='desc'>Descending</option>
				</select>
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{businesses.length === 0 ? (
						<div className='empty-state'>
							<h3>No businesses found</h3>
						</div>
					) : (
						<div
							className='card'
							style={{ padding: 0, overflow: 'hidden' }}
						>
							<table className='data-table'>
								<thead>
									<tr>
										<th>Business</th>
										<th>Owner</th>
										<th>Email</th>
										<th>Activated</th>
										<th>Verified</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{businesses.map((b) => (
										<tr key={b.id}>
											<td style={{ fontWeight: 500 }}>
												{b.business_name}
											</td>
											<td className='text-muted'>
												{b.owner_name}
											</td>
											<td className='text-muted'>
												{b.email}
											</td>
											<td>
												<span
													className={`badge badge-${b.activated ? 'open' : 'expired'}`}
												>
													{b.activated ? 'Yes' : 'No'}
												</span>
											</td>
											<td>
												<span
													className={`badge badge-${b.verified ? 'approved' : 'submitted'}`}
												>
													{b.verified
														? 'Verified'
														: 'Unverified'}
												</span>
											</td>
											<td>
												<button
													className='btn btn-ghost'
													style={{
														padding: '3px 12px',
														fontSize: '0.78rem',
														color: b.verified
															? 'var(--error)'
															: 'var(--success)',
														borderColor: b.verified
															? 'var(--error)'
															: 'var(--success)',
													}}
													onClick={() =>
														toggleVerify(b)
													}
													disabled={acting === b.id}
												>
													{acting === b.id
														? '…'
														: b.verified
															? 'Unverify'
															: 'Verify'}
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
