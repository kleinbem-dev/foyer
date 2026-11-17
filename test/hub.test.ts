import * as assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { render } from 'svelte/server';
import AttentionPanel from '#lib/components/AttentionPanel.svelte';
import CategorySection from '#lib/components/CategorySection.svelte';
import HostBar from '#lib/components/HostBar.svelte';
import ServiceCard from '#lib/components/ServiceCard.svelte';
import { loadPortalConfig, parseCachedConfig, parsePortalConfig } from '#lib/config';
import {
	computeServiceMetrics, describeHealth, filterPaletteEntries, formatRelativeTime, formatResponseTime, isTypeToSearchKey
} from '#lib/portal';
import type { PaletteEntry } from '#lib/portal';
import type { AttentionItem, EndpointDetail, ServiceItem } from '#lib/types';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const NOW = new Date('2026-11-16T12:00:00Z');

const service: ServiceItem = {
	id: 'paperless', name: 'Paperless', category: 'Documents', icon: '📄', description: 'Document archive.',
	url: 'https://paperless.example.test', host: 'nasbook', network: 'mesh'
};

const healthyDetail: EndpointDetail = {
	name: 'Paperless', status: 'healthy', history: [true, false, true, true], responseMs: 83,
	checkedAt: '2026-11-16T11:58:00Z'
};

const downDetail: EndpointDetail = {
	name: 'Paperless', status: 'down', history: [true, false, false], responseMs: 12,
	checkedAt: '2026-11-16T11:59:30Z', downSince: '2026-11-16T09:00:00Z', reason: 'connection refused'
};

describe('formatRelativeTime', () => {
	it('uses minutes, hours and days, and is empty for missing, invalid or future times', () => {
		assert.equal(formatRelativeTime('2026-11-16T11:59:30Z', NOW), 'just now');
		assert.equal(formatRelativeTime('2026-11-16T11:55:00Z', NOW), '5 min ago');
		assert.equal(formatRelativeTime('2026-11-16T09:00:00Z', NOW), '3 h ago');
		assert.equal(formatRelativeTime('2026-11-14T13:00:00Z', NOW), '47 h ago');
		assert.equal(formatRelativeTime('2026-11-13T12:00:00Z', NOW), '3 d ago');
		assert.equal(formatRelativeTime(undefined, NOW), '');
		assert.equal(formatRelativeTime('soon', NOW), '');
		assert.equal(formatRelativeTime('2026-11-16T12:05:00Z', NOW), '');
	});
});

describe('filterPaletteEntries ranking', () => {
	const entry = (name: string, description = ''): PaletteEntry => ({
		id: name, kind: 'service', name, description, icon: '📦', category: 'Apps'
	});
	const entries = [
		entry('Buzz', 'Team chat with pairing relay'),
		entry('Status', 'Fleet uptime page'),
		entry('Nix Detour', 'Nixpkgs patch tracker'),
		entry('Paperless-ngx', 'Document archive'),
		entry('Grafana', 'Dashboards'),
		entry('Spa Control', 'Pool')
	];
	const names = (query: string) => filterPaletteEntries(entries, query).map((e) => e.name);

	it('puts name matches before description matches, prefixes first', () => {
		assert.deepEqual(names('pa'), ['Paperless-ngx', 'Spa Control', 'Buzz', 'Status', 'Nix Detour']);
		assert.deepEqual(names('det'), ['Nix Detour']);
	});

	it('keeps the configured order without search words and among equal matches', () => {
		assert.deepEqual(names(''), entries.map((e) => e.name));
		assert.deepEqual(names('@apps'), entries.map((e) => e.name));
		// All four match "t" in the name only as a later letter or word start: order as configured.
		assert.deepEqual(names('tr'), ['Spa Control', 'Nix Detour']);
		assert.deepEqual(names('s'), ['Status', 'Spa Control', 'Paperless-ngx', 'Buzz', 'Nix Detour', 'Grafana']);
	});
});

describe('formatResponseTime', () => {
	it('never shows 0 ms and switches to seconds from one second on', () => {
		assert.equal(formatResponseTime(0), '<1 ms');
		assert.equal(formatResponseTime(83), '83 ms');
		assert.equal(formatResponseTime(999), '999 ms');
		assert.equal(formatResponseTime(1240), '1.2 s');
	});
});

describe('describeHealth', () => {
	it('summarises a healthy, a failing and an unchecked service', () => {
		assert.equal(describeHealth('healthy', healthyDetail, NOW), 'Operational · 83 ms · checked 2 min ago');
		assert.equal(
			describeHealth('down', downDetail, NOW),
			'Offline · connection refused · since 3 h ago · checked just now'
		);
		assert.equal(describeHealth('unknown', undefined, NOW), 'No health check');
	});
});

describe('isTypeToSearchKey', () => {
	const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
		({ key: k, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, ...mods }) as KeyboardEvent;

	it('accepts single letters and digits, also non-ASCII ones', () => {
		for (const k of ['a', 'Z', '7', 'ä', 'é']) assert.equal(isTypeToSearchKey(key(k)), true, k);
	});

	it('rejects named keys, punctuation, space, shortcuts and IME composition', () => {
		for (const k of ['Enter', 'Tab', 'F5', 'ArrowDown', ' ', '.', '?', 'Dead']) {
			assert.equal(isTypeToSearchKey(key(k)), false, k);
		}
		assert.equal(isTypeToSearchKey(key('r', { ctrlKey: true })), false);
		assert.equal(isTypeToSearchKey(key('l', { metaKey: true })), false);
		assert.equal(isTypeToSearchKey(key('d', { altKey: true })), false);
		assert.equal(isTypeToSearchKey(key('k', { isComposing: true })), false);
	});
});

describe('computeServiceMetrics host health', () => {
	it('marks a host down when any of its services is, healthy when all checked ones are', () => {
		const svc = (id: string, host: string): ServiceItem => ({ ...service, id, host });
		const metrics = computeServiceMetrics(
			[svc('a', 'mixed'), svc('b', 'mixed'), svc('c', 'fine'), svc('d', 'fine'), svc('e', 'unchecked')],
			{ a: 'healthy', b: 'down', c: 'healthy' }
		);
		assert.equal(metrics.hostHealth.mixed, 'down');
		assert.equal(metrics.hostHealth.fine, 'healthy');
		assert.equal(metrics.hostHealth.unchecked, undefined);
		assert.equal(metrics.hostHealth.toString, undefined);

		const downFirst = computeServiceMetrics([svc('b', 'h'), svc('a', 'h')], { a: 'healthy', b: 'down' });
		assert.equal(downFirst.hostHealth.h, 'down');
	});
});

describe('config: attention feed, type-to-search and the cached copy', () => {
	it('accepts a safe attentionUrl and an explicit typeToSearch only', () => {
		const on = parsePortalConfig({ attentionUrl: '/attention.json', typeToSearch: true });
		assert.equal(on.attentionUrl, '/attention.json');
		assert.equal(on.typeToSearch, true);

		const off = parsePortalConfig({ attentionUrl: 'javascript:alert(1)', typeToSearch: 'yes' });
		assert.equal(off.attentionUrl, undefined);
		assert.equal(off.typeToSearch, false);
		assert.equal(parsePortalConfig({ attentionUrl: '//evil.example.test/feed' }).attentionUrl, undefined);
	});

	it('returns the raw body with a loaded config, and none with the default', async () => {
		const body = JSON.stringify({ title: 'Lab', links: [{ name: 'Docs', url: 'https://docs.example.test' }] });
		globalThis.fetch = (async () => new Response(body)) as typeof fetch;
		const loaded = await loadPortalConfig();
		assert.equal(loaded.raw, body);
		assert.equal(loaded.config.title, 'Lab');

		// Parsing the cached body again gives the same config: link ids are not prefixed twice.
		assert.deepEqual(parseCachedConfig(loaded.raw ?? null), loaded.config);

		globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;
		assert.equal((await loadPortalConfig()).raw, undefined);
		globalThis.fetch = (async () => new Response('[1]')) as typeof fetch;
		assert.equal((await loadPortalConfig()).raw, undefined);
	});

	it('ignores a missing or damaged cached copy', () => {
		for (const bad of [null, '', '{broken', '[]', '"text"', 'null']) assert.equal(parseCachedConfig(bad), null);
	});
});

describe('ServiceCard health detail', () => {
	it('shows response time, recent checks and a descriptive tooltip when healthy', () => {
		const { body } = render(ServiceCard, { props: { service, health: 'healthy', detail: healthyDetail } });
		assert.match(body, /83 ms/);
		assert.match(body, /3 of 4 recent checks passed/);
		assert.match(body, /title="Operational · 83 ms · checked/);
	});

	it('shows why a service is down, without a response time', () => {
		const { body } = render(ServiceCard, { props: { service, health: 'down', detail: downDetail } });
		assert.match(body, /connection refused/);
		assert.match(body, /1 of 3 recent checks passed/);
		assert.doesNotMatch(body, /12 ms/);
	});

	it('renders as before without detail, in every density', () => {
		for (const density of ['comfortable', 'compact', 'list'] as const) {
			const { body } = render(ServiceCard, { props: { service, density } });
			assert.match(body, /title="No health check"/);
			assert.doesNotMatch(body, /recent checks passed/);
		}
	});

	it('escapes a failure reason that contains markup', () => {
		const detail: EndpointDetail = { ...downDetail, reason: '<img src=x onerror=alert(1)>' };
		const { body } = render(ServiceCard, { props: { service, health: 'down', detail } });
		assert.doesNotMatch(body, /<img src=x/);
	});

	it('gets its detail from CategorySection', () => {
		const { body } = render(CategorySection, {
			props: {
				category: 'Documents', services: [service],
				healthMap: { paperless: 'down' }, healthDetails: { paperless: downDetail }
			}
		});
		assert.match(body, /connection refused/);
	});
});

describe('HostBar health', () => {
	it('labels hosts with checked services and leaves the others unmarked', () => {
		const { body } = render(HostBar, {
			props: {
				hosts: [
					{ id: 'up', name: 'up-host', role: 'Node' },
					{ id: 'bad', name: 'bad-host', role: 'Node' },
					{ id: 'none', name: 'quiet-host', role: 'Node' }
				],
				health: { up: 'healthy', bad: 'down' }
			}
		});
		assert.equal(body.match(/All checked services up/g)?.length, 3);
		assert.equal(body.match(/Has services that are down/g)?.length, 3);
		assert.equal(body.match(/role="status"/g)?.length, 2);
	});
});

describe('AttentionPanel', () => {
	const item = (n: number, extra: Partial<AttentionItem> = {}): AttentionItem => ({
		id: `i${n}`, title: `Item ${n}`, severity: 'info', ...extra
	});

	it('renders nothing without items', () => {
		assert.doesNotMatch(render(AttentionPanel, { props: { items: [] } }).body, /<section/);
	});

	it('lists items with link, detail and source, and collapses a long list', () => {
		const items = [
			item(1, {
				severity: 'critical', url: 'https://example.test/1', detail: 'connection refused', source: 'nasbook'
			}),
			...[2, 3, 4, 5, 6, 7].map((n) => item(n))
		];
		const { body } = render(AttentionPanel, { props: { items } });
		assert.match(body, /Needs attention/);
		assert.match(body, /href="https:\/\/example\.test\/1"/);
		assert.match(body, /rel="noopener noreferrer"/);
		assert.match(body, /connection refused/);
		assert.match(body, /nasbook/);
		assert.match(body, /Item 5/);
		assert.doesNotMatch(body, /Item 6/);
		assert.match(body, /Show 2 more/);
		assert.match(body, /border-status-danger-border/);
	});

	it('renders an item without a URL as plain text', () => {
		const { body } = render(AttentionPanel, { props: { items: [item(1)] } });
		assert.doesNotMatch(body, /<a /);
		assert.doesNotMatch(body, /Show \d+ more/);
	});
});
