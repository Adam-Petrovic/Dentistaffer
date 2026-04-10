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

async function upload(path, file, token) {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${BASE}${path}`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw {
			status: res.status,
			message: data.error || data.message || 'Upload failed',
		};
	return data;
}

export const api = {
	get: (path, token, params) => {
		const url = params ? `${path}?${new URLSearchParams(params)}` : path;
		return request('GET', url, undefined, token);
	},
	post: (path, body, token) => request('POST', path, body, token),
	patch: (path, body, token) => request('PATCH', path, body, token),
	delete: (path, token) => request('DELETE', path, undefined, token),
	upload: (path, file, token) => upload(path, file, token),
};
