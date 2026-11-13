import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';
import {
	DEFAULT_CONFIG,
	isSafePortalUrl,
	isValidHttpUrl,
	loadPortalConfig,
	parsePortalConfig
} from '#lib/config';
import { buildGatusStatusesUrl } from '#lib/data/gatus';
import {
	buildPaletteEntries,
	computeServiceMetrics,
	createBookmark,
	describeWeatherCode,
	fetchWeather,
	filterPaletteEntries,
	filterServices,
	formatWebSearchUrl,
	groupServicesByCategory,
	isValidBookmark,
	parseStoredBookmarks
} from '#lib/portal';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('URL validation & sanitization', () => {
	it('accepts http(s) URLs and rejects javascript:, data:, file:, and malformed URLs', () => {
		assert.equal(isValidHttpUrl('https://portal.example.test/app'), true);
		assert.equal(isValidHttpUrl('http://10.0.0.10:8080'), true);
		assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
		assert.equal(isValidHttpUrl('data:text/html,<script>alert(1)</script>'), false);
		assert.equal(isValidHttpUrl('file:///etc/passwd'), false);
		assert.equal(isValidHttpUrl('//evil.example.test'), false);
		assert.equal(isValidHttpUrl('not a url'), false);
	});

	it('accepts single-slash root-relative paths in isSafePortalUrl while blocking protocol-relative URLs', () => {
		assert.equal(isSafePortalUrl('/grafana/'), true);
		assert.equal(isSafePortalUrl('//evil.example.test'), false);
		assert.equal(isSafePortalUrl('/bad path with spaces'), false);
		assert.equal(isSafePortalUrl('javascript:void(0)'), false);
	});
});

describe('parsePortalConfig & static/config.json', () => {
	it('parses shipped static/config.json cleanly with zero personal defaults', () => {
		const raw = JSON.parse(readFileSync('static/config.json', 'utf8'));
		const cfg = parsePortalConfig(raw);
		assert.equal(cfg.title, 'Foyer');
		assert.deepEqual(cfg.hosts, []);
		assert.deepEqual(cfg.services, []);
		assert.equal(cfg.gatusUrl, undefined);
		assert.equal(cfg.weather, undefined);
	});

	it('falls back safely on non-object payloads, sanitizes invalid URLs, and deduplicates IDs', () => {
		for (const bad of [null, undefined, 'str', 123, []]) {
			assert.deepEqual(parsePortalConfig(bad), DEFAULT_CONFIG);
		}

		const cfg = parsePortalConfig({
			title: '  Homelab  ',
			badge: 'prod',
			gatusUrl: 'javascript:alert(1)',
			searchUrlTemplate: 'javascript:%s',
			weather: { latitude: 999, longitude: 10 },
			hosts: [
				{ id: 'node-a', name: 'Node A', role: 'Compute', ip: '192.0.2.10', arch: 'x86_64' },
				{ id: 'node-a', name: 'Duplicate Node', role: 'Ignored' },
				{ id: '' }
			],
			services: [
				{
					id: 'svc-1',
					name: 'Grafana',
					category: 'Infra',
					url: 'https://grafana.example.test',
					host: 'node-a',
					network: 'mesh',
					tags: ['metrics', ' ', 42]
				},
				{
					id: 'svc-1',
					name: 'Duplicate Grafana',
					url: 'https://dup.example.test'
				},
				{
					id: 'xss',
					name: 'Bad Scheme',
					url: 'javascript:alert(1)'
				}
			],
			footerLinks: [
				{ label: 'Docs', url: '/docs' },
				{ label: 'Bad', url: 'data:text/plain,bad' }
			]
		});

		assert.equal(cfg.title, 'Homelab');
		assert.equal(cfg.badge, 'prod');
		assert.equal(cfg.gatusUrl, undefined);
		assert.equal(cfg.searchUrlTemplate, DEFAULT_CONFIG.searchUrlTemplate);
		assert.equal(cfg.weather, undefined);
		assert.equal(cfg.hosts.length, 1);
		assert.equal(cfg.hosts[0].name, 'Node A');
		assert.equal(cfg.services.length, 1);
		assert.deepEqual(cfg.services[0].tags, ['metrics']);
		assert.deepEqual(cfg.footerLinks, [{ label: 'Docs', url: '/docs' }]);
	});

	it('accepts valid boundary weather coordinates', () => {
		const cfg = parsePortalConfig({
			weather: { latitude: -53.8, longitude: 151.2, timezone: 'UTC', label: 'Harbor' }
		});
		assert.deepEqual(cfg.weather, {
			latitude: -53.8,
			longitude: 151.2,
			timezone: 'UTC',
			label: 'Harbor'
		});
	});
});

describe('loadPortalConfig', () => {
	it('returns default config silently on 404 and surfaces warning on invalid JSON or 500', async () => {
		globalThis.fetch = (async () => new Response('Not Found', { status: 404 })) as typeof fetch;
		const missing = await loadPortalConfig();
		assert.equal(missing.warning, undefined);
		assert.deepEqual(missing.config, DEFAULT_CONFIG);

		globalThis.fetch = (async () => new Response('Server Error', { status: 500 })) as typeof fetch;
		const serverErr = await loadPortalConfig();
		assert.match(serverErr.warning ?? '', /HTTP 500/);

		globalThis.fetch = (async () =>
			new Response('{broken json', { status: 200 })) as typeof fetch;
		const badJson = await loadPortalConfig();
		assert.match(badJson.warning ?? '', /Invalid JSON/);
	});
});

describe('Gatus URL normalization', () => {
	it('appends /api/v1/endpoints/statuses once without duplicating path or trailing slashes', () => {
		assert.equal(
			buildGatusStatusesUrl('https://status.example.test/'),
			'https://status.example.test/api/v1/endpoints/statuses'
		);
		assert.equal(
			buildGatusStatusesUrl('https://status.example.test/api/v1/endpoints/statuses'),
			'https://status.example.test/api/v1/endpoints/statuses'
		);
	});
});

describe('Bookmarks validation & creation', () => {
	it('rejects partial/malformed stored bookmarks and deduplicates IDs', () => {
		assert.equal(isValidBookmark({ id: '1', name: 'A', url: 'https://a.example' }), false);
		const raw = JSON.stringify([
			{ id: 'b1', name: 'Docs', url: 'https://docs.example.test', icon: '📚', createdAt: 100 },
			{ id: 'b1', name: 'Dup', url: 'https://dup.example.test', icon: '📚', createdAt: 101 },
			{ id: 'b2', name: 'XSS', url: 'javascript:alert(1)', icon: '💀', createdAt: 102 },
			{ id: 'b3', name: 'MissingIcon', url: 'https://ok.example.test', createdAt: 103 }
		]);
		const parsed = parseStoredBookmarks(raw);
		assert.equal(parsed.length, 1);
		assert.equal(parsed[0].id, 'b1');
		assert.deepEqual(parseStoredBookmarks('{invalid'), []);
	});

	it('normalizes bare domains to https:// and rejects non-http schemes in createBookmark', () => {
		const ok = createBookmark('Grafana', 'grafana.example.test', '');
		assert.ok(ok.bookmark);
		assert.equal(ok.bookmark.url, 'https://grafana.example.test');
		assert.equal(ok.bookmark.icon, '🔗');

		const xss = createBookmark('Bad', 'javascript:alert(1)', '⭐');
		assert.equal(xss.bookmark, undefined);
		assert.match(xss.error ?? '', /valid HTTP or HTTPS/);
	});
});

describe('Palette multi-token search, filtering, grouping & weather', () => {
	const services = [
		{
			id: 'attic',
			name: 'Attic Cache',
			category: 'Infrastructure',
			icon: '📦',
			description: 'Binary cache store',
			url: 'https://cache.example.test',
			host: 'node-1',
			network: 'mesh' as const,
			tags: ['nix', 'nar']
		},
		{
			id: 'auth',
			name: 'Authentik',
			category: 'Identity',
			icon: '🪪',
			description: 'SSO login',
			url: 'https://auth.example.test',
			host: 'node-2',
			network: 'public' as const,
			tags: ['oidc']
		}
	];
	const bookmarks = [
		{
			id: 'bm-1',
			name: 'Router UI',
			url: 'https://192.0.2.1',
			icon: '📡',
			createdAt: 1
		}
	];
	const hosts = [{ id: 'node-1', name: 'node-1', role: 'Builder', ip: '192.0.2.10', arch: 'x86_64' }];

	it('searches across services, pinned bookmarks, and hosts with multi-token & prefix filters', () => {
		const entries = buildPaletteEntries(services, bookmarks, hosts);
		assert.equal(entries.length, 4);

		// Multi-word cross-field query ("attic" in name + "nix" in tags)
		const multi = filterPaletteEntries(entries, 'attic nix');
		assert.equal(multi.length, 1);
		assert.equal(multi[0].name, 'Attic Cache');

		// Pinned bookmark match
		const pinned = filterPaletteEntries(entries, '@pinned router');
		assert.equal(pinned.length, 1);
		assert.equal(pinned[0].kind, 'bookmark');

		// Host prefix + network prefix
		assert.equal(filterPaletteEntries(entries, '#node-2 !public').length, 1);
		assert.equal(filterPaletteEntries(entries, '>duckduckgo query').length, 0);
	});

	it('formats web search URLs safely and blocks unsafe templates', () => {
		assert.equal(
			formatWebSearchUrl('nix flake', 'https://duckduckgo.com/?q=%s'),
			'https://duckduckgo.com/?q=nix%20flake'
		);
		assert.equal(formatWebSearchUrl('   '), null);
		assert.equal(formatWebSearchUrl('test', 'javascript:%s'), null);
	});

	it('computes metrics, filters issues, and preserves custom category ordering', () => {
		const health = { attic: 'down' as const, auth: 'healthy' as const };
		const metrics = computeServiceMetrics(services, health);
		assert.equal(metrics.publicCount, 1);
		assert.equal(metrics.meshCount, 1);
		assert.equal(metrics.healthyCount, 1);
		assert.equal(metrics.issueCount, 1);
		assert.equal(metrics.hostCounts['node-1'], 1);

		const issues = filterServices(services, 'all', 'issues', health);
		assert.equal(issues.length, 1);
		assert.equal(issues[0].id, 'attic');

		const groups = groupServicesByCategory(services, ['Identity']);
		assert.deepEqual(
			groups.map((g) => g.category),
			['Identity', 'Infrastructure']
		);
	});

	it('guards fetchWeather against missing or non-finite Open-Meteo fields', async () => {
		assert.equal(describeWeatherCode(0).condition, 'Clear');
		assert.equal(describeWeatherCode(95).condition, 'Thunderstorm');

		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ current: { temperature_2m: 'bad', weather_code: 0 } }), {
				status: 200
			})) as typeof fetch;
		assert.equal(await fetchWeather({ latitude: 50, longitude: 8 }), null);

		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ current: { temperature_2m: 18.6, weather_code: 2 } }), {
				status: 200
			})) as typeof fetch;
		assert.deepEqual(await fetchWeather({ latitude: 50, longitude: 8 }), {
			temp: 19,
			condition: 'Partly Cloudy',
			icon: '🌤️'
		});
	});
});
