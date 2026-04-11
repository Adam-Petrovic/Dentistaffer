/* AI FOR FILE (claude) */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, PublicOnlyRoute } from './components/RouteGuards';
import Login from './pages/auth/Login';
import RegisterUser from './pages/auth/RegisterUser';
import RegisterBusiness from './pages/auth/RegisterBusiness';
import Activate from './pages/auth/Activate';
import ResetRequest from './pages/auth/ResetRequest';
import ResetComplete from './pages/auth/ResetComplete';
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerProfile from './pages/worker/Profile';
import Qualifications from './pages/worker/Qualifications';
import Jobs from './pages/worker/Jobs';
import JobDetail from './pages/worker/JobDetail';
import Invitations from './pages/worker/Invitations';
import Interests from './pages/worker/Interests';
import BusinessDashboard from './pages/business/Dashboard';
import BusinessProfile from './pages/business/Profile';
import BusinessJobs from './pages/business/Jobs';
import CreateJob from './pages/business/CreateJob';
import BusinessJobDetail from './pages/business/JobDetail';
import Negotiation from './pages/negotiation/Negotiation';
import AdminUsers from './pages/admin/Users';
import AdminBusinesses from './pages/admin/Businesses';
import AdminPositionTypes from './pages/admin/PositionTypes';
import AdminQualifications from './pages/admin/Qualifications';
import AdminSettings from './pages/admin/Settings';

import { Toaster } from 'react-hot-toast';

const Placeholder = ({ label }) => (
	<div
		style={{
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: 'var(--text-muted)',
			flexDirection: 'column',
			gap: 12,
		}}
	>
		<h2
			style={{
				fontFamily: 'DM Serif Display, serif',
				fontSize: '2rem',
				color: 'var(--accent)',
			}}
		>
			{label}
		</h2>
		<p style={{ fontSize: '0.9rem' }}>Coming soon.</p>
	</div>
);

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Toaster />
				<Routes>
					<Route
						path='/login'
						element={
							<PublicOnlyRoute>
								<Login />
							</PublicOnlyRoute>
						}
					/>
					<Route
						path='/register'
						element={
							<PublicOnlyRoute>
								<RegisterUser />
							</PublicOnlyRoute>
						}
					/>
					<Route
						path='/register/business'
						element={
							<PublicOnlyRoute>
								<RegisterBusiness />
							</PublicOnlyRoute>
						}
					/>
					<Route
						path='/activate'
						element={<Activate />}
					/>
					<Route
						path='/reset'
						element={<ResetRequest />}
					/>
					<Route
						path='/reset/complete'
						element={<ResetComplete />}
					/>
					<Route
						path='/businesses'
						element={<Placeholder label='Browse Businesses' />}
					/>
					<Route
						path='/businesses/:id'
						element={<Placeholder label='Business Profile' />}
					/>
					<Route
						path='/dashboard'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<WorkerDashboard />
							</PrivateRoute>
						}
					/>
					<Route
						path='/profile'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<WorkerProfile />
							</PrivateRoute>
						}
					/>
					<Route
						path='/qualifications'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<Qualifications />
							</PrivateRoute>
						}
					/>
					<Route
						path='/jobs'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<Jobs />
							</PrivateRoute>
						}
					/>
					<Route
						path='/jobs/:jobId'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<JobDetail />
							</PrivateRoute>
						}
					/>
					<Route
						path='/invitations'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<Invitations />
							</PrivateRoute>
						}
					/>
					<Route
						path='/interests'
						element={
							<PrivateRoute allowedRoles={['regular']}>
								<Interests />
							</PrivateRoute>
						}
					/>
					<Route
						path='/negotiation'
						element={
							<PrivateRoute
								allowedRoles={['regular', 'business']}
							>
								<Negotiation />
							</PrivateRoute>
						}
					/>
					<Route
						path='/business/dashboard'
						element={
							<PrivateRoute allowedRoles={['business']}>
								<BusinessDashboard />
							</PrivateRoute>
						}
					/>
					<Route
						path='/business/profile'
						element={
							<PrivateRoute allowedRoles={['business']}>
								<BusinessProfile />
							</PrivateRoute>
						}
					/>
					<Route
						path='/business/jobs'
						element={
							<PrivateRoute allowedRoles={['business']}>
								<BusinessJobs />
							</PrivateRoute>
						}
					/>
					<Route
						path='/business/jobs/new'
						element={
							<PrivateRoute allowedRoles={['business']}>
								<CreateJob />
							</PrivateRoute>
						}
					/>
					<Route
						path='/business/jobs/:jobId'
						element={
							<PrivateRoute allowedRoles={['business']}>
								<BusinessJobDetail />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin/users'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<AdminUsers />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin/businesses'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<AdminBusinesses />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin/position-types'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<AdminPositionTypes />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin/qualifications'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<AdminQualifications />
							</PrivateRoute>
						}
					/>
					<Route
						path='/admin/settings'
						element={
							<PrivateRoute allowedRoles={['admin']}>
								<AdminSettings />
							</PrivateRoute>
						}
					/>
					<Route
						path='/'
						element={
							<Navigate
								to='/login'
								replace
							/>
						}
					/>
					<Route
						path='*'
						element={
							<Navigate
								to='/login'
								replace
							/>
						}
					/>
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
