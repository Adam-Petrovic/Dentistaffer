const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(method, path, body, token) {
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw {
			status: res.status,
			message: data.error || data.message || 'Request failed',
		};
	return data;
}

export const api = {
	post: (path, body, token) => request('POST', path, body, token),
	patch: (path, body, token) => request('PATCH', path, body, token),
	get: (path, token) => request('GET', path, undefined, token),
};

// Auth-specific calls
export const registerUser = (data) => api.post('/users', data);
export const registerBusiness = (data) => api.post('/businesses', data);
export const login = (data) => api.post('/auth/tokens', data);
export const requestReset = (data) => api.post('/auth/resets', data);
export const completeReset = (token, data) =>
	api.post(`/auth/resets/${token}`, data);
