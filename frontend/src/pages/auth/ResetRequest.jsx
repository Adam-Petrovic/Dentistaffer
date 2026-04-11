/* AI FOR FILE (claude) */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { requestReset } from '../../api/auth';

export default function ResetRequest() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const data = await requestReset({ email });
			setResult(data);
		} catch (err) {
			if (err.status === 404)
				setError('No account found with that email address.');
			else if (err.status === 429)
				setError('Too many requests. Please wait before trying again.');
			else setError(err.message || 'Failed to send reset token.');
		} finally {
			setLoading(false);
		}
	};

	if (result) {
		return (
			<AuthLayout
				title='Token issued'
				subtitle='Use this token to reset your password.'
			>
				<div className='alert alert-info'>
					Token expires on{' '}
					{new Date(result.expiresAt).toLocaleString()}.
				</div>
				<p
					style={{
						fontSize: '0.85rem',
						color: 'var(--text-muted)',
						marginBottom: 8,
					}}
				>
					Your reset token:
				</p>
				<div className='token-box'>{result.resetToken}</div>
				<button
					className='btn btn-primary'
					style={{ marginTop: 16 }}
					onClick={() =>
						navigate(
							`/reset/complete?token=${result.resetToken}&email=${encodeURIComponent(email)}`,
						)
					}
				>
					Reset Password
				</button>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title='Reset Password'
			subtitle='Enter your email to receive a reset token.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div className='form-group'>
					<label>Email</label>
					<input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder='your@email.com'
						required
					/>
				</div>
				<button
					className='btn btn-primary'
					type='submit'
					disabled={loading}
				>
					{loading ? 'Sending…' : 'Request Reset Token'}
				</button>
			</form>
			<div className='auth-switch'>
				<Link to='/login'>Back to Sign In</Link>
			</div>
		</AuthLayout>
	);
}
