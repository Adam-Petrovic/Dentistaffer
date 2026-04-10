import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const LIMIT = 10;

export default function AdminPositionTypes() {
	const { token } = useAuth();
	const [types, setTypes] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [hiddenFilter, setHiddenFilter] = useState('');
	const [error, setError] = useState('');
	const [acting, setActing] = useState(null);

	// Create / edit modal
	const [modal, setModal] = useState(null); // null | 'create' | { id, name, description, hidden }
	const [form, setForm] = useState({
		name: '',
		description: '',
		hidden: true,
	});
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');

	const load = async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT };
			if (keyword) params.keyword = keyword;
			if (hiddenFilter !== '') params.hidden = hiddenFilter;
			const data = await api.get('/position-types', token, params);
			setTypes(data.results);
			setTotal(data.count);
		} catch (err) {
			setError(err.message);
		}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, [page, keyword, hiddenFilter]);

	const openCreate = () => {
		setForm({ name: '', description: '', hidden: true });
		setFormError('');
		setModal('create');
	};

	const openEdit = (pt) => {
		setForm({
			name: pt.name,
			description: pt.description,
			hidden: pt.hidden,
		});
		setFormError('');
		setModal(pt);
	};

	const handleSave = async () => {
		setFormError('');
		if (!form.name.trim()) {
			setFormError('Name is required.');
			return;
		}
		if (!form.description.trim()) {
			setFormError('Description is required.');
			return;
		}
		setSaving(true);
		try {
			if (modal === 'create') {
				await api.post(
					'/position-types',
					{
						name: form.name,
						description: form.description,
						hidden: form.hidden,
					},
					token,
				);
			} else {
				await api.patch(
					`/position-types/${modal.id}`,
					{
						name: form.name,
						description: form.description,
						hidden: form.hidden,
					},
					token,
				);
			}
			setModal(null);
			await load();
		} catch (err) {
			setFormError(err.message || 'Save failed.');
		} finally {
			setSaving(false);
		}
	};

	const toggleHidden = async (pt) => {
		setActing(pt.id);
		setError('');
		try {
			await api.patch(
				`/position-types/${pt.id}`,
				{ hidden: !pt.hidden },
				token,
			);
			await load();
		} catch (err) {
			setError(err.message);
		} finally {
			setActing(null);
		}
	};

	const handleDelete = async (pt) => {
		if (!confirm(`Delete "${pt.name}"? This cannot be undone.`)) return;
		setActing(pt.id);
		setError('');
		try {
			await api.delete(`/position-types/${pt.id}`, token);
			await load();
		} catch (err) {
			setError(
				err.message ||
					'Cannot delete — position type may have qualified users.',
			);
		} finally {
			setActing(null);
		}
	};

	return (
		<AppLayout>
			<div className='page-header flex-between'>
				<div>
					<h1 className='page-title'>Position Types</h1>
					<p className='page-subtitle'>
						Create and manage position types for job postings.
					</p>
				</div>
				<button
					className='btn btn-primary'
					style={{ width: 'auto', padding: '9px 20px' }}
					onClick={openCreate}
				>
					+ New Position Type
				</button>
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
					placeholder='Search name or description…'
					value={keyword}
					onChange={(e) => {
						setKeyword(e.target.value);
						setPage(1);
					}}
					style={{ flex: 1, minWidth: 200 }}
				/>
				<select
					value={hiddenFilter}
					onChange={(e) => {
						setHiddenFilter(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>All visibility</option>
					<option value='false'>Visible</option>
					<option value='true'>Hidden</option>
				</select>
			</div>

			{loading ? (
				<div className='loading'>Loading…</div>
			) : (
				<>
					{types.length === 0 ? (
						<div className='empty-state'>
							<h3>No position types found</h3>
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
										<th>Description</th>
										<th>Qualified Users</th>
										<th>Visibility</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{types.map((pt) => (
										<tr key={pt.id}>
											<td style={{ fontWeight: 500 }}>
												{pt.name}
											</td>
											<td
												className='text-muted'
												style={{
													maxWidth: 280,
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
												}}
											>
												{pt.description}
											</td>
											<td style={{ textAlign: 'center' }}>
												{pt.num_qualified ?? '—'}
											</td>
											<td>
												<span
													className={`badge badge-${pt.hidden ? 'expired' : 'open'}`}
												>
													{pt.hidden
														? 'Hidden'
														: 'Visible'}
												</span>
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
															openEdit(pt)
														}
													>
														Edit
													</button>
													<button
														className='btn btn-ghost'
														style={{
															padding: '3px 10px',
															fontSize: '0.78rem',
															color: pt.hidden
																? 'var(--success)'
																: 'var(--text-muted)',
														}}
														onClick={() =>
															toggleHidden(pt)
														}
														disabled={
															acting === pt.id
														}
													>
														{acting === pt.id
															? '…'
															: pt.hidden
																? 'Show'
																: 'Hide'}
													</button>
													<button
														className='btn btn-ghost'
														style={{
															padding: '3px 10px',
															fontSize: '0.78rem',
															color: 'var(--error)',
														}}
														onClick={() =>
															handleDelete(pt)
														}
														disabled={
															acting === pt.id
														}
													>
														Delete
													</button>
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

			{/* Create / Edit Modal */}
			{modal !== null && (
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
							maxWidth: 480,
							padding: 28,
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
								{modal === 'create'
									? 'Create Position Type'
									: `Edit: ${modal.name}`}
							</h3>
							<button
								onClick={() => setModal(null)}
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
						{formError && (
							<div
								className='alert alert-error'
								style={{ marginBottom: 14 }}
							>
								{formError}
							</div>
						)}
						<div className='form-group'>
							<label>Name</label>
							<input
								value={form.name}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										name: e.target.value,
									}))
								}
								placeholder='e.g. Dental Assistant'
							/>
						</div>
						<div className='form-group'>
							<label>Description</label>
							<textarea
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										description: e.target.value,
									}))
								}
								rows={3}
								style={{ resize: 'vertical' }}
								placeholder='Describe this position type…'
							/>
						</div>
						<div className='form-group'>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									textTransform: 'none',
									fontSize: '0.88rem',
									letterSpacing: 0,
									cursor: 'pointer',
								}}
							>
								<input
									type='checkbox'
									checked={form.hidden}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											hidden: e.target.checked,
										}))
									}
									style={{ width: 16, height: 16 }}
								/>
								Hidden (not visible to workers)
							</label>
						</div>
						<div style={{ display: 'flex', gap: 10 }}>
							<button
								className='btn btn-primary'
								style={{ flex: 1 }}
								onClick={handleSave}
								disabled={saving}
							>
								{saving
									? 'Saving…'
									: modal === 'create'
										? 'Create'
										: 'Save Changes'}
							</button>
							<button
								className='btn btn-ghost'
								style={{ flex: 1 }}
								onClick={() => setModal(null)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</AppLayout>
	);
}
