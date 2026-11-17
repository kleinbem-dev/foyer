/** The parts of `document` a poller needs; tests pass a stand-in. */
export interface VisibilitySource {
	readonly hidden: boolean;
	addEventListener(type: 'visibilitychange', listener: () => void): void;
	removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/**
 * Calls `load` now, every `intervalMs`, and when the page becomes visible again; never while it is
 * hidden and never twice at once. Each poller owns its requests: the returned stop function aborts
 * the one in flight and drops its result, and a new poller starts fetching at once.
 */
export function startPolling<T>(
	load: (signal: AbortSignal) => Promise<T>,
	onResult: (value: T) => void,
	intervalMs: number,
	doc: VisibilitySource = document
): () => void {
	const controller = new AbortController();
	let inFlight = false;

	async function refresh() {
		if (inFlight || doc.hidden || controller.signal.aborted) return;
		inFlight = true;
		try {
			const value = await load(controller.signal);
			if (!controller.signal.aborted) onResult(value);
		} catch {
			// The loaders report failure through their result; a throw only skips this round.
		} finally {
			inFlight = false;
		}
	}

	const onVisibilityChange = () => {
		if (!doc.hidden) refresh();
	};

	refresh();
	const interval = setInterval(refresh, intervalMs);
	doc.addEventListener('visibilitychange', onVisibilityChange);
	return () => {
		controller.abort();
		clearInterval(interval);
		doc.removeEventListener('visibilitychange', onVisibilityChange);
	};
}
