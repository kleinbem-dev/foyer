import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { startPolling, type VisibilitySource } from '#lib/poll';

function fakeDocument(hidden = false) {
	const listeners = new Set<() => void>();
	const doc = {
		hidden,
		addEventListener: (_type: 'visibilitychange', l: () => void) => void listeners.add(l),
		removeEventListener: (_type: 'visibilitychange', l: () => void) => void listeners.delete(l)
	};
	return {
		doc: doc as VisibilitySource,
		listeners,
		show() {
			doc.hidden = false;
			for (const l of listeners) l();
		},
		hide() {
			doc.hidden = true;
			for (const l of listeners) l();
		}
	};
}

/** A loader whose requests stay pending until the test settles them. */
function deferredLoader() {
	const calls: Array<{ signal: AbortSignal; resolve: (value: string) => void }> = [];
	const load = (signal: AbortSignal) =>
		new Promise<string>((resolve) => {
			calls.push({ signal, resolve });
		});
	return { calls, load };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('startPolling', () => {
	it('loads at once, then on every interval, and stops when told', async () => {
		const { doc } = fakeDocument();
		const results: number[] = [];
		let n = 0;
		const stop = startPolling(async () => ++n, (v) => results.push(v), 15, doc);
		await settle();
		assert.deepEqual(results, [1]);

		await wait(80);
		assert.ok(results.length >= 3, `expected repeated loads, got ${results.length}`);

		stop();
		const seen = results.length;
		await wait(60);
		assert.equal(results.length, seen);
	});

	it('does not start a second request while one is in flight', async () => {
		const { doc, show } = fakeDocument();
		const { calls, load } = deferredLoader();
		const stop = startPolling(load, () => {}, 10, doc);
		await wait(50);
		show();
		assert.equal(calls.length, 1);

		calls[0].resolve('done');
		await wait(40);
		assert.ok(calls.length >= 2);
		stop();
	});

	it('a stopped poller aborts its request, drops the late result, and does not block its successor', async () => {
		const { doc } = fakeDocument();
		const first = deferredLoader();
		const second = deferredLoader();
		const results: string[] = [];

		const stopFirst = startPolling(first.load, (v) => results.push(v), 60_000, doc);
		stopFirst();
		assert.equal(first.calls[0].signal.aborted, true);

		// The successor fetches immediately although the first request has not settled.
		const stopSecond = startPolling(second.load, (v) => results.push(v), 60_000, doc);
		assert.equal(second.calls.length, 1);

		first.calls[0].resolve('stale');
		second.calls[0].resolve('fresh');
		await settle();
		assert.deepEqual(results, ['fresh']);
		stopSecond();
	});

	it('waits while the page is hidden and refreshes when it is shown again', async () => {
		const page = fakeDocument(true);
		const results: string[] = [];
		const stop = startPolling(async () => 'value', (v) => results.push(v), 60_000, page.doc);
		await settle();
		assert.deepEqual(results, []);

		page.show();
		await settle();
		assert.deepEqual(results, ['value']);

		page.hide();
		await settle();
		assert.deepEqual(results, ['value']);

		stop();
		assert.equal(page.listeners.size, 0);
		page.show();
		await settle();
		assert.deepEqual(results, ['value']);
	});

	it('survives a loader that throws', async () => {
		const { doc } = fakeDocument();
		const results: string[] = [];
		let fail = true;
		const stop = startPolling(
			async () => {
				if (fail) throw new Error('boom');
				return 'ok';
			},
			(v) => results.push(v),
			10,
			doc
		);
		await settle();
		assert.deepEqual(results, []);
		fail = false;
		await wait(50);
		assert.equal(results[0], 'ok');
		stop();
	});
});
