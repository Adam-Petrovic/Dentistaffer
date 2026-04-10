import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export default function CreateJob() {
	const { token } = useAuth();
	const navigate = useNavigate();
	const [posTypes, setPosTypes] = useState([]);
	const [form, setForm] = useState({
		position_type_id: '',
		salary_min: '',
		salary_max: '',
		start_time: '',
		end_time: '',
		note: '',
	});
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		api.get('/position-types', token, { limit: 100 })
			.then((r) => setPosTypes(r.results))
			.catch(() => {});
	}, [token]);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async () => {
		setError('');
		if (!form.position_type_id) {
			setError('Please select a position type.');
			return;
		}
		if (!form.start_time || !form.end_time) {
			setError('Start and end time are required.');
			return;
		}
		if (parseFloat(form.salary_min) < 0) {
			setError('Salary must be >= 0.');
			return;
		}
		if (parseFloat(form.salary_max) < parseFloat(form.salary_min)) {
			setError('Max salary must be >= min salary.');
			return;
		}

		setSubmitting(true);
		try {
			const job = await api.post(
				'/businesses/me/jobs',
				{
					position_type_id: parseInt(form.position_type_id),
					salary_min: parseFloat(form.salary_min),
					salary_max: parseFloat(form.salary_max),
					start_time: new Date(form.start_time).toISOString(),
					end_time: new Date(form.end_time).toISOString(),
					note: form.note,
				},
				token,
			);
			navigate(`/business/jobs/${job.id}`);
		} catch (err) {
			setError(err.message || 'Failed to create job.');
		} finally {
			setSubmitting(false);
		}
	};

	// Helper: min datetime for inputs (now)
	const nowLocal = () => {
		const d = new Date();
		d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
		return d.toISOString().slice(0, 16);
	};

	return (
		<AppLayout>
			<div style={{ marginBottom: 16 }}>
				<button
					className='btn btn-ghost'
					style={{ padding: '6px 14px', fontSize: '0.83rem' }}
					onClick={() => navigate(-1)}
				>
					← Back
				</button>
			</div>

			<div className='page-header'>
				<h1 className='page-title'>Post a New Job</h1>
				<p className='page-subtitle'>
					Fill in the details below to create a new job posting.
				</p>
			</div>

			<div
				className='card'
				style={{ maxWidth: 600 }}
			>
				{error && (
					<div
						className='alert alert-error'
						style={{ marginBottom: 16 }}
					>
						{error}
					</div>
				)}

				<div className='form-group'>
					<label>Position Type</label>
					<select
						value={form.position_type_id}
						onChange={set('position_type_id')}
					>
						<option value=''>Select a position type…</option>
						{posTypes.map((pt) => (
							<option
								key={pt.id}
								value={pt.id}
							>
								{pt.name}
							</option>
						))}
					</select>
				</div>

				<div className='form-row'>
					<div className='form-group'>
						<label>Min Salary ($/hr)</label>
						<input
							type='number'
							min='0'
							step='0.01'
							value={form.salary_min}
							onChange={set('salary_min')}
							placeholder='e.g. 25'
						/>
					</div>
					<div className='form-group'>
						<label>Max Salary ($/hr)</label>
						<input
							type='number'
							min='0'
							step='0.01'
							value={form.salary_max}
							onChange={set('salary_max')}
							placeholder='e.g. 35'
						/>
					</div>
				</div>

				<div className='form-row'>
					<div className='form-group'>
						<label>Start Time</label>
						<input
							type='datetime-local'
							value={form.start_time}
							min={nowLocal()}
							onChange={set('start_time')}
						/>
					</div>
					<div className='form-group'>
						<label>End Time</label>
						<input
							type='datetime-local'
							value={form.end_time}
							min={form.start_time || nowLocal()}
							onChange={set('end_time')}
						/>
					</div>
				</div>

				<div className='form-group'>
					<label>
						Note <span style={{ fontWeight: 300 }}>(optional)</span>
					</label>
					<textarea
						value={form.note}
						onChange={set('note')}
						rows={3}
						style={{ resize: 'vertical' }}
						placeholder='Any additional information for applicants…'
					/>
				</div>

				<div style={{ display: 'flex', gap: 10 }}>
					<button
						className='btn btn-primary'
						style={{ flex: 1 }}
						onClick={handleSubmit}
						disabled={submitting}
					>
						{submitting ? 'Posting…' : 'Post Job'}
					</button>
					<button
						className='btn btn-ghost'
						style={{ flex: 1 }}
						onClick={() => navigate(-1)}
					>
						Cancel
					</button>
				</div>
			</div>
		</AppLayout>
	);
}
