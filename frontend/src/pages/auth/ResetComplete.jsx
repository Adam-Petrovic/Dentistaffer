/* AI FOR FILE (claude) */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { completeReset } from '../../api/auth';

export default function ResetComplete() {
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const [token] = useState(params.get('token') || '');
	const [form, setForm] = useState({
		email: params.get('email') || '',
		manualToken: token,
		password: '',
		confirmPassword: '',
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		if (form.password !== form.confirmPassword) {
			setError('Passwords do not match.');
			return;
		}
		setLoading(true);
		try {
			await completeReset(form.manualToken, {
				email: form.email,
				password: form.password,
			});
			setSuccess(true);
		} catch (err) {
			if (err.status === 401)
				setError('Email does not match the token provided.');
			else if (err.status === 404)
				setError('Token not found or already used.');
			else if (err.status === 410)
				setError('Token has expired. Request a new one.');
			else setError(err.message || 'Reset failed.');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<AuthLayout
				title='Password updated!'
				subtitle='You can now sign in with your new password.'
			>
				<div className='alert alert-success'>
					Password successfully changed.
				</div>
				<button
					className='btn btn-primary'
					style={{ marginTop: 8 }}
					onClick={() => navigate('/login')}
				>
					Go to Sign In
				</button>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title='Set New Password'
			subtitle='Enter your reset token and new password.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div className='form-group'>
					<label>Email</label>
					<input
						type='email'
						value={form.email}
						onChange={set('email')}
						placeholder='your@email.com'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Reset Token</label>
					<input
						value={form.manualToken}
						onChange={set('manualToken')}
						placeholder='Paste token here'
						required
					/>
				</div>
				<div className='form-group'>
					<label>New Password</label>
					<input
						type='password'
						value={form.password}
						onChange={set('password')}
						placeholder='Min 8 chars, upper, lower, number, special'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Confirm Password</label>
					<input
						type='password'
						value={form.confirmPassword}
						onChange={set('confirmPassword')}
						placeholder='Re-enter new password'
						required
					/>
				</div>
				<button
					className='btn btn-primary'
					type='submit'
					disabled={loading}
				>
					{loading ? 'Updating…' : 'Update Password'}
				</button>
			</form>
			<div className='auth-switch'>
				<Link to='/reset'>Request a new token</Link> ·{' '}
				<Link to='/login'>Sign In</Link>
			</div>
		</AuthLayout>
	);
}
