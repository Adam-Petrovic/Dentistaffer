import { Link } from 'react-router-dom';
/* AI FOR FILE (claude) */

function AuthLayout({ title, subtitle, children }) {
	return (
		<div className='auth-shell'>
			<div className='auth-brand'>
				<div className='auth-brand-logo'>Staffly</div>
				<h1 className='auth-brand-headline'>
					The right hire,
					<br />
					<em>right now.</em>
				</h1>
				<p className='auth-brand-sub'>
					A platform connecting qualified professionals with
					businesses that need temporary staffing — fast, transparent,
					and fair.
				</p>
				<div className='auth-brand-links'>
					<Link to='/businesses'>Browse Businesses</Link>
					<Link to='/login'>Sign In</Link>
					<Link to='/register'>Register</Link>
				</div>
			</div>
			<div className='auth-panel'>
				<div className='auth-form-wrap'>
					<h2 className='auth-form-title'>{title}</h2>
					{subtitle && (
						<p className='auth-form-subtitle'>{subtitle}</p>
					)}
					{children}
				</div>
			</div>
		</div>
	);
}

export default AuthLayout;
