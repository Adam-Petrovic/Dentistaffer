/* AI FOR FILE (claude) */
import { useState, useRef } from 'react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function WorkerProfile() {
	const { token, user, setUser } = useAuth();
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [saveErr, setSaveErr] = useState('');
	const avatarRef = useRef();
	const resumeRef = useRef();
	const [uploading, setUploading] = useState('');

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const startEdit = () => {
		setForm({
			first_name: user.first_name || '',
			last_name: user.last_name || '',
			phone_number: user.phone_number || '',
			postal_address: user.postal_address || '',
			birthday: user.birthday || '',
			biography: user.biography || '',
		});
		setSaveMsg('');
		setSaveErr('');
		setEditing(true);
	};

	const handleSave = async () => {
		setSaving(true);
		setSaveErr('');
		setSaveMsg('');
		try {
			const updated = await api.patch('/users/me', form, token);
			setUser((u) => ({ ...u, ...updated }));
			setSaveMsg('Profile updated.');
			setEditing(false);
		} catch (err) {
			setSaveErr(err.message || 'Save failed.');
		} finally {
			setSaving(false);
		}
	};

	const handleUpload = async (type, file) => {
		if (!file) return;
		setUploading(type);
		try {
			const path =
				type === 'avatar' ? '/users/me/avatar' : '/users/me/resume';
			const res = await api.upload(path, file, token);
			setUser((u) => ({ ...u, [type]: res[type] }));
		} catch (err) {
			alert(err.message || 'Upload failed.');
		} finally {
			setUploading('');
		}
	};

	if (!user)
		return (
			<AppLayout>
				<div className='loading'>Loading…</div>
			</AppLayout>
		);

	return (
		<AppLayout>
			<div className='page-header flex-between'>
				<div>
					<h1 className='page-title'>My Profile</h1>
					<p className='page-subtitle'>
						Manage your personal information and documents.
					</p>
				</div>
				{!editing && (
					<button
						className='btn btn-ghost'
						style={{ padding: '8px 20px' }}
						onClick={startEdit}
					>
						Edit Profile
					</button>
				)}
			</div>

			{saveMsg && (
				<div
					className='alert alert-success'
					style={{ marginBottom: 16 }}
				>
					{saveMsg}
				</div>
			)}

			<div
				className='grid-2'
				style={{ alignItems: 'start' }}
			>
				{/* Left: avatar + documents */}
				<div>
					<div
						className='card'
						style={{ marginBottom: 16 }}
					>
						<div className='card-title'>Avatar</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 20,
							}}
						>
							{user.avatar ? (
								<img
									src={`${BASE}${user.avatar}`}
									alt='avatar'
									className='avatar'
								/>
							) : (
								<div className='avatar-placeholder'>
									{(user.first_name || '?')[0]}
								</div>
							)}
							<div>
								<input
									ref={avatarRef}
									type='file'
									accept='image/png,image/jpeg'
									style={{ display: 'none' }}
									onChange={(e) =>
										handleUpload(
											'avatar',
											e.target.files[0],
										)
									}
								/>
								<button
									className='btn btn-ghost'
									style={{
										padding: '7px 16px',
										fontSize: '0.83rem',
									}}
									onClick={() => avatarRef.current.click()}
									disabled={uploading === 'avatar'}
								>
									{uploading === 'avatar'
										? 'Uploading…'
										: 'Upload Photo'}
								</button>
								<p
									className='text-muted mt-8'
									style={{ fontSize: '0.78rem' }}
								>
									PNG or JPEG only
								</p>
							</div>
						</div>
					</div>

					<div
						className='card'
						style={{ marginBottom: 16 }}
					>
						<div className='card-title'>Resume</div>
						{user.resume ? (
							<a
								href={`${BASE}${user.resume}`}
								target='_blank'
								rel='noreferrer'
								style={{
									fontSize: '0.87rem',
									color: 'var(--accent)',
								}}
							>
								View current resume ↗
							</a>
						) : (
							<p
								className='text-muted'
								style={{ fontSize: '0.87rem' }}
							>
								No resume uploaded.
							</p>
						)}
						<input
							ref={resumeRef}
							type='file'
							accept='application/pdf'
							style={{ display: 'none' }}
							onChange={(e) =>
								handleUpload('resume', e.target.files[0])
							}
						/>
						<button
							className='btn btn-ghost'
							style={{
								padding: '7px 16px',
								fontSize: '0.83rem',
								marginTop: 12,
							}}
							onClick={() => resumeRef.current.click()}
							disabled={uploading === 'resume'}
						>
							{uploading === 'resume'
								? 'Uploading…'
								: user.resume
									? 'Replace Resume'
									: 'Upload Resume'}
						</button>
						<p
							className='text-muted mt-8'
							style={{ fontSize: '0.78rem' }}
						>
							PDF only
						</p>
					</div>

					<div className='card'>
						<div className='card-title'>Account Info</div>
						<InfoRow
							label='Email'
							value={user.email}
						/>
						<InfoRow
							label='Role'
							value={user.role}
						/>
						<InfoRow
							label='Status'
							value={
								<span
									className={`badge badge-${user.suspended ? 'canceled' : 'open'}`}
								>
									{user.suspended ? 'Suspended' : 'Active'}
								</span>
							}
						/>
						<InfoRow
							label='Available'
							value={
								<span
									className={`badge badge-${user.available ? 'open' : 'expired'}`}
								>
									{user.available
										? 'Available'
										: 'Unavailable'}
								</span>
							}
						/>
						<InfoRow
							label='Member since'
							value={new Date(
								user.createdAt,
							).toLocaleDateString()}
						/>
					</div>
				</div>

				{/* Right: editable info */}
				<div className='card'>
					<div className='card-title'>
						{editing ? 'Edit Information' : 'Personal Information'}
					</div>
					{saveErr && (
						<div
							className='alert alert-error'
							style={{ marginBottom: 16 }}
						>
							{saveErr}
						</div>
					)}

					{editing ? (
						<>
							<div className='form-row'>
								<div className='form-group'>
									<label>First Name</label>
									<input
										value={form.first_name}
										onChange={set('first_name')}
									/>
								</div>
								<div className='form-group'>
									<label>Last Name</label>
									<input
										value={form.last_name}
										onChange={set('last_name')}
									/>
								</div>
							</div>
							<div className='form-group'>
								<label>Phone</label>
								<input
									value={form.phone_number}
									onChange={set('phone_number')}
									placeholder='416-555-0100'
								/>
							</div>
							<div className='form-group'>
								<label>Postal Address</label>
								<input
									value={form.postal_address}
									onChange={set('postal_address')}
									placeholder='123 Main St, Toronto'
								/>
							</div>
							<div className='form-group'>
								<label>Birthday</label>
								<input
									type='date'
									value={form.birthday}
									onChange={set('birthday')}
								/>
							</div>
							<div className='form-group'>
								<label>Biography</label>
								<textarea
									value={form.biography}
									onChange={set('biography')}
									rows={4}
									style={{ resize: 'vertical' }}
									placeholder='Tell businesses about yourself…'
								/>
							</div>
							<div
								style={{
									display: 'flex',
									gap: 10,
									marginTop: 8,
								}}
							>
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
								label='Name'
								value={`${user.first_name} ${user.last_name}`}
							/>
							<InfoRow
								label='Phone'
								value={user.phone_number || '—'}
							/>
							<InfoRow
								label='Address'
								value={user.postal_address || '—'}
							/>
							<InfoRow
								label='Birthday'
								value={user.birthday || '—'}
							/>
							<div style={{ marginTop: 16 }}>
								<div
									style={{
										fontSize: '0.72rem',
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.08em',
										color: 'var(--text-muted)',
										marginBottom: 8,
									}}
								>
									Biography
								</div>
								<p
									style={{
										fontSize: '0.9rem',
										color: user.biography
											? 'var(--text)'
											: 'var(--text-dim)',
										lineHeight: 1.7,
									}}
								>
									{user.biography ||
										'No biography yet. Click Edit Profile to add one.'}
								</p>
							</div>
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
