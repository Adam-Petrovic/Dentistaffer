import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

function SettingCard({
	title,
	description,
	field,
	unit,
	value,
	setValue,
	onSave,
	saving,
	saved,
	error,
}) {
	return (
		<div
			className='card'
			style={{ marginBottom: 16 }}
		>
			<div className='card-title'>{title}</div>
			<p
				className='text-muted'
				style={{ fontSize: '0.87rem', marginBottom: 16 }}
			>
				{description}
			</p>
			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 12 }}
				>
					{error}
				</div>
			)}
			{saved && (
				<div
					className='alert alert-success'
					style={{ marginBottom: 12 }}
				>
					Saved successfully.
				</div>
			)}
			<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
				<div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
					<input
						type='number'
						min='1'
						step='1'
						value={value}
						onChange={(e) => setValue(e.target.value)}
						style={{
							width: '100%',
							background: 'var(--surface2)',
							border: '1px solid var(--border)',
							borderRadius: 4,
							color: 'var(--text)',
							fontFamily: 'DM Sans, sans-serif',
							fontSize: '0.93rem',
							padding: '10px 14px',
							outline: 'none',
						}}
						onFocus={(e) =>
							(e.target.style.borderColor = 'var(--accent)')
						}
						onBlur={(e) =>
							(e.target.style.borderColor = 'var(--border)')
						}
					/>
				</div>
				<span
					className='text-muted'
					style={{ fontSize: '0.85rem', minWidth: 60 }}
				>
					{unit}
				</span>
				<button
					className='btn btn-primary'
					style={{ width: 'auto', padding: '10px 20px' }}
					onClick={onSave}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	);
}

export default function AdminSettings() {
	const { token } = useAuth();

	const [settings, setSettings] = useState({
		reset_cooldown: { value: '60', saving: false, saved: false, error: '' },
		negotiation_window: {
			value: '600',
			saving: false,
			saved: false,
			error: '',
		},
		job_start_window: {
			value: '24',
			saving: false,
			saved: false,
			error: '',
		},
		availability_timeout: {
			value: '300',
			saving: false,
			saved: false,
			error: '',
		},
	});

	const update = (key, patch) =>
		setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

	const save = async (key, endpoint, payloadKey) => {
		const val = parseFloat(settings[key].value);
		if (isNaN(val) || val <= 0) {
			update(key, {
				error: 'Value must be greater than zero.',
				saved: false,
			});
			return;
		}
		update(key, { saving: true, error: '', saved: false });
		try {
			await api.patch(endpoint, { [payloadKey]: val }, token);
			update(key, { saving: false, saved: true, error: '' });
			setTimeout(() => update(key, { saved: false }), 3000);
		} catch (err) {
			update(key, {
				saving: false,
				error: err.message || 'Save failed.',
				saved: false,
			});
		}
	};

	const s = settings;

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>System Settings</h1>
				<p className='page-subtitle'>
					Configure platform-wide behaviour. Changes take effect
					immediately.
				</p>
			</div>

			<div style={{ maxWidth: 620 }}>
				<SettingCard
					title='Reset Cooldown'
					description='Minimum time between password reset token requests from the same IP address.'
					field='reset_cooldown'
					unit='seconds'
					value={s.reset_cooldown.value}
					setValue={(v) => update('reset_cooldown', { value: v })}
					onSave={() =>
						save(
							'reset_cooldown',
							'/system/reset-cooldown',
							'reset_cooldown',
						)
					}
					saving={s.reset_cooldown.saving}
					saved={s.reset_cooldown.saved}
					error={s.reset_cooldown.error}
				/>

				<SettingCard
					title='Negotiation Window'
					description='Duration of each negotiation session. Both parties must accept before this expires.'
					field='negotiation_window'
					unit='seconds'
					value={s.negotiation_window.value}
					setValue={(v) => update('negotiation_window', { value: v })}
					onSave={() =>
						save(
							'negotiation_window',
							'/system/negotiation-window',
							'negotiation_window',
						)
					}
					saving={s.negotiation_window.saving}
					saved={s.negotiation_window.saved}
					error={s.negotiation_window.error}
				/>

				<SettingCard
					title='Job Start Window'
					description="Maximum number of hours in the future a new job's start time can be set."
					field='job_start_window'
					unit='hours'
					value={s.job_start_window.value}
					setValue={(v) => update('job_start_window', { value: v })}
					onSave={() =>
						save(
							'job_start_window',
							'/system/job-start-window',
							'job_start_window',
						)
					}
					saving={s.job_start_window.saving}
					saved={s.job_start_window.saved}
					error={s.job_start_window.error}
				/>

				<SettingCard
					title='Availability Timeout'
					description='Time of inactivity after which a worker is automatically marked as unavailable.'
					field='availability_timeout'
					unit='seconds'
					value={s.availability_timeout.value}
					setValue={(v) =>
						update('availability_timeout', { value: v })
					}
					onSave={() =>
						save(
							'availability_timeout',
							'/system/availability-timeout',
							'availability_timeout',
						)
					}
					saving={s.availability_timeout.saving}
					saved={s.availability_timeout.saved}
					error={s.availability_timeout.error}
				/>
			</div>
		</AppLayout>
	);
}
