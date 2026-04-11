/* AI FOR FILE (claude) */

import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
export function PrivateRoute({ children, allowedRoles }) {
	const { token, role, loading } = useAuth();
	if (loading) return null;
	if (!token)
		return (
			<Navigate
				to='/login'
				replace
			/>
		);
	if (allowedRoles && !allowedRoles.includes(role))
		return (
			<Navigate
				to='/login'
				replace
			/>
		);
	return children;
}

export function PublicOnlyRoute({ children }) {
	const { token, role, loading } = useAuth();
	if (loading) return null;
	if (token) {
		if (role === 'regular')
			return (
				<Navigate
					to='/dashboard'
					replace
				/>
			);
		if (role === 'business')
			return (
				<Navigate
					to='/business/dashboard'
					replace
				/>
			);
		return (
			<Navigate
				to='/admin/users'
				replace
			/>
		);
	}
	return children;
}
