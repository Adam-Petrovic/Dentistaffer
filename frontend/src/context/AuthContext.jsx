/* AI FOR FILE (claude) */

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [token, setToken] = useState(() => localStorage.getItem('token'));
	const [user, setUser] = useState(null);
	const [role, setRole] = useState(() => localStorage.getItem('role'));
	const [loading, setLoading] = useState(!!localStorage.getItem('token'));

	useEffect(() => {
		if (!token) {
			setLoading(false);
			return;
		}
		// Fetch profile to confirm token validity & get role
		const fetchMe = async () => {
			try {
				const r = localStorage.getItem('role');
				let data;
				if (r === 'regular') data = await api.get('/users/me', token);
				else if (r === 'business')
					data = await api.get('/businesses/me', token);
				else {
					logout();
					return;
				}
				setUser(data);
				setRole(data.role);
			} catch {
				logout();
			} finally {
				setLoading(false);
			}
		};
		fetchMe();
	}, []);

	const loginUser = (tokenVal, userData) => {
		localStorage.setItem('token', tokenVal);
		localStorage.setItem('role', userData.role);
		setToken(tokenVal);
		setUser(userData);
		setRole(userData.role);
	};

	const logout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('role');
		setToken(null);
		setUser(null);
		setRole(null);
	};

	return (
		<AuthContext.Provider
			value={{ token, user, role, loading, loginUser, logout, setUser }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
