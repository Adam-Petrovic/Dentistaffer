/* AI FOR FILE (claude) */

export default function Pagination({ page, total, limit, onPage }) {
	const totalPages = Math.ceil(total / limit) || 1;
	if (totalPages <= 1) return null;

	const pages = [];
	for (let i = 1; i <= totalPages; i++) {
		if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
			pages.push(i);
		} else if (pages[pages.length - 1] !== '...') {
			pages.push('...');
		}
	}

	return (
		<div className='pagination'>
			<span className='pagination-info'>
				{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{' '}
				{total}
			</span>
			<button
				onClick={() => onPage(page - 1)}
				disabled={page <= 1}
			>
				←
			</button>
			{pages.map((p, i) =>
				p === '...' ? (
					<span
						key={i}
						style={{ color: 'var(--text-dim)', padding: '0 4px' }}
					>
						…
					</span>
				) : (
					<button
						key={p}
						className={p === page ? 'active' : ''}
						onClick={() => onPage(p)}
					>
						{p}
					</button>
				),
			)}
			<button
				onClick={() => onPage(page + 1)}
				disabled={page >= totalPages}
			>
				→
			</button>
		</div>
	);
}
