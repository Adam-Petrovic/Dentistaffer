import { useEffect, useState, useRef } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_FLOW = {
	created: 'Submit for Review',
	rejected: 'Revise & Resubmit',
	approved: 'Revise & Resubmit',
};

export default function Qualifications() {
	const { token } = useAuth();
	const [posTypes, setPosTypes] = useState([]);
	const [posTotal, setPosTotal] = useState(0);
	const [posPage, setPosPage] = useState(1);
	const [quals, setQuals] = useState([]);
	const [qualsTotal, setQualsTotal] = useState(0);
	const [qualsPage, setQualsPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [selected, setSelected] = useState(null); // qualification detail modal
	const [creating, setCreating] = useState(null); // position type id for new qual
	const [note, setNote] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const docRef = useRef();
	const [uploadingDoc, setUploadingDoc] = useState(false);
	const LIMIT = 10;

	const loadData = async () => {
		setLoading(true);
		try {
			const [pt, q] = await Promise.all([
				api.get('/position-types', token, {
					page: posPage,
					limit: LIMIT,
					keyword,
				}),
				api
					.get('/users/me/qualifications', token, {
						page: qualsPage,
						limit: LIMIT,
					})
					.catch(() => ({ count: 0, results: [] })),
			]);
			console.log(q.results);
			setPosTypes(pt.results);
			setPosTotal(pt.count);
			setQuals(q.results);
			setQualsTotal(q.count);
		} catch {}
		setLoading(false);
	};

	useEffect(() => {
		loadData();
	}, [posPage, qualsPage, keyword]);

	const qualForType = (typeId) =>
		quals.find((q) => q.position_type?.id === typeId);

	const handleCreate = async (posTypeId) => {
		setError('');
		setSubmitting(true);
		try {
			await api.post(
				'/qualifications',
				{ position_type_id: posTypeId, note: '' },
				token,
			);
			await loadData();
		} catch (err) {
			setError(err.message || 'Failed to create qualification.');
		} finally {
			setSubmitting(false);
			setCreating(null);
		}
	};

	const handleStatusChange = async (qualId, newStatus) => {
		setError('');
		setSubmitting(true);
		try {
			await api.patch(
				`/qualifications/${qualId}`,
				{ status: newStatus },
				token,
			);
			await loadData();
			if (selected?.id === qualId) setSelected(null);
		} catch (err) {
			setError(err.message || 'Failed to update status.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleNoteUpdate = async (qualId) => {
		setSubmitting(true);
		try {
			await api.patch(`/qualifications/${qualId}`, { note }, token);
			await loadData();
			setSelected(null);
		} catch (err) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDocUpload = async (qualId, file) => {
		if (!file) return;
		setUploadingDoc(true);
		try {
			await api.upload(`/qualifications/${qualId}/document`, file, token);
			await loadData();
		} catch (err) {
			setError(err.message);
		} finally {
			setUploadingDoc(false);
		}
	};

	const openDetail = async (qualId) => {
		try {
			const q = await api.get(`/qualifications/${qualId}`, token);
			setSelected(q);
			setNote(q.note || '');
		} catch {}
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Qualifications</h1>
				<p className='page-subtitle'>
					Request qualifications for position types to unlock job
					postings.
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

			{/* My Qualifications */}
			{quals.length > 0 && (
				<div
					className='card'
					style={{ marginBottom: 24 }}
				>
					<div className='card-title'>My Qualification Requests</div>
					<table className='data-table'>
						<thead>
							<tr>
								<th>Position Type</th>
								<th>Status</th>
								<th>Last Updated</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{quals.map((q) => (
								<tr key={q.id}>
									<td>{q.position_type?.name}</td>
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
										).toLocaleDateString()}
									</td>
									<td>
										<div
											style={{ display: 'flex', gap: 8 }}
										>
											<button
												className='btn btn-ghost'
												style={{
													padding: '4px 12px',
													fontSize: '0.8rem',
												}}
												onClick={() => openDetail(q.id)}
											>
												View
											</button>
											{STATUS_FLOW[q.status] && (
												<button
													className='btn btn-ghost'
													style={{
														padding: '4px 12px',
														fontSize: '0.8rem',
														color: 'var(--accent)',
														borderColor:
															'var(--accent)',
													}}
													onClick={() =>
														handleStatusChange(
															q.id,
															q.status ===
																'created'
																? 'submitted'
																: 'revised',
														)
													}
													disabled={submitting}
												>
													{STATUS_FLOW[q.status]}
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<Pagination
						page={qualsPage}
						total={qualsTotal}
						limit={LIMIT}
						onPage={setQualsPage}
					/>
				</div>
			)}

			{/* Position Types */}
			<div className='card'>
				<div className='card-title'>Available Position Types</div>
				<div className='filters'>
					<input
						placeholder='Search position types…'
						value={keyword}
						onChange={(e) => {
							setKeyword(e.target.value);
							setPosPage(1);
						}}
						style={{ flex: 1, minWidth: 200 }}
					/>
				</div>

				{loading ? (
					<div className='loading'>Loading…</div>
				) : (
					<>
						{posTypes.length === 0 ? (
							<div className='empty-state'>
								<h3>No position types found</h3>
							</div>
						) : (
							posTypes.map((pt) => {
								const qual = qualForType(pt.id);
								return (
									<div
										key={pt.id}
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											padding: '14px 0',
											borderBottom:
												'1px solid var(--border)',
										}}
									>
										<div>
											<div style={{ fontWeight: 500 }}>
												{pt.name}
											</div>
											<div
												className='text-muted'
												style={{
													fontSize: '0.83rem',
													marginTop: 2,
												}}
											>
												{pt.description}
											</div>
										</div>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 10,
											}}
										>
											{qual ? (
												<span
													className={`badge badge-${qual.status}`}
												>
													{qual.status}
												</span>
											) : (
												<button
													className='btn btn-ghost'
													style={{
														padding: '5px 14px',
														fontSize: '0.82rem',
													}}
													onClick={() =>
														handleCreate(pt.id)
													}
													disabled={
														submitting ||
														creating === pt.id
													}
												>
													{creating === pt.id
														? 'Creating…'
														: '+ Request Qualification'}
												</button>
											)}
										</div>
									</div>
								);
							})
						)}
						<Pagination
							page={posPage}
							total={posTotal}
							limit={LIMIT}
							onPage={setPosPage}
						/>
					</>
				)}
			</div>

			{/* Detail Modal */}
			{selected && (
				<Modal
					onClose={() => setSelected(null)}
					title={`Qualification: ${selected.position_type?.name}`}
				>
					<div style={{ marginBottom: 12 }}>
						<span className={`badge badge-${selected.status}`}>
							{selected.status}
						</span>
						<span
							className='text-muted'
							style={{ marginLeft: 12, fontSize: '0.82rem' }}
						>
							Updated{' '}
							{new Date(selected.updatedAt).toLocaleString()}
						</span>
					</div>

					<div className='form-group'>
						<label>Note</label>
						<textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={4}
							style={{ resize: 'vertical' }}
							placeholder='Describe your qualifications…'
						/>
					</div>

					<div style={{ marginBottom: 16 }}>
						<label
							style={{
								display: 'block',
								fontSize: '0.78rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								color: 'var(--text-muted)',
								marginBottom: 7,
							}}
						>
							Document
						</label>
						{selected.document ? (
							<a
								href={`${BASE}${selected.document}`}
								target='_blank'
								rel='noreferrer'
								style={{
									fontSize: '0.87rem',
									color: 'var(--accent)',
								}}
							>
								View uploaded document ↗
							</a>
						) : (
							<p
								className='text-muted'
								style={{ fontSize: '0.87rem' }}
							>
								No document uploaded.
							</p>
						)}
						<input
							ref={docRef}
							type='file'
							accept='application/pdf'
							style={{ display: 'none' }}
							onChange={(e) =>
								handleDocUpload(selected.id, e.target.files[0])
							}
						/>
						<button
							className='btn btn-ghost'
							style={{
								padding: '6px 14px',
								fontSize: '0.82rem',
								marginTop: 10,
							}}
							onClick={() => docRef.current.click()}
							disabled={uploadingDoc}
						>
							{uploadingDoc
								? 'Uploading…'
								: 'Upload PDF Document'}
						</button>
					</div>

					<div style={{ display: 'flex', gap: 10 }}>
						<button
							className='btn btn-primary'
							style={{ flex: 1 }}
							onClick={() => handleNoteUpdate(selected.id)}
							disabled={submitting}
						>
							Save Note
						</button>
						{STATUS_FLOW[selected.status] && (
							<button
								className='btn btn-ghost'
								style={{
									flex: 1,
									color: 'var(--accent)',
									borderColor: 'var(--accent)',
								}}
								onClick={() =>
									handleStatusChange(
										selected.id,
										selected.status === 'created'
											? 'submitted'
											: 'revised',
									)
								}
								disabled={submitting}
							>
								{STATUS_FLOW[selected.status]}
							</button>
						)}
					</div>
				</Modal>
			)}
		</AppLayout>
	);
}

function Modal({ title, children, onClose }) {
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.7)',
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
					maxWidth: 520,
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
						{title}
					</h3>
					<button
						onClick={onClose}
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
				{children}
			</div>
		</div>
	);
}
