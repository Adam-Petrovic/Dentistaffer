/* AI FOR FILE (claude) */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function useCountdown(expiresAt) {
	const [remaining, setRemaining] = useState(0);
	useEffect(() => {
		if (!expiresAt) return;
		const tick = () =>
			setRemaining(Math.max(0, new Date(expiresAt) - new Date()));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [expiresAt]);
	const mins = Math.floor(remaining / 60000);
	const secs = Math.floor((remaining % 60000) / 1000);
	const expired = remaining === 0 && !!expiresAt;
	return { mins, secs, expired, remaining };
}

export default function Negotiation() {
	const { token, role, user } = useAuth();
	const navigate = useNavigate();
	const [negotiation, setNegotiation] = useState(null);
	const [loading, setLoading] = useState(true);
	const [deciding, setDeciding] = useState(false);
	const [error, setError] = useState('');
	const [messages, setMessages] = useState([]);
	const [msgInput, setMsgInput] = useState('');
	const [socketConnected, setSocketConnected] = useState(false);
	const socketRef = useRef(null);
	const negRef = useRef(null);
	const messagesEndRef = useRef(null);
	const pollRef = useRef(null);

	const load = async () => {
		console.log('token:', token);
		console.log('role:', role);
		
			const data = await api.get('/negotiations/me', token);

			setNegotiation(data);
			console.log(data);
			negRef.current = data;
		// } catch (err) {
		// 	console.log(err);
		// 	console.log('hello');
		// 	if (err.status === 404) {
		// 		setNegotiation(null);
		// 		negRef.current = null;
		// 	}
		// }
		setLoading(false);
	};

	useEffect(() => {
		load();
		pollRef.current = setInterval(load, 5000);
		return () => clearInterval(pollRef.current);
	}, [token]);

	useEffect(() => {
		if (
			!negotiation ||
			negotiation.status !== 'active' ||
			socketRef.current
		)
			return;
		const socket = io(BASE, {
			auth: { token },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;
		socket.on('connect', () => setSocketConnected(true));
		socket.on('disconnect', () => setSocketConnected(false));
		socket.on('negotiation:message', (msg) => {
			setMessages((prev) => [...prev, msg]);
		});
		return () => {
			socket.disconnect();
			socketRef.current = null;
			setSocketConnected(false);
		};
	}, [negotiation?.id, negotiation?.status]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const sendMessage = () => {
		const text = msgInput.trim();
		if (!text || !socketRef.current || !negRef.current) return;
		socketRef.current.emit('negotiation:message', {
			negotiation_id: negRef.current.id,
			text,
		});
		setMsgInput('');
	};

	const handleDecision = async (decision) => {
		setDeciding(true);
		try {
			const updated = await api.patch(
				'/negotiations/me/decision',
				{ decision, negotiation_id: negotiation.id },
				token,
			);
			setNegotiation((n) => ({ ...n, ...updated }));
		} catch (err) {
			setError(err.message);
		}
		setDeciding(false);
	};

	const { mins, secs, expired, remaining } = useCountdown(
		negotiation?.expiresAt,
	);
	const totalDuration = negotiation
		? new Date(negotiation.expiresAt) - new Date(negotiation.createdAt)
		: 1;
	const pct = totalDuration > 0 ? remaining / totalDuration : 0;
	const R = 44;
	const C = 2 * Math.PI * R;

	if (loading)
		return (
			<AppLayout>
				<div className='loading'>Loading…</div>
			</AppLayout>
		);

	if (!negotiation)
		return (
			<AppLayout>
				<div className='page-header'>
					<h1 className='page-title'>Negotiation</h1>
				</div>
				<div className='empty-state'>
					<h3>No active negotiation</h3>
					<button
						className='btn btn-primary'
						style={{
							marginTop: 20,
							width: 'auto',
							padding: '10px 24px',
						}}
						onClick={() =>
							navigate(
								role === 'regular'
									? '/interests'
									: '/business/jobs',
							)
						}
					>
						{role === 'regular'
							? 'View My Interests'
							: 'View My Jobs'}
					</button>
				</div>
			</AppLayout>
		);

	const { status, decisions, job, user: candidate } = negotiation;
	const myDecision =
		role === 'regular' ? decisions?.candidate : decisions?.business;
	const otherDecision =
		role === 'regular' ? decisions?.business : decisions?.candidate;
	const otherLabel = role === 'regular' ? 'Business' : 'Candidate';
	const isActive = status === 'active' && !expired;

	return (
		<AppLayout>
			<div className='page-header'>
				<h1 className='page-title'>Negotiation</h1>
				<p className='page-subtitle'>
					{job.position_type?.name} · {job.business?.business_name}
				</p>
			</div>

			{error && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 12 }}
				>
					{error}
				</div>
			)}
			{status === 'success' && (
				<div
					className='alert alert-success'
					style={{ marginBottom: 12, fontWeight: 600 }}
				>
					🎉 Job filled successfully!
				</div>
			)}
			{status === 'failed' && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 12 }}
				>
					Negotiation failed.
				</div>
			)}
			{expired && status === 'active' && (
				<div
					className='alert alert-error'
					style={{ marginBottom: 12 }}
				>
					⏰ Negotiation expired.
				</div>
			)}

			{/* OUTER WRAPPER */}
			<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
				{/* LEFT SIDEBAR */}
				<div
					style={{
						width: 280,
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						gap: 14,
					}}
				>
					{/* Timer */}
					<div
						className='card'
						style={{ textAlign: 'center', padding: 18 }}
					>
						<p
							style={{
								fontSize: '0.72rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								color: 'var(--text-muted)',
								marginBottom: 12,
							}}
						>
							Time Remaining
						</p>
						<div
							style={{
								position: 'relative',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<svg
								width={100}
								height={100}
								style={{ transform: 'rotate(-90deg)' }}
							>
								<circle
									cx={50}
									cy={50}
									r={R}
									fill='none'
									stroke='var(--border)'
									strokeWidth={7}
								/>
								<circle
									cx={50}
									cy={50}
									r={R}
									fill='none'
									stroke={
										pct < 0.33
											? 'var(--error)'
											: 'var(--accent)'
									}
									strokeWidth={7}
									strokeDasharray={`${C * pct} ${C}`}
									strokeLinecap='round'
									style={{
										transition:
											'stroke-dasharray 1s linear',
									}}
								/>
							</svg>
							<div
								style={{
									position: 'absolute',
									fontFamily: 'DM Serif Display, serif',
									fontSize: expired ? '0.85rem' : '1.5rem',
									color:
										pct < 0.33
											? 'var(--error)'
											: 'var(--text)',
								}}
							>
								{expired
									? 'Done'
									: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
							</div>
						</div>
					</div>

					{/* Decisions */}
					<div
						className='card'
						style={{ padding: 16 }}
					>
						<p
							style={{
								fontSize: '0.72rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								color: 'var(--text-muted)',
								marginBottom: 10,
							}}
						>
							Decisions
						</p>
						<DecisionRow
							label='You'
							decision={myDecision}
						/>
						<DecisionRow
							label={otherLabel}
							decision={otherDecision}
						/>
						{isActive && !myDecision && (
							<div
								style={{
									display: 'flex',
									gap: 8,
									marginTop: 14,
								}}
							>
								<button
									onClick={() => handleDecision('accept')}
									disabled={deciding}
									style={{
										flex: 1,
										padding: '8px 0',
										borderRadius: 4,
										border: '1px solid rgba(82,192,122,0.5)',
										background: 'rgba(82,192,122,0.12)',
										color: '#52c07a',
										fontFamily: 'DM Sans,sans-serif',
										fontWeight: 700,
										fontSize: '0.82rem',
										cursor: 'pointer',
									}}
								>
									{deciding ? '…' : '✓ Accept'}
								</button>
								<button
									onClick={() => handleDecision('decline')}
									disabled={deciding}
									style={{
										flex: 1,
										padding: '8px 0',
										borderRadius: 4,
										border: '1px solid rgba(224,82,82,0.5)',
										background: 'rgba(224,82,82,0.08)',
										color: 'var(--error)',
										fontFamily: 'DM Sans,sans-serif',
										fontWeight: 700,
										fontSize: '0.82rem',
										cursor: 'pointer',
									}}
								>
									{deciding ? '…' : '✕ Decline'}
								</button>
							</div>
						)}
						{isActive && myDecision && (
							<p
								style={{
									fontSize: '0.78rem',
									color: 'var(--text-dim)',
									marginTop: 10,
									fontStyle: 'italic',
								}}
							>
								Waiting for {otherLabel.toLowerCase()}…
							</p>
						)}
					</div>

					{/* Job info */}
					<div
						className='card'
						style={{ padding: 16 }}
					>
						<p
							style={{
								fontSize: '0.72rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								color: 'var(--text-muted)',
								marginBottom: 10,
							}}
						>
							Job
						</p>
						<InfoRow
							label='Position'
							value={job.position_type?.name}
						/>
						<InfoRow
							label='Salary'
							value={
								<span style={{ color: 'var(--accent)' }}>
									${job.salary_min}–${job.salary_max}/hr
								</span>
							}
						/>
						<InfoRow
							label='Starts'
							value={new Date(
								job.start_time,
							).toLocaleDateString()}
						/>
					</div>

					{!isActive && (
						<button
							className='btn btn-primary'
							onClick={() =>
								navigate(
									role === 'regular'
										? '/interests'
										: '/business/jobs',
								)
							}
						>
							← Go Back
						</button>
					)}
				</div>

				{/* CHAT BOX */}
				<div
					style={{
						flex: 1,
						minWidth: 0,
						border: '1px solid var(--border)',
						borderRadius: 6,
						background: 'var(--surface)',
						display: 'flex',
						flexDirection: 'column',
						height: 560,
					}}
				>
					{/* Chat header */}
					<div
						style={{
							padding: '12px 18px',
							borderBottom: '1px solid var(--border)',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontFamily: 'DM Serif Display, serif',
								fontSize: '1rem',
							}}
						>
							Chat with {otherLabel}
						</span>
						<span
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								fontSize: '0.73rem',
								color: 'var(--text-muted)',
							}}
						>
							<span
								style={{
									width: 7,
									height: 7,
									borderRadius: '50%',
									background: socketConnected
										? '#52c07a'
										: '#555',
									display: 'inline-block',
								}}
							/>
							{socketConnected ? 'Connected' : 'Offline'}
						</span>
					</div>

					{/* Messages */}
					<div
						style={{
							flex: 1,
							overflowY: 'auto',
							padding: '14px 18px',
							display: 'flex',
							flexDirection: 'column',
							gap: 10,
						}}
					>
						{messages.length === 0 && (
							<div
								style={{
									margin: 'auto',
									textAlign: 'center',
									color: 'var(--text-dim)',
									fontSize: '0.85rem',
								}}
							>
								{isActive
									? 'No messages yet — say something!'
									: 'Chat unavailable.'}
							</div>
						)}
						{messages.map((msg, i) => {
							const isMe =
								String(msg.sender?.id) === String(user?.id);
							return (
								<div
									key={i}
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: isMe
											? 'flex-end'
											: 'flex-start',
									}}
								>
									<div
										style={{
											maxWidth: '70%',
											padding: '9px 14px',
											fontSize: '0.88rem',
											lineHeight: 1.5,
											wordBreak: 'break-word',
											background: isMe
												? 'rgba(232,197,71,0.15)'
												: 'var(--surface2)',
											border: `1px solid ${isMe ? 'rgba(232,197,71,0.3)' : 'var(--border)'}`,
											borderRadius: isMe
												? '12px 12px 2px 12px'
												: '12px 12px 12px 2px',
											color: 'var(--text)',
										}}
									>
										{msg.text}
									</div>
									<div
										style={{
											fontSize: '0.7rem',
											color: 'var(--text-dim)',
											marginTop: 3,
										}}
									>
										{isMe ? 'You' : otherLabel} ·{' '}
										{new Date(
											msg.createdAt,
										).toLocaleTimeString(undefined, {
											hour: '2-digit',
											minute: '2-digit',
										})}
									</div>
								</div>
							);
						})}
						<div ref={messagesEndRef} />
					</div>

					{/* Input bar — ALWAYS VISIBLE */}
					<div
						style={{
							padding: '10px 14px',
							borderTop: '1px solid var(--border)',
							display: 'flex',
							gap: 10,
							alignItems: 'center',
							flexShrink: 0,
							background: 'var(--surface2)',
						}}
					>
						<input
							type='text'
							value={msgInput}
							onChange={(e) => setMsgInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									sendMessage();
								}
							}}
							disabled={!isActive}
							placeholder={
								isActive
									? 'Type a message and press Enter…'
									: 'Negotiation is not active'
							}
							style={{
								flex: 1,
								background: 'var(--surface)',
								border: '1px solid var(--border)',
								borderRadius: 4,
								color: 'var(--text)',
								fontFamily: 'DM Sans, sans-serif',
								fontSize: '0.9rem',
								padding: '9px 13px',
								outline: 'none',
								opacity: isActive ? 1 : 0.5,
							}}
						/>
						<button
							onClick={sendMessage}
							disabled={!isActive || !msgInput.trim()}
							style={{
								padding: '9px 20px',
								borderRadius: 4,
								border: 'none',
								cursor:
									isActive && msgInput.trim()
										? 'pointer'
										: 'not-allowed',
								background:
									isActive && msgInput.trim()
										? 'var(--accent)'
										: 'var(--border)',
								color:
									isActive && msgInput.trim()
										? '#0f0f0f'
										: 'var(--text-dim)',
								fontFamily: 'DM Sans, sans-serif',
								fontWeight: 700,
								fontSize: '0.87rem',
								flexShrink: 0,
								transition: 'all 0.15s',
							}}
						>
							Send
						</button>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}

function DecisionRow({ label, decision }) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '7px 0',
				borderBottom: '1px solid var(--border)',
			}}
		>
			<span style={{ fontSize: '0.87rem', fontWeight: 500 }}>
				{label}
			</span>
			{decision == null ? (
				<span
					style={{
						fontSize: '0.75rem',
						color: 'var(--text-dim)',
						fontStyle: 'italic',
					}}
				>
					Pending…
				</span>
			) : decision === 'accept' ? (
				<span className='badge badge-approved'>✓ Accepted</span>
			) : (
				<span className='badge badge-rejected'>✕ Declined</span>
			)}
		</div>
	);
}

function InfoRow({ label, value }) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				padding: '6px 0',
				borderBottom: '1px solid var(--border)',
			}}
		>
			<span
				style={{
					fontSize: '0.72rem',
					fontWeight: 600,
					textTransform: 'uppercase',
					letterSpacing: '0.07em',
					color: 'var(--text-muted)',
				}}
			>
				{label}
			</span>
			<span style={{ fontSize: '0.84rem' }}>{value}</span>
		</div>
	);
}
