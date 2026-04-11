/* AI FOR FILE (claude) */

import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const LIMIT = 10;

export default function AdminQualifications() {
	const { token } = useAuth();
	const [quals, setQuals] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [error, setError] = useState('');
	const [selected, setSelected] = useState(null);
	const [deciding, setDeciding] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT };
			if (keyword) params.keyword = keyword;
			const data = await api.get('/qualifications', token, params);
			setQuals(data.results);
			setTotal(data.count);
		} catch (err) {
			setError(err.message);
		}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, [page, keyword]);

	const openDetail = async (qualId) => {
		try {
			const data = await api.get(`/qualifications/${qualId}`, token);
			setSelected(data);
		} catch (err) {
			setError(err.message);
		}
	};

	const handleDecision = async (status) => {
		setDeciding(true);
		try {
			await api.patch(
				`/qualifications/${selected.id}`,
				{ status },
				token,
			);
			setSelected(null);
			await load();
		} catch (err) {
			setError(err.message || 'Failed to update status.');
		} finally {
			setDeciding(false);
		}
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Qualification Reviews</h1>
				<p className='page-subtitle'>
					Review submitted and revised qualification requests.
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
					placeholder='Search by user name, email, phone…'
					value={keyword}
					onChange={(e) => {
						setKeyword(e.target.value);
						setPage(1);
					}}
					style={{ flex: 1, minWidth: 200 }}
				/>
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{quals.length === 0 ? (
						<div className='empty-state'>
							<h3>No pending qualifications</h3>
							<p>All submissions have been reviewed.</p>
						</div>
					) : (
						<div
							className='card'
							style={{ padding: 0, overflow: 'hidden' }}
						>
							<table className='data-table'>
								<thead>
									<tr>
										<th>User</th>
										<th>Position Type</th>
										<th>Status</th>
										<th>Last Updated</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{quals.map((q) => (
										<tr key={q.id}>
											<td style={{ fontWeight: 500 }}>
												{q.user.first_name}{' '}
												{q.user.last_name}
											</td>
											<td className='text-muted'>
												{q.position_type.name}
											</td>
											<td>
												<span
													className={`badge badge-${q.status}`}
												>
													{q.status}
												</span>
											</td>
											<td className='text-muted'>
												{new Date(
													q.updatedAt,
												).toLocaleString()}
											</td>
											<td>
												<button
													className='btn btn-ghost'
													style={{
														padding: '3px 12px',
														fontSize: '0.78rem',
													}}
													onClick={() =>
														openDetail(q.id)
													}
												>
													Review
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

			{/* Review Modal */}
			{selected && (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.75)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
						padding: 20,
					}}
				>
					<div
						style={{
							background: 'var(--surface)',
							border: '1px solid var(--border)',
							borderRadius: 8,
							width: '100%',
							maxWidth: 560,
							padding: 28,
							maxHeight: '90vh',
							overflowY: 'auto',
						}}
					>
						<div
							className='flex-between'
							style={{ marginBottom: 20 }}
						>
							<h3
								style={{
									fontFamily: 'DM Serif Display, serif',
									fontSize: '1.2rem',
								}}
							>
								Review Qualification
							</h3>
							<button
								onClick={() => setSelected(null)}
								style={{
									background: 'none',
									border: 'none',
									color: 'var(--text-muted)',
									cursor: 'pointer',
									fontSize: '1.2rem',
								}}
							>
								✕
							</button>
						</div>

						{/* Position type */}
						<div style={{ marginBottom: 16 }}>
							<div
								style={{
									fontSize: '0.72rem',
									fontWeight: 600,
									textTransform: 'uppercase',
									letterSpacing: '0.07em',
									color: 'var(--text-muted)',
									marginBottom: 4,
								}}
							>
								Position Type
							</div>
							<div style={{ fontWeight: 600 }}>
								{selected.position_type?.name}
							</div>
							<div
								className='text-muted'
								style={{ fontSize: '0.84rem' }}
							>
								{selected.position_type?.description}
							</div>
						</div>

						{/* Applicant */}
						<div
							style={{
								background: 'var(--surface2)',
								borderRadius: 4,
								padding: 14,
								marginBottom: 16,
							}}
						>
							<div
								style={{
									fontSize: '0.72rem',
									fontWeight: 600,
									textTransform: 'uppercase',
									letterSpacing: '0.07em',
									color: 'var(--text-muted)',
									marginBottom: 10,
								}}
							>
								Applicant
							</div>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									marginBottom: 10,
								}}
							>
								{selected.user?.avatar ? (
									<img
										src={`${BASE}${selected.user.avatar}`}
										alt=''
										className='avatar'
										style={{ width: 44, height: 44 }}
									/>
								) : (
									<div
										className='avatar-placeholder'
										style={{ width: 44, height: 44 }}
									>
										{selected.user?.first_name?.[0]}
									</div>
								)}
								<div>
									<div style={{ fontWeight: 600 }}>
										{selected.user?.first_name}{' '}
										{selected.user?.last_name}
									</div>
									<div
										className='text-muted'
										style={{ fontSize: '0.82rem' }}
									>
										{selected.user?.email}
									</div>
									<div
										className='text-muted'
										style={{ fontSize: '0.82rem' }}
									>
										{selected.user?.phone_number}
									</div>
								</div>
							</div>
							{selected.user?.resume && (
								<a
									href={`${BASE}${selected.user.resume}`}
									target='_blank'
									rel='noreferrer'
									style={{
										fontSize: '0.83rem',
										color: 'var(--accent)',
									}}
								>
									View Resume ↗
								</a>
							)}
							{selected.user?.biography && (
								<p
									style={{
										fontSize: '0.85rem',
										marginTop: 8,
										color: 'var(--text-muted)',
										lineHeight: 1.6,
									}}
								>
									{selected.user.biography}
								</p>
							)}
						</div>

						{/* Note */}
						<div style={{ marginBottom: 16 }}>
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
								Applicant Note
							</div>
							<p
								style={{
									fontSize: '0.88rem',
									lineHeight: 1.7,
									color: selected.note
										? 'var(--text)'
										: 'var(--text-dim)',
								}}
							>
								{selected.note || 'No note provided.'}
							</p>
						</div>

						{/* Document */}
						<div style={{ marginBottom: 20 }}>
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
								Supporting Document
							</div>
							{selected.document ? (
								<a
									href={`${BASE}${selected.document}`}
									target='_blank'
									rel='noreferrer'
									style={{
										fontSize: '0.88rem',
										color: 'var(--accent)',
									}}
								>
									View Document ↗
								</a>
							) : (
								<p
									className='text-muted'
									style={{ fontSize: '0.88rem' }}
								>
									No document uploaded.
								</p>
							)}
						</div>

						{/* Current status */}
						<div style={{ marginBottom: 20 }}>
							<span className={`badge badge-${selected.status}`}>
								{selected.status}
							</span>
							<span
								className='text-muted'
								style={{ marginLeft: 10, fontSize: '0.82rem' }}
							>
								Updated{' '}
								{new Date(selected.updatedAt).toLocaleString()}
							</span>
						</div>

						{/* Decision buttons */}
						{(selected.status === 'submitted' ||
							selected.status === 'revised') && (
							<div style={{ display: 'flex', gap: 10 }}>
								<button
									className='btn btn-primary'
									style={{
										flex: 1,
										background: 'rgba(82,192,122,0.2)',
										color: '#52c07a',
										border: '1px solid rgba(82,192,122,0.4)',
									}}
									onClick={() => handleDecision('approved')}
									disabled={deciding}
								>
									{deciding ? '…' : '✓ Approve'}
								</button>
								<button
									className='btn btn-ghost'
									style={{
										flex: 1,
										color: 'var(--error)',
										borderColor: 'var(--error)',
									}}
									onClick={() => handleDecision('rejected')}
									disabled={deciding}
								>
									{deciding ? '…' : '✕ Reject'}
								</button>
							</div>
						)}

						{selected.status !== 'submitted' &&
							selected.status !== 'revised' && (
								<p
									className='text-muted'
									style={{
										fontSize: '0.85rem',
										textAlign: 'center',
									}}
								>
									This qualification has already been{' '}
									{selected.status}.
								</p>
							)}
					</div>
				</div>
			)}
		</AppLayout>
	);
}
