import * as assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
	buildServiceAttention,
	fetchAttentionFeed,
	parseAttentionFeed,
	sortAttention
} from '#lib/data/attention';
import type { AttentionItem, EndpointDetail, ServiceItem } from '#lib/types';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('parseAttentionFeed', () => {
	it('accepts an items object or a bare array and fills defaults', () => {
		const wrapped = parseAttentionFeed({
			items: [{ title: ' Review  requested ', url: 'https://example.test/pr/1', source: 'GitHub', severity: 'warning' }]
		});
		assert.deepEqual(wrapped, [
			{
				id: 'feed:https://example.test/pr/1',
				title: 'Review requested',
				severity: 'warning',
				url: 'https://example.test/pr/1',
				detail: undefined,
				source: 'GitHub',
				updatedAt: undefined
			}
		]);
		assert.equal(parseAttentionFeed([{ title: 'Bare' }])[0].severity, 'info');
	});

	it('drops entries without a title, unsafe URLs, invalid times and duplicate ids', () => {
		const items = parseAttentionFeed([
			null,
			'text',
			{ url: 'https://example.test' },
			{ title: 'Script', url: 'javascript:alert(1)', updatedAt: 'yesterday', severity: 'fatal' },
			{ id: 'a', title: 'First', updatedAt: '2026-11-16T10:00:00Z' },
			{ id: 'a', title: 'Second' }
		]);
		assert.deepEqual(
			items.map((i) => [i.id, i.title, i.url, i.updatedAt, i.severity]),
			[
				['feed:Script', 'Script', undefined, undefined, 'info'],
				['feed:a', 'First', undefined, '2026-11-16T10:00:00Z', 'info']
			]
		);
	});

	it('returns nothing for a non-feed payload and caps the list at 50 items', () => {
		for (const bad of [null, 42, 'x', {}, { items: 'none' }]) assert.deepEqual(parseAttentionFeed(bad), []);
		const many = Array.from({ length: 80 }, (_, i) => ({ title: `Item ${i}` }));
		assert.equal(parseAttentionFeed(many).length, 50);
	});

	it('shortens overlong text', () => {
		const [item] = parseAttentionFeed([{ title: 't'.repeat(500), detail: 'd'.repeat(500) }]);
		assert.equal(item.title.length, 200);
		assert.equal(item.detail?.length, 300);
	});
});

describe('fetchAttentionFeed', () => {
	it('returns parsed items, and null when the feed is unreachable or not JSON', async () => {
		globalThis.fetch = (async () => new Response(JSON.stringify({ items: [{ title: 'One' }] }))) as typeof fetch;
		assert.equal((await fetchAttentionFeed('/attention.json'))?.[0].title, 'One');

		globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
		assert.equal(await fetchAttentionFeed('/attention.json'), null);

		globalThis.fetch = (async () => new Response('<html>login</html>')) as typeof fetch;
		assert.equal(await fetchAttentionFeed('/attention.json'), null);

		globalThis.fetch = (async () => {
			throw new TypeError('network');
		}) as typeof fetch;
		assert.equal(await fetchAttentionFeed('/attention.json'), null);
	});
});

describe('buildServiceAttention', () => {
	const service = (id: string, name: string): ServiceItem => ({
		id, name, category: 'Apps', icon: '📦', description: '', url: `https://${id}.example.test`, host: 'core-pi', network: 'mesh'
	});

	it('lists only services whose latest probe failed', () => {
		const details: Record<string, EndpointDetail> = {
			paperless: {
				name: 'Paperless', status: 'down', history: [true, false], reason: 'connection refused',
				checkedAt: '2026-11-16T10:06:00Z', downSince: '2026-11-16T10:03:00Z'
			},
			grafana: { name: 'Grafana', status: 'healthy', history: [true] },
			old: { name: 'Old', status: 'down', history: [false], checkedAt: '2026-11-16T10:06:00Z' }
		};
		const items = buildServiceAttention(
			[service('paperless', 'Paperless'), service('grafana', 'Grafana'), service('old', 'Old'), service('unprobed', 'Unprobed')],
			details
		);
		assert.deepEqual(items, [
			{
				id: 'svc:paperless', title: 'Paperless is down', severity: 'critical',
				url: 'https://paperless.example.test', detail: 'connection refused', source: 'core-pi',
				updatedAt: '2026-11-16T10:03:00Z'
			},
			{
				id: 'svc:old', title: 'Old is down', severity: 'critical',
				url: 'https://old.example.test', detail: undefined, source: 'core-pi',
				updatedAt: '2026-11-16T10:06:00Z'
			}
		]);
	});
});

describe('sortAttention', () => {
	it('orders by severity, then newest first, with undated items last', () => {
		const item = (id: string, severity: AttentionItem['severity'], updatedAt?: string): AttentionItem => ({
			id, title: id, severity, updatedAt
		});
		const input = [
			item('info-old', 'info', '2026-11-01T00:00:00Z'),
			item('warn', 'warning'),
			item('crit-undated', 'critical'),
			item('info-new', 'info', '2026-11-16T00:00:00Z'),
			item('crit-new', 'critical', '2026-11-16T00:00:00Z')
		];
		assert.deepEqual(sortAttention(input).map((i) => i.id), ['crit-new', 'crit-undated', 'warn', 'info-new', 'info-old']);
		assert.equal(input[0].id, 'info-old');
	});
});
