import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import toast from 'react-hot-toast';

const LIMIT = 10;

export default function Jobs() {
	const { token } = useAuth();
	const navigate = useNavigate();
	const [jobs, setJobs] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [sort, setSort] = useState('start_time');
	const [order, setOrder] = useState('asc');
	const [posTypeId, setPosTypeId] = useState('');
	const [posTypes, setPosTypes] = useState([]);
	const [useLocation, setUseLocation] = useState(false);
	const [coords, setCoords] = useState(null);
	const [locError, setLocError] = useState('');

	useEffect(() => {
		api.get('/position-types', token, { limit: 100 })
			.then((r) => setPosTypes(r.results))
			.catch(() => {});
	}, [token]);

	useEffect(() => {
		loadJobs();
	}, [page, sort, order, posTypeId, coords]);

	const loadJobs = async () => {
		setLoading(true);
		try {
			const params = { page, limit: LIMIT, sort, order };
			if (posTypeId) params.position_type_id = posTypeId;

			if (coords) {
				params.lat = coords.lat;
				params.lon = coords.lon;
			}

			const data = await api.get('/jobs', token, params);
			setJobs(data.results);
			setTotal(data.count);
		} catch {}
		setLoading(false);
	};

	const handleJobClick = async (jobId) => {
		try {
			const params = { page, limit: LIMIT, sort, order };

			if (coords) {
				params.lat = coords.lat;
				params.lon = coords.lon;
			}

			const response = await api.get(`/jobs/${jobId}`, token, params);
			console.log(response);
			if (response.error) {
				throw new Error();
			}

			navigate(`/jobs/${jobId}`);
		} catch (err) {
			toast.error('You are not qualified for this job!');
		}
	};

	const getLocation = () => {
		setLocError('');
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoords({
					lat: pos.coords.latitude,
					lon: pos.coords.longitude,
				});
				setUseLocation(true);
				if (sort === 'distance' || sort === 'eta') return;
			},
			() => setLocError('Could not get location.'),
		);
	};

	const clearLocation = () => {
		setCoords(null);
		setUseLocation(false);
		if (sort === 'distance' || sort === 'eta') setSort('start_time');
	};

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Available Jobs</h1>
				<p className='page-subtitle'>
					Browse open positions you qualify for.
				</p>
			</div>

			<div className='filters'>
				<select
					value={posTypeId}
					onChange={(e) => {
						setPosTypeId(e.target.value);
						setPage(1);
					}}
				>
					<option value=''>All Position Types</option>
					{posTypes.map((pt) => (
						<option
							key={pt.id}
							value={pt.id}
						>
							{pt.name}
						</option>
					))}
				</select>
				<select
					value={sort}
					onChange={(e) => {
						setSort(e.target.value);
						setPage(1);
					}}
				>
					<option value='start_time'>Sort: Start Time</option>
					<option value='salary_min'>Sort: Min Salary</option>
					<option value='salary_max'>Sort: Max Salary</option>
					<option value='updatedAt'>Sort: Recently Updated</option>
					{coords && <option value='distance'>Sort: Distance</option>}
					{coords && <option value='eta'>Sort: ETA</option>}
				</select>
				<select
					value={order}
					onChange={(e) => {
						setOrder(e.target.value);
						setPage(1);
					}}
				>
					<option value='asc'>Ascending</option>
					<option value='desc'>Descending</option>
				</select>
				{!useLocation ? (
					<button
						className='btn btn-ghost'
						style={{ padding: '7px 14px', fontSize: '0.83rem' }}
						onClick={getLocation}
					>
						📍 Use My Location
					</button>
				) : (
					<button
						className='btn btn-ghost'
						style={{
							padding: '7px 14px',
							fontSize: '0.83rem',
							color: 'var(--accent)',
						}}
						onClick={clearLocation}
					>
						📍 Location On — Clear
					</button>
				)}
				{locError && (
					<span
						style={{ color: 'var(--error)', fontSize: '0.83rem' }}
					>
						{locError}
					</span>
				)}
			</div>

			{loading ? (
				<div className='loading'>Loading jobs…</div>
			) : (
				<>
					{jobs.length === 0 ? (
						<div className='empty-state'>
							<h3>No jobs available</h3>
							<p>
								Check back later or make sure you have approved
								qualifications.
							</p>
						</div>
					) : (
						<div
							className='card'
							style={{ padding: 0, overflow: 'hidden' }}
						>
							<table className='data-table'>
								<thead>
									<tr>
										<th>Position</th>
										<th>Business</th>
										<th>Salary</th>
										<th>Start</th>
										<th>End</th>
										{coords && <th>Distance</th>}
										<th></th>
									</tr>
								</thead>
								<tbody>
									{jobs.map((job) => (
										<tr
											key={job.id}
											className='clickable'
											onClick={() =>
												handleJobClick(job.id)
											}
										>
											<td>
												<div
													style={{ fontWeight: 500 }}
												>
													{job.position_type?.name}
												</div>
											</td>
											<td className='text-muted'>
												{job.business?.business_name}
											</td>
											<td
												style={{
													color: 'var(--accent)',
												}}
											>
												${job.salary_min}–$
												{job.salary_max}/hr
											</td>
											<td className='text-muted'>
												{formatDate(job.start_time)}
											</td>
											<td className='text-muted'>
												{formatDate(job.end_time)}
											</td>
											{coords && (
												<td className='text-muted'>
													{job.distance != null
														? `${job.distance.toFixed(1)} km · ${job.eta} min`
														: '—'}
												</td>
											)}
											<td>
												<span
													className={`badge badge-${job.status}`}
												>
													{job.status}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					<Pagination
						page={page}
						total={total}
						limit={LIMIT}
						onPage={setPage}
					/>
				</>
			)}
		</AppLayout>
	);
}

function formatDate(iso) {
	return new Date(iso).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
