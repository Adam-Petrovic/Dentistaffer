import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { registerUser } from '../../api/auth';

export default function RegisterUser() {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		phone_number: '',
		postal_address: '',
		birthday: '',
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(null);
	const [loading, setLoading] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const payload = { ...form };
			if (!payload.birthday) delete payload.birthday;
			const data = await registerUser(payload);
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
				title='Account created!'
				subtitle='Save your activation token below.'
			>
				<div className='alert alert-success'>
					Your account has been created. Use the token below to
					activate it.
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
					Activate regUser
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
			title='Join as a Worker'
			subtitle='Create your professional account.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div className='form-row'>
					<div className='form-group'>
						<label>First Name</label>
						<input
							value={form.first_name}
							onChange={set('first_name')}
							placeholder='Jane'
							required
						/>
					</div>
					<div className='form-group'>
						<label>Last Name</label>
						<input
							value={form.last_name}
							onChange={set('last_name')}
							placeholder='Doe'
							required
						/>
					</div>
				</div>
				<div className='form-group'>
					<label>Email</label>
					<input
						type='email'
						value={form.email}
						onChange={set('email')}
						placeholder='jane@example.com'
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
						<label>
							Phone{' '}
							<span style={{ fontWeight: 300 }}>(optional)</span>
						</label>
						<input
							value={form.phone_number}
							onChange={set('phone_number')}
							placeholder='416-555-0100'
						/>
					</div>
					<div className='form-group'>
						<label>
							Birthday{' '}
							<span style={{ fontWeight: 300 }}>(optional)</span>
						</label>
						<input
							type='date'
							value={form.birthday}
							onChange={set('birthday')}
						/>
					</div>
				</div>
				<div className='form-group'>
					<label>
						Postal Address{' '}
						<span style={{ fontWeight: 300 }}>(optional)</span>
					</label>
					<input
						value={form.postal_address}
						onChange={set('postal_address')}
						placeholder='123 Main St, Toronto, ON'
					/>
				</div>
				<button
					className='btn btn-primary'
					type='submit'
					disabled={loading}
				>
					{loading ? 'Creating account…' : 'Create Account'}
				</button>
			</form>
			<div className='auth-switch'>
				Already have an account? <Link to='/login'>Sign in</Link>
			</div>
			<div className='auth-switch'>
				Registering a business?{' '}
				<Link to='/register/business'>Business registration →</Link>
			</div>
		</AuthLayout>
	);
}
