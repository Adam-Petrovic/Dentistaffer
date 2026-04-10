import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { registerBusiness } from '../../api/auth';

export default function RegisterBusiness() {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		business_name: '',
		owner_name: '',
		email: '',
		password: '',
		phone_number: '',
		postal_address: '',
		lon: '',
		lat: '',
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(null);
	const [loading, setLoading] = useState(false);
	const [locating, setLocating] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const geolocate = () => {
		if (!navigator.geolocation) return;
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

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		if (!form.lon || !form.lat) {
			setError('Location is required.');
			return;
		}
		setLoading(true);
		try {
			const data = await registerBusiness({
				business_name: form.business_name,
				owner_name: form.owner_name,
				email: form.email,
				password: form.password,
				phone_number: form.phone_number,
				postal_address: form.postal_address,
				location: {
					lon: parseFloat(form.lon),
					lat: parseFloat(form.lat),
				},
			});
			setSuccess(data);
		} catch (err) {
			if (err.status === 409)
				setError('An account with that email already exists.');
			else setError(err.message || 'Registration failed.');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<AuthLayout
				title='Business registered!'
				subtitle='Save your activation token below.'
			>
				<div className='alert alert-success'>
					Your business account has been created. An admin will verify
					your business after activation.
				</div>
				<p
					style={{
						fontSize: '0.85rem',
						color: 'var(--text-muted)',
						marginBottom: 8,
					}}
				>
					Activation token (expires{' '}
					{new Date(success.expiresAt).toLocaleDateString()}):
				</p>
				<div className='token-box'>{success.resetToken}</div>
				<button
					className='btn btn-primary'
					style={{ marginTop: 16 }}
					onClick={() =>
						navigate(
							`/activate?token=${success.resetToken}&email=${encodeURIComponent(success.email)}`,
						)
					}
				>
					Activate businessAc
				</button>
				<div
					className='auth-switch'
					style={{ marginTop: 16 }}
				>
					<Link to='/login'>Back to Sign In</Link>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title='Register Your Business'
			subtitle='Post jobs and find qualified staff.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div className='form-group'>
					<label>Business Name</label>
					<input
						value={form.business_name}
						onChange={set('business_name')}
						placeholder='Acme Dental Clinic'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Owner Name</label>
					<input
						value={form.owner_name}
						onChange={set('owner_name')}
						placeholder='Dr. Jane Smith'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Email</label>
					<input
						type='email'
						value={form.email}
						onChange={set('email')}
						placeholder='contact@yourbusiness.com'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Password</label>
					<input
						type='password'
						value={form.password}
						onChange={set('password')}
						placeholder='Min 8 chars, upper, lower, number, special'
						required
					/>
				</div>
				<div className='form-row'>
					<div className='form-group'>
						<label>Phone</label>
						<input
							value={form.phone_number}
							onChange={set('phone_number')}
							placeholder='416-555-0100'
							required
						/>
					</div>
					<div className='form-group'>
						<label>Postal Address</label>
						<input
							value={form.postal_address}
							onChange={set('postal_address')}
							placeholder='123 King St, Toronto'
							required
						/>
					</div>
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
							required
						/>
						<input
							type='number'
							step='any'
							value={form.lon}
							onChange={set('lon')}
							placeholder='Longitude'
							required
						/>
					</div>
					<button
						type='button'
						className='btn btn-ghost'
						style={{ width: '100%', fontSize: '0.82rem' }}
						onClick={geolocate}
						disabled={locating}
					>
						{locating ? 'Detecting…' : '📍 Use my current location'}
					</button>
				</div>
				<button
					className='btn btn-primary'
					type='submit'
					disabled={loading}
				>
					{loading ? 'Creating account…' : 'Create Business Account'}
				</button>
			</form>
			<div className='auth-switch'>
				Already have an account? <Link to='/login'>Sign in</Link>
			</div>
			<div className='auth-switch'>
				Registering as a worker?{' '}
				<Link to='/register'>Worker registration →</Link>
			</div>
		</AuthLayout>
	);
}
