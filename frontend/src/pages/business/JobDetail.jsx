import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const LIMIT = 10;

export default function BusinessJobDetail() {
	const { jobId } = useParams();
	const { token } = useAuth();
	const navigate = useNavigate();

	const [job, setJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Tabs: detail | candidates | interests
	const [tab, setTab] = useState('detail');

	// Edit state
	const [editing, setEditing] = useState(false);
	const [editForm, setEditForm] = useState({});
	const [saving, setSaving] = useState(false);

	// Candidates
	const [candidates, setCandidates] = useState([]);
	const [candTotal, setCandTotal] = useState(0);
	const [candPage, setCandPage] = useState(1);
	const [candLoading, setCandLoading] = useState(false);
	const [selectedCandidate, setSelectedCandidate] = useState(null);

	// Interests
	const [interests, setInterests] = useState([]);
	const [intTotal, setIntTotal] = useState(0);
	const [intPage, setIntPage] = useState(1);
	const [intLoading, setIntLoading] = useState(false);

	// Actions
	const [acting, setActing] = useState(null);

	useEffect(() => {
		loadJob();
	}, [jobId]);
	useEffect(() => {
		if (tab === 'candidates') loadCandidates();
	}, [tab, candPage]);
	useEffect(() => {
		if (tab === 'interests') loadInterests();
	}, [tab, intPage]);

	const loadJob = async () => {
		setLoading(true);
		try {
			const data = await api
				.get(`/businesses/me/jobs/${jobId}`, token)
				.catch(() => api.get(`/jobs/${jobId}`, token));
			setJob(data);
		} catch (err) {
			setError(err.message || 'Job not found.');
		}
		setLoading(false);
	};

	const loadCandidates = async () => {
		setCandLoading(true);
		try {
			const data = await api.get(`/jobs/${jobId}/candidates`, token, {
				page: candPage,
				limit: LIMIT,
			});
			setCandidates(data.results);
			setCandTotal(data.count);
		} catch {}
		setCandLoading(false);
	};

	const loadInterests = async () => {
		setIntLoading(true);
		try {
			const data = await api.get(`/jobs/${jobId}/interests`, token, {
				page: intPage,
				limit: LIMIT,
			});

			setInterests(data.results);
			setIntTotal(data.count);
		} catch {}
		setIntLoading(false);
	};

	const startEdit = () => {
		setEditForm({
			salary_min: job.salary_min,
			salary_max: job.salary_max,
			start_time: toLocalInput(job.start_time),
			end_time: toLocalInput(job.end_time),
			note: job.note || '',
		});
		setEditing(true);
	};

	const handleSave = async () => {
		setSaving(true);
		setError('');
		try {
			const updated = await api.patch(
				`/businesses/me/jobs/${jobId}`,
				{
					salary_min: parseFloat(editForm.salary_min),
					salary_max: parseFloat(editForm.salary_max),
					start_time: new Date(editForm.start_time).toISOString(),
					end_time: new Date(editForm.end_time).toISOString(),
					note: editForm.note,
				},
				token,
			);
			setJob((j) => ({ ...j, ...updated }));
			setEditing(false);
		} catch (err) {
			setError(err.message || 'Could not save changes.');
		} finally {
			setSaving(false);
		}
	};

	const handleInvite = async (userId, interested) => {
		setActing(userId);
		try {
			await api.patch(
				`/jobs/${jobId}/candidates/${userId}/interested`,
				{ interested },
				token,
			);
			await loadCandidates();
			if (selectedCandidate?.user?.id === userId) {
				const detail = await api.get(
					`/jobs/${jobId}/candidates/${userId}`,
					token,
				);
				setSelectedCandidate(detail);
			}
		} catch (err) {
			setError(err.message || 'Action failed.');
		} finally {
			setActing(null);
		}
	};

	const handleNegotiate = async (interestId) => {
		setActing(interestId);
		try {
			await api.post('/negotiations', { interest_id: interestId }, token);
			navigate('/negotiation');
		} catch (err) {
			setError(err.message || 'Could not start negotiation.');
			setActing(null);
		}
	};

	const handleNoShow = async () => {
		if (!confirm('Mark worker as no-show? They will be suspended.')) return;
		setActing('noshow');
		try {
			await api.patch(`/jobs/${jobId}/no-show`, {}, token);
			await loadJob();
		} catch (err) {
			setError(err.message || 'Could not mark no-show.');
		} finally {
			setActing(null);
		}
	};

	const openCandidateDetail = async (userId) => {
		try {
			const detail = await api.get(
				`/jobs/${jobId}/candidates/${userId}`,
				token,
			);
			setSelectedCandidate(detail);
		} catch (err) {
			setError(err.message);
		}
	};

	if (loading)
		return (
			<AppLayout>
				<div className='loading'>Loading…</div>
			</AppLayout>
		);
	if (!job && error)
		return (
			<AppLayout>
				<div className='alert alert-error'>{error}</div>
			</AppLayout>
		);

	const isOpen = job?.status === 'open';
	const isFilled = job?.status === 'filled';
	const now = new Date();
	const started = job && new Date(job.start_time) <= now;
	const ended = job && new Date(job.end_time) <= now;
	const canNoShow = isFilled && started && !ended;

	return (
		<AppLayout>
			<div style={{ marginBottom: 16 }}>
				<button
					className='btn btn-ghost'
					style={{ padding: '6px 14px', fontSize: '0.83rem' }}
					onClick={() => navigate('/business/jobs')}
				>
					← Back to Jobs
				</button>
			</div>

			<div className='page-header flex-between'>
				<div>
					<h1 className='page-title'>{job.position_type?.name}</h1>
					<p className='page-subtitle'>
						{job.business?.business_name || 'Your Business'}
					</p>
				</div>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<span
						className={`badge badge-${job.status}`}
						style={{ fontSize: '0.85rem', padding: '5px 14px' }}
					>
						{job.status}
					</span>
					{isOpen && !editing && (
						<button
							className='btn btn-ghost'
							style={{ padding: '7px 16px', fontSize: '0.83rem' }}
							onClick={startEdit}
						>
							Edit
						</button>
					)}
					{canNoShow && (
						<button
							className='btn btn-ghost'
							style={{
								padding: '7px 16px',
								fontSize: '0.83rem',
								color: 'var(--error)',
								borderColor: 'var(--error)',
							}}
							onClick={handleNoShow}
							disabled={acting === 'noshow'}
						>
							{acting === 'noshow' ? '…' : 'Mark No-Show'}
						</button>
					)}
				</div>
			</div>

			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 16 }}
				>
					{error}
				</div>
			)}

			{/* Tabs */}
			<div
				style={{
					display: 'flex',
					gap: 2,
					borderBottom: '1px solid var(--border)',
					marginBottom: 24,
				}}
			>
				{['detail', 'candidates', 'interests'].map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						style={{
							padding: '9px 20px',
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontFamily: 'DM Sans, sans-serif',
							fontWeight: 600,
							fontSize: '0.85rem',
							color:
								tab === t
									? 'var(--accent)'
									: 'var(--text-muted)',
							borderBottom:
								tab === t
									? '2px solid var(--accent)'
									: '2px solid transparent',
							marginBottom: -1,
							transition: 'color 0.15s',
							textTransform: 'capitalize',
						}}
					>
						{t}
					</button>
				))}
			</div>

			{/* Detail Tab */}
			{tab === 'detail' && (
				<div
					className='grid-2'
					style={{ alignItems: 'start' }}
				>
					<div className='card'>
						<div className='card-title'>
							{editing ? 'Edit Job' : 'Job Details'}
						</div>
						{editing ? (
							<>
								<div className='form-row'>
									<div className='form-group'>
										<label>Min Salary ($/hr)</label>
										<input
											type='number'
											min='0'
											step='0.01'
											value={editForm.salary_min}
											onChange={(e) =>
												setEditForm((f) => ({
													...f,
													salary_min: e.target.value,
												}))
											}
										/>
									</div>
									<div className='form-group'>
										<label>Max Salary ($/hr)</label>
										<input
											type='number'
											min='0'
											step='0.01'
											value={editForm.salary_max}
											onChange={(e) =>
												setEditForm((f) => ({
													...f,
													salary_max: e.target.value,
												}))
											}
										/>
									</div>
								</div>
								<div className='form-row'>
									<div className='form-group'>
										<label>Start Time</label>
										<input
											type='datetime-local'
											value={editForm.start_time}
											onChange={(e) =>
												setEditForm((f) => ({
													...f,
													start_time: e.target.value,
												}))
											}
										/>
									</div>
									<div className='form-group'>
										<label>End Time</label>
										<input
											type='datetime-local'
											value={editForm.end_time}
											onChange={(e) =>
												setEditForm((f) => ({
													...f,
													end_time: e.target.value,
												}))
											}
										/>
									</div>
								</div>
								<div className='form-group'>
									<label>Note</label>
									<textarea
										value={editForm.note}
										rows={3}
										style={{ resize: 'vertical' }}
										onChange={(e) =>
											setEditForm((f) => ({
												...f,
												note: e.target.value,
											}))
										}
									/>
								</div>
								<div style={{ display: 'flex', gap: 10 }}>
									<button
										className='btn btn-primary'
										style={{ flex: 1 }}
										onClick={handleSave}
										disabled={saving}
									>
										{saving ? 'Saving…' : 'Save Changes'}
									</button>
									<button
										className='btn btn-ghost'
										style={{ flex: 1 }}
										onClick={() => setEditing(false)}
									>
										Cancel
									</button>
								</div>
							</>
						) : (
							<>
								<InfoRow
									label='Salary'
									value={
										<span
											style={{ color: 'var(--accent)' }}
										>
											${job.salary_min} – $
											{job.salary_max}/hr
										</span>
									}
								/>
								<InfoRow
									label='Start'
									value={new Date(
										job.start_time,
									).toLocaleString()}
								/>
								<InfoRow
									label='End'
									value={new Date(
										job.end_time,
									).toLocaleString()}
								/>
								<InfoRow
									label='Status'
									value={
										<span
											className={`badge badge-${job.status}`}
										>
											{job.status}
										</span>
									}
								/>
								<InfoRow
									label='Updated'
									value={new Date(
										job.updatedAt,
									).toLocaleString()}
								/>
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
											Note
										</div>
										<p
											style={{
												fontSize: '0.9rem',
												lineHeight: 1.6,
											}}
										>
											{job.note}
										</p>
									</div>
								)}
							</>
						)}
					</div>

					{isFilled && job.worker && (
						<div className='card'>
							<div className='card-title'>Filled By</div>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 14,
								}}
							>
								<div
									className='avatar-placeholder'
									style={{
										width: 48,
										height: 48,
										fontSize: '1rem',
									}}
								>
									{job.worker.first_name?.[0]}
								</div>
								<div>
									<div style={{ fontWeight: 600 }}>
										{job.worker.first_name}{' '}
										{job.worker.last_name}
									</div>
									{canNoShow && (
										<div
											className='text-muted'
											style={{
												fontSize: '0.83rem',
												marginTop: 2,
											}}
										>
											Job is currently in progress
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Candidates Tab */}
			{tab === 'candidates' && (
				<div>
					{candLoading ? (
						<div className='loading'>Loading candidates…</div>
					) : candidates.length === 0 ? (
						<div className='empty-state'>
							<h3>No discoverable candidates</h3>
							<p>
								Candidates appear when qualified, available
								workers exist for this position.
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
										<th>Name</th>
										<th>Invited</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{candidates.map((c) => (
										<tr key={c.id}>
											<td style={{ fontWeight: 500 }}>
												{c.first_name} {c.last_name}
											</td>
											<td>
												{c.invited ? (
													<span className='badge badge-approved'>
														Invited
													</span>
												) : (
													<span className='badge badge-created'>
														Not Invited
													</span>
												)}
											</td>
											<td>
												<div
													style={{
														display: 'flex',
														gap: 8,
													}}
												>
													<button
														className='btn btn-ghost'
														style={{
															padding: '3px 10px',
															fontSize: '0.78rem',
														}}
														onClick={() =>
															openCandidateDetail(
																c.id,
															)
														}
													>
														View
													</button>
													{isOpen &&
														(c.invited ? (
															<button
																className='btn btn-ghost'
																style={{
																	padding:
																		'3px 10px',
																	fontSize:
																		'0.78rem',
																	color: 'var(--error)',
																}}
																onClick={() =>
																	handleInvite(
																		c.id,
																		false,
																	)
																}
																disabled={
																	acting ===
																	c.id
																}
															>
																{acting === c.id
																	? '…'
																	: 'Uninvite'}
															</button>
														) : (
															<button
																className='btn btn-ghost'
																style={{
																	padding:
																		'3px 10px',
																	fontSize:
																		'0.78rem',
																	color: 'var(--accent)',
																}}
																onClick={() =>
																	handleInvite(
																		c.id,
																		true,
																	)
																}
																disabled={
																	acting ===
																	c.id
																}
															>
																{acting === c.id
																	? '…'
																	: 'Invite'}
															</button>
														))}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<Pagination
						page={candPage}
						total={candTotal}
						limit={LIMIT}
						onPage={setCandPage}
					/>
				</div>
			)}

			{/* Interests Tab */}
			{tab === 'interests' && (
				<div>
					{intLoading ? (
						<div className='loading'>Loading…</div>
					) : interests.length === 0 ? (
						<div className='empty-state'>
							<h3>No interested candidates yet</h3>
						</div>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
							}}
						>
							{interests.map(
								({ interest_id, mutual, user: u }) => (
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
										<div className='flex-between'>
											<div
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: 12,
												}}
											>
												<div
													className='avatar-placeholder'
													style={{
														width: 40,
														height: 40,
														fontSize: '0.9rem',
													}}
												>
													{u.first_name?.[0]}
												</div>
												<div>
													<div
														style={{
															fontWeight: 600,
														}}
													>
														{u.first_name}{' '}
														{u.last_name}
													</div>
													<div
														style={{ marginTop: 4 }}
													>
														{mutual ? (
															<span className='badge badge-mutual'>
																Mutual Interest
															</span>
														) : (
															<span
																className='text-muted'
																style={{
																	fontSize:
																		'0.82rem',
																}}
															>
																Awaiting your
																interest
															</span>
														)}
													</div>
												</div>
											</div>
											<div
												style={{
													display: 'flex',
													gap: 8,
												}}
											>
												<button
													className='btn btn-ghost'
													style={{
														padding: '5px 12px',
														fontSize: '0.82rem',
													}}
													onClick={() =>
														openCandidateDetail(
															u.id,
														)
													}
												>
													View Profile
												</button>
												{mutual && isOpen && (
													<button
														className='btn btn-primary'
														style={{
															padding: '5px 14px',
															fontSize: '0.82rem',
														}}
														onClick={() =>
															handleNegotiate(
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
											</div>
										</div>
									</div>
								),
							)}
						</div>
					)}
					<Pagination
						page={intPage}
						total={intTotal}
						limit={LIMIT}
						onPage={setIntPage}
					/>
				</div>
			)}

			{/* Candidate Detail Modal */}
			{selectedCandidate && (
				<CandidateModal
					data={selectedCandidate}
					jobId={jobId}
					isOpen={isOpen}
					acting={acting}
					onInvite={handleInvite}
					onClose={() => setSelectedCandidate(null)}
				/>
			)}
		</AppLayout>
	);
}

function CandidateModal({ data, jobId, isOpen, acting, onInvite, onClose }) {
	const { user, job } = data;
	const qual = user?.qualification;
	const isInvited = data.invited;

	return (
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
						{user.first_name} {user.last_name}
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

				<div
					style={{
						display: 'flex',
						gap: 16,
						alignItems: 'flex-start',
						marginBottom: 20,
					}}
				>
					{user.avatar ? (
						<img
							src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`}
							alt=''
							className='avatar'
							style={{ width: 56, height: 56 }}
						/>
					) : (
						<div
							className='avatar-placeholder'
							style={{ width: 56, height: 56 }}
						>
							{user.first_name?.[0]}
						</div>
					)}
					<div>
						{user.biography && (
							<p
								style={{
									fontSize: '0.88rem',
									color: 'var(--text-muted)',
									lineHeight: 1.6,
								}}
							>
								{user.biography}
							</p>
						)}
						{user.resume && (
							<a
								href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.resume}`}
								target='_blank'
								rel='noreferrer'
								style={{
									fontSize: '0.83rem',
									color: 'var(--accent)',
									display: 'block',
									marginTop: 6,
								}}
							>
								View Resume ↗
							</a>
						)}
					</div>
				</div>

				{qual && (
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
								marginBottom: 8,
							}}
						>
							Qualification — {job?.position_type?.name}
						</div>
						{qual.note && (
							<p style={{ fontSize: '0.87rem', marginBottom: 8 }}>
								{qual.note}
							</p>
						)}
						{qual.document && (
							<a
								href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${qual.document}`}
								target='_blank'
								rel='noreferrer'
								style={{
									fontSize: '0.83rem',
									color: 'var(--accent)',
								}}
							>
								View Qualification Document ↗
							</a>
						)}
					</div>
				)}

				{isOpen && (
					<button
						className={
							isInvited ? 'btn btn-ghost' : 'btn btn-primary'
						}
						style={{
							width: '100%',
							...(isInvited
								? {
										color: 'var(--error)',
										borderColor: 'var(--error)',
									}
								: {}),
						}}
						onClick={() => onInvite(user.id, !isInvited)}
						disabled={acting === user.id}
					>
						{acting === user.id
							? '…'
							: isInvited
								? 'Withdraw Invitation'
								: 'Invite Candidate'}
					</button>
				)}
			</div>
		</div>
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
			<span style={{ fontSize: '0.9rem' }}>{value}</span>
		</div>
	);
}

function toLocalInput(iso) {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
}
