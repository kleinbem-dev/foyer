import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from 'svelte/server';
import BookmarksSection from '#lib/components/BookmarksSection.svelte';
import CategorySection from '#lib/components/CategorySection.svelte';
import CommandPalette from '#lib/components/CommandPalette.svelte';
import Header from '#lib/components/Header.svelte';
import HostBar from '#lib/components/HostBar.svelte';
import LayoutToggle from '#lib/components/LayoutToggle.svelte';
import ServiceCard from '#lib/components/ServiceCard.svelte';
import type { ServiceItem } from '#lib/types';

const sampleServices: ServiceItem[] = [
	{
		id: 'git-forge',
		name: 'Forgejo',
		category: 'Dev',
		icon: '🌳',
		description: 'Self-hosted Git forge.',
		url: 'https://git.example.test',
		host: 'core-pi',
		network: 'mesh',
		gatusEndpoint: 'forgejo',
		tags: ['git', 'ci']
	},
	{
		id: 'vault',
		name: 'Vaultwarden',
		category: 'Identity',
		icon: '🔐',
		description: 'Password manager.',
		url: 'https://vault.example.test',
		host: 'nasbook',
		network: 'public',
		tags: ['passwords']
	}
];

describe('ServiceCard component', () => {
	for (const density of ['comfortable', 'compact', 'list'] as const) {
		it(`renders ${density} density with safe external link attributes and health status`, () => {
			const { body } = render(ServiceCard, {
				props: {
					service: sampleServices[0],
					health: 'healthy',
					density
				}
			});
			assert.match(body, /Forgejo/);
			assert.match(body, /core-pi/);
			assert.match(body, /href="https:\/\/git\.example\.test"/);
			assert.match(body, /rel="noopener noreferrer"/);
			assert.match(body, /Operational/);
			assert.match(body, /Copy Forgejo URL/);
		});
	}

	it('renders network badges for public, mesh, and lan services', () => {
		const lanService: ServiceItem = { ...sampleServices[0], network: 'lan' };
		assert.match(render(ServiceCard, { props: { service: sampleServices[1] } }).body, /Public/);
		assert.match(render(ServiceCard, { props: { service: sampleServices[0] } }).body, /Mesh/);
		assert.match(render(ServiceCard, { props: { service: lanService } }).body, /LAN/);
	});
});

describe('CategorySection component', () => {
	it('renders nothing when services array is empty', () => {
		const { body } = render(CategorySection, {
			props: { category: 'Dev', services: [] }
		});
		assert.doesNotMatch(body, /<section/);
	});

	it('renders category heading, service count, and resolves health per service', () => {
		const { body } = render(CategorySection, {
			props: {
				category: 'Dev',
				services: [sampleServices[0]],
				healthMap: { forgejo: 'down' },
				density: 'comfortable'
			}
		});
		assert.match(body, /Dev/);
		assert.match(body, /\(1\)/);
		assert.match(body, /Offline/);
	});
});

describe('LayoutToggle component', () => {
	it('marks active layout density button with aria-pressed="true"', () => {
		const { body } = render(LayoutToggle, { props: { density: 'compact' } });
		assert.match(body, /aria-label="Layout density"/);
		assert.match(body, /aria-pressed="true"[^>]*title="Compact Grid"|title="Compact Grid"[^>]*aria-pressed="true"/);
	});
});

describe('CommandPalette component', () => {
	it('renders no dialog markup when closed', () => {
		const { body } = render(CommandPalette, {
			props: { services: sampleServices, open: false }
		});
		assert.doesNotMatch(body, /role="dialog"/);
		assert.doesNotMatch(body, /<dialog/);
	});

	it('renders searchable service, bookmark, and host list with combobox/listbox ARIA when open', () => {
		const openHtml = render(CommandPalette, {
			props: {
				services: sampleServices,
				bookmarks: [
					{
						id: 'bm-1',
						name: 'Pinned Router',
						url: 'https://192.0.2.1',
						icon: '📡',
						createdAt: 1
					}
				],
				hosts: [{ id: 'core-pi', name: 'core-pi', role: 'Gateway', ip: '192.0.2.2', arch: 'aarch64' }],
				open: true
			}
		}).body;
		assert.match(openHtml, /<dialog/);
		assert.match(openHtml, /role="combobox"/);
		assert.match(openHtml, /role="listbox"/);
		assert.match(openHtml, /role="option"/);
		assert.match(openHtml, /Forgejo/);
		assert.match(openHtml, /Vaultwarden/);
		assert.match(openHtml, /Pinned Router/);

		const emptyHtml = render(CommandPalette, {
			props: { services: [], open: true }
		}).body;
		assert.match(emptyHtml, /0 (services|results)/);
		assert.doesNotMatch(emptyHtml, /Search web for ""/);
	});
});

describe('HostBar component', () => {
	it('renders nothing when hosts list is empty and renders keyed host cards when populated', () => {
		assert.doesNotMatch(render(HostBar, { props: { hosts: [] } }).body, /<section/);

		const { body } = render(HostBar, {
			props: {
				hosts: [
					{ id: 'n1', name: 'alpha', role: 'Gateway', ip: '192.0.2.10', arch: 'aarch64' },
					{ id: 'n2', name: 'beta', role: 'Compute', arch: 'x86_64' }
				],
				counts: { n1: 3, n2: 1 },
				selectedHost: 'n1'
			}
		});
		assert.match(body, /alpha/);
		assert.match(body, /ARM/);
		assert.match(body, /x86/);
		assert.match(body, /192\.0\.2\.10/);
		assert.match(body, /Copy alpha IP address/);
		assert.doesNotMatch(body, /Copy beta IP address/);
	});
});

describe('BookmarksSection & Header components', () => {
	it('renders empty bookmark callout and hides add-link modal initially', () => {
		const { body } = render(BookmarksSection);
		assert.match(body, /Pinned &amp; Quick Links|Pinned & Quick Links/);
		assert.match(body, /Add Link/);
		assert.doesNotMatch(body, /Add Pinned Link/);
	});

	it('renders Header with search trigger and ThemeToggle', () => {
		const { body } = render(Header, { props: { onOpenSearch: () => {} } });
		assert.match(body, /Foyer/);
		assert.match(body, /⌘K/);
	});
});
