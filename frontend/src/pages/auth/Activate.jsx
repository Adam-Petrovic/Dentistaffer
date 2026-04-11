/* AI FOR FILE (claude) */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { completeReset } from '../../api/auth';

export default function Activate() {
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const [email, setEmail] = useState(params.get('email') || '');
	const [manualToken, setManualToken] = useState(params.get('token') || '');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		setError('');
		setLoading(true);
		try {
			await completeReset(manualToken, { email });
			setSuccess(true);
		} catch (err) {
			if (err.status === 401)
				setError('Email does not match the token provided.');
			else if (err.status === 404)
				setError('Token not found or already used.');
			else if (err.status === 410)
				setError('Token has expired. Request a new one.');
			else setError(err.message || 'Activation failed.');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<AuthLayout
				title='Account activated!'
				subtitle='You can now sign in.'
			>
				<div className='alert alert-success'>
					Your account is active. Welcome aboard.
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
			title='Activate Account'
			subtitle='Enter your email and activation token.'
		>
			{error && <div className='alert alert-error'>{error}</div>}
			<div className='form-group'>
				<label>Email</label>
				<input
					type='email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder='your@email.com'
				/>
			</div>
			<div className='form-group'>
				<label>Activation Token</label>
				<input
					value={manualToken}
					onChange={(e) => setManualToken(e.target.value)}
					placeholder='Paste token here'
				/>
			</div>
			<button
				className='btn btn-primary'
				onClick={handleSubmit}
				disabled={loading}
			>
				{loading ? 'Activating…' : 'Activate Account'}
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
