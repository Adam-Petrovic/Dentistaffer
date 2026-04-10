import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { login } from '../../api/auth';
import { api } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
	const navigate = useNavigate();
	const { loginUser } = useAuth();
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const { token } = await login(form);
			let userData;
			try {
				userData = await api.get('/users/me', token);
				console.log('users/me response:', userData);
			} catch (err) {
				console.log('users/me failed:', err);
				try {
					userData = await api.get('/businesses/me', token);
					console.log('businesses/me response:', userData);
				} catch (err2) {
					console.log('businesses/me failed:', err2);
					userData = { role: 'admin', email: form.email };
				}
			}
			loginUser(token, userData);
			if (userData.role === 'regular') navigate('/dashboard');
			else if (userData.role === 'business')
				navigate('/business/dashboard');
			else navigate('/admin/users');
		} catch (err) {
			if (err.status === 403) {
				setError(
					'Account not activated. Use your activation link or reset your password.',
				);
			} else {
				setError(err.message || 'Invalid credentials.');
			}
		} finally {
			setLoading(false);
		}
	};
	return (
		<AuthLayout
			title='Welcome back'
			subtitle='Sign in to your account to continue.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div className='form-group'>
					<label>Email</label>
					<input
						type='email'
						value={form.email}
						onChange={set('email')}
						placeholder='you@example.com'
						required
					/>
				</div>
				<div className='form-group'>
					<label>Password</label>
					<input
						type='password'
						value={form.password}
						onChange={set('password')}
						placeholder='••••••••'
						required
					/>
				</div>
				<button
					className='btn btn-primary'
					type='submit'
					disabled={loading}
				>
					{loading ? 'Signing in…' : 'Sign In'}
				</button>
			</form>
			<div className='auth-switch'>
				<Link to='/reset'>Forgot password?</Link>
			</div>
			<div className='auth-divider'>or</div>
			<div className='auth-switch'>
				Don't have an account?{' '}
				<Link to='/register'>Register as a worker</Link> or{' '}
				<Link to='/register/business'>register as a business</Link>.
			</div>
		</AuthLayout>
	);
}
