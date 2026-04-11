/* AI FOR FILE (claude) */
import { useState, useRef } from 'react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BusinessProfile() {
	const { token, user, setUser } = useAuth();
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [saving, setSaving] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');
	const [saveErr, setSaveErr] = useState('');
	const avatarRef = useRef();
	const [uploading, setUploading] = useState(false);
	const [locating, setLocating] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const startEdit = () => {
		setForm({
			business_name: user.business_name || '',
			owner_name: user.owner_name || '',
			phone_number: user.phone_number || '',
			postal_address: user.postal_address || '',
			biography: user.biography || '',
			lat: user.location?.lat?.toString() || '',
			lon: user.location?.lon?.toString() || '',
		});
		setSaveMsg('');
		setSaveErr('');
		setEditing(true);
	};

	const geolocate = () => {
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setForm((f) => ({
					...f,
					lat: pos.coords.latitude.toString(),
					lon: pos.coords.longitude.toString(),
				}));
				setLocating(false);
			},
			() => setLocating(false),
		);
	};

	const handleSave = async () => {
		setSaving(true);
		setSaveErr('');
		setSaveMsg('');
		try {
			const payload = {
				business_name: form.business_name,
				owner_name: form.owner_name,
				phone_number: form.phone_number,
				postal_address: form.postal_address,
				biography: form.biography,
			};
			if (form.lat && form.lon) {
				payload.location = {
					lat: parseFloat(form.lat),
					lon: parseFloat(form.lon),
				};
			}
			const updated = await api.patch('/businesses/me', payload, token);
			setUser((u) => ({
				...u,
				...updated,
				location: updated.location || u.location,
			}));
			setSaveMsg('Profile updated.');
			setEditing(false);
		} catch (err) {
			setSaveErr(err.message || 'Save failed.');
		} finally {
			setSaving(false);
		}
	};

	const handleAvatarUpload = async (file) => {
		if (!file) return;
		setUploading(true);
		try {
			const res = await api.upload('/businesses/me/avatar', file, token);
			setUser((u) => ({ ...u, avatar: res.avatar }));
		} catch (err) {
			alert(err.message || 'Upload failed.');
		} finally {
			setUploading(false);
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
					<h1 className='page-title'>Business Profile</h1>
					<p className='page-subtitle'>
						Manage your public business information.
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
				{/* Left: avatar + account info */}
				<div>
					<div
						className='card'
						style={{ marginBottom: 16 }}
					>
						<div className='card-title'>Logo / Avatar</div>
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
									{(user.business_name || '?')[0]}
								</div>
							)}
							<div>
								<input
									ref={avatarRef}
									type='file'
									accept='image/png,image/jpeg'
									style={{ display: 'none' }}
									onChange={(e) =>
										handleAvatarUpload(e.target.files[0])
									}
								/>
								<button
									className='btn btn-ghost'
									style={{
										padding: '7px 16px',
										fontSize: '0.83rem',
									}}
									onClick={() => avatarRef.current.click()}
									disabled={uploading}
								>
									{uploading ? 'Uploading…' : 'Upload Logo'}
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

					<div className='card'>
						<div className='card-title'>Account Status</div>
						<InfoRow
							label='Email'
							value={user.email}
						/>
						<InfoRow
							label='Verified'
							value={
								<span
									className={`badge badge-${user.verified ? 'approved' : 'expired'}`}
								>
									{user.verified
										? 'Verified'
										: 'Not Verified'}
								</span>
							}
						/>
						<InfoRow
							label='Activated'
							value={
								<span
									className={`badge badge-${user.activated ? 'open' : 'expired'}`}
								>
									{user.activated ? 'Active' : 'Inactive'}
								</span>
							}
						/>
						<InfoRow
							label='Member since'
							value={new Date(
								user.createdAt,
							).toLocaleDateString()}
						/>
						{user.location && (
							<InfoRow
								label='Location'
								value={`${user.location.lat?.toFixed(4)}, ${user.location.lon?.toFixed(4)}`}
							/>
						)}
					</div>
				</div>

				{/* Right: editable info */}
				<div className='card'>
					<div className='card-title'>
						{editing ? 'Edit Information' : 'Business Information'}
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
							<div className='form-group'>
								<label>Business Name</label>
								<input
									value={form.business_name}
									onChange={set('business_name')}
								/>
							</div>
							<div className='form-group'>
								<label>Owner Name</label>
								<input
									value={form.owner_name}
									onChange={set('owner_name')}
								/>
							</div>
							<div className='form-row'>
								<div className='form-group'>
									<label>Phone</label>
									<input
										value={form.phone_number}
										onChange={set('phone_number')}
									/>
								</div>
								<div className='form-group'>
									<label>Postal Address</label>
									<input
										value={form.postal_address}
										onChange={set('postal_address')}
									/>
								</div>
							</div>
							<div className='form-group'>
								<label>Biography</label>
								<textarea
									value={form.biography}
									onChange={set('biography')}
									rows={4}
									style={{ resize: 'vertical' }}
								/>
							</div>
							<div className='form-group'>
								<label>Location</label>
								<div
									className='form-row'
									style={{ marginBottom: 8 }}
								>
									<input
										type='number'
										step='any'
										value={form.lat}
										onChange={set('lat')}
										placeholder='Latitude'
									/>
									<input
										type='number'
										step='any'
										value={form.lon}
										onChange={set('lon')}
										placeholder='Longitude'
									/>
								</div>
								<button
									type='button'
									className='btn btn-ghost'
									style={{
										width: '100%',
										fontSize: '0.82rem',
									}}
									onClick={geolocate}
									disabled={locating}
								>
									{locating
										? 'Detecting…'
										: '📍 Use My Location'}
								</button>
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
								label='Business Name'
								value={user.business_name}
							/>
							<InfoRow
								label='Owner'
								value={user.owner_name}
							/>
							<InfoRow
								label='Phone'
								value={user.phone_number || '—'}
							/>
							<InfoRow
								label='Address'
								value={user.postal_address || '—'}
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
