import * as assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchGatusStatuses, resolveHealth } from '#lib/data/gatus';

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
