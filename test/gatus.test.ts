import * as assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchGatusSnapshot, fetchGatusStatuses, resolveDetail, resolveHealth } from '#lib/data/gatus';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('fetchGatusStatuses', () => {
	it('maps healthy, down, and empty-result endpoints using latest probe result', async () => {
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify([
					{
						name: 'Authentik',
						group: 'Identity',
						key: 'identity_authentik',
						results: [
							{ success: false, duration: 100, timestamp: '2026-11-13T10:00:00Z' },
							{ success: true, duration: 42, timestamp: '2026-11-13T10:03:00Z' }
						]
					},
					{
						name: 'Home Assistant',
						group: 'Apps',
						key: 'apps_home-assistant',
						results: [{ success: false, duration: 500, timestamp: '2026-11-13T10:03:00Z' }]
					},
					{
						name: 'Pending Probe',
						group: 'Infra',
						key: 'infra_pending',
						results: []
					}
				]),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)) as typeof fetch;

		const map = await fetchGatusStatuses();
		assert.ok(map !== null);
		assert.equal(map.authentik, 'healthy');
		assert.equal(map.identity_authentik, 'healthy');
		assert.equal(map.homeassistant, 'down');
		assert.equal(map['home assistant'], 'down');
		assert.equal(map['apps_home-assistant'], 'down');
		assert.equal(map.pendingprobe, 'unknown');
	});

	it('returns null on non-2xx HTTP status so caller retains stale map', async () => {
		globalThis.fetch = (async () => new Response('Bad Gateway', { status: 502 })) as typeof fetch;
		const map = await fetchGatusStatuses();
		assert.equal(map, null);
	});

	it('returns null when network request rejects or aborts', async () => {
		globalThis.fetch = (async () => {
			throw new DOMException('The operation was aborted', 'TimeoutError');
		}) as typeof fetch;
		const map = await fetchGatusStatuses();
		assert.equal(map, null);
	});

	it('rejects non-array JSON bodies and skips malformed array entries without throwing', async () => {
		for (const invalidBody of ['{}', 'null', '"text"', '42']) {
			globalThis.fetch = (async () =>
				new Response(invalidBody, { status: 200 })) as typeof fetch;
			assert.equal(await fetchGatusStatuses(), null);
		}

		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify([
					null,
					42,
					{ name: 123 },
					{ name: 'No Results Field', group: 'Test', key: '' },
					{ name: 'Malformed Results', group: 'Test', key: 'bad_res', results: 'invalid' },
					{
						name: 'Grafana',
						group: 'Infra',
						key: 'infra_grafana',
						results: [{ success: true, duration: 15, timestamp: '2026-11-13T10:00:00Z' }]
					}
				]),
				{ status: 200 }
			)) as typeof fetch;

		const map = await fetchGatusStatuses();
		assert.ok(map !== null);
		assert.equal(map.noresultsfield, 'unknown');
		assert.equal(map.malformedresults, 'unknown');
		assert.equal(map.grafana, 'healthy');
	});
});

describe('resolveHealth', () => {
	it('prioritizes explicit gatusEndpoint over normalized id and raw id, defaulting to unknown', () => {
		const healthMap = {
			custom_key: 'healthy' as const,
			myservice: 'down' as const,
			'raw-id': 'degraded' as const
		};

		assert.equal(
			resolveHealth({ id: 'my-service', gatusEndpoint: 'custom_key' }, healthMap),
			'healthy'
		);
		assert.equal(resolveHealth({ id: 'my-service' }, healthMap), 'down');
		assert.equal(resolveHealth({ id: 'raw-id' }, { 'raw-id': 'degraded' }), 'degraded');
		assert.equal(resolveHealth({ id: 'unlisted' }, healthMap), 'unknown');
	});
});

describe('fetchGatusSnapshot', () => {
	const NS = 1e6;
	function respondWith(endpoints: unknown) {
		globalThis.fetch = (async () => new Response(JSON.stringify(endpoints), { status: 200 })) as typeof fetch;
	}

	it('reports response time, check time and history of a healthy endpoint', async () => {
		respondWith([
			{
				name: 'Grafana',
				key: 'infra_grafana',
				results: [
					{ success: false, duration: 5 * NS, timestamp: '2026-11-13T10:00:00Z' },
					{ success: true, duration: 83.4 * NS, timestamp: '2026-11-13T10:03:00Z' }
				]
			}
		]);
		const snapshot = await fetchGatusSnapshot();
		assert.ok(snapshot);
		assert.deepEqual(snapshot.details.grafana, {
			name: 'Grafana',
			status: 'healthy',
			history: [false, true],
			checkedAt: '2026-11-13T10:03:00Z',
			responseMs: 83
		});
		assert.equal(snapshot.details.infra_grafana, snapshot.details.grafana);
		assert.equal(snapshot.statuses.grafana, 'healthy');
	});

	it('gives the reason and start of the current failing run', async () => {
		respondWith([
			{
				name: 'Paperless',
				results: [
					{ success: true, duration: NS, timestamp: '2026-11-13T10:00:00Z' },
					{
						success: false, duration: NS, timestamp: '2026-11-13T10:03:00Z',
						conditionResults: [{ condition: '[STATUS] (502) == 200', success: false }]
					},
					{
						success: false, duration: NS, timestamp: '2026-11-13T10:06:00Z',
						errors: ['dial tcp: connection refused'],
						conditionResults: [
							{ condition: '[CONNECTED] == true', success: false },
							{ condition: '[RESPONSE_TIME] < 3000', success: true }
						]
					}
				]
			},
			{
				name: 'Conditions Only',
				results: [
					{
						success: false, duration: NS, timestamp: '2026-11-13T10:06:00Z',
						conditionResults: [
							{ condition: '[STATUS] (503) == 200', success: false },
							{ condition: '[BODY].ok == true', success: false },
							{ condition: '[RESPONSE_TIME] < 3000', success: true }
						]
					}
				]
			}
		]);
		const snapshot = await fetchGatusSnapshot();
		assert.ok(snapshot);
		const paperless = snapshot.details.paperless;
		assert.equal(paperless.status, 'down');
		assert.equal(paperless.reason, 'dial tcp: connection refused');
		assert.equal(paperless.downSince, '2026-11-13T10:03:00Z');
		assert.deepEqual(paperless.history, [true, false, false]);

		// Every result in the window failed: the run started before it.
		const conditionsOnly = snapshot.details.conditionsonly;
		assert.equal(conditionsOnly.reason, '[STATUS] (503) == 200; [BODY].ok == true');
		assert.equal(conditionsOnly.downSince, undefined);
	});

	it('keeps the last 20 results, truncates long reasons and ignores malformed fields', async () => {
		const results = Array.from({ length: 30 }, (_, i) => ({
			success: i % 2 === 0, duration: NS, timestamp: `2026-11-13T10:${String(i).padStart(2, '0')}:00Z`
		}));
		respondWith([
			{ name: 'Long History', results },
			{
				name: 'Odd Fields',
				results: [
					null,
					{ success: 'yes' },
					{ success: false, duration: 'slow', timestamp: 'not a date', errors: ['x'.repeat(500), 7] }
				]
			}
		]);
		const snapshot = await fetchGatusSnapshot();
		assert.ok(snapshot);
		assert.equal(snapshot.details.longhistory.history.length, 20);
		assert.equal(snapshot.details.longhistory.history.at(-1), false);

		const odd = snapshot.details.oddfields;
		assert.equal(odd.status, 'down');
		assert.deepEqual(odd.history, [false]);
		assert.equal(odd.responseMs, undefined);
		assert.equal(odd.checkedAt, undefined);
		assert.equal(odd.reason?.length, 160);
		assert.ok(odd.reason?.endsWith('…'));
	});

	it('returns null when Gatus is unreachable', async () => {
		globalThis.fetch = (async () => new Response('', { status: 502 })) as typeof fetch;
		assert.equal(await fetchGatusSnapshot(), null);
	});
});

describe('resolveDetail', () => {
	it('finds a service by its configured endpoint, then by id', () => {
		const grafana = { name: 'Grafana', status: 'healthy' as const, history: [true] };
		assert.equal(resolveDetail({ id: 'monitoring', gatusEndpoint: 'Grafana' }, { grafana }), grafana);
		assert.equal(resolveDetail({ id: 'grafana' }, { grafana }), grafana);
		assert.equal(resolveDetail({ id: 'other' }, { grafana }), undefined);
	});
});
