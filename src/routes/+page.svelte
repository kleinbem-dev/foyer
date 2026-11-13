<script lang="ts">
	import { onMount } from 'svelte';
	import BookmarksSection from '#lib/components/BookmarksSection.svelte';
	import CategorySection from '#lib/components/CategorySection.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import Header from '#lib/components/Header.svelte';
	import HostBar from '#lib/components/HostBar.svelte';
	import LayoutToggle from '#lib/components/LayoutToggle.svelte';
	import { DEFAULT_CONFIG, loadPortalConfig } from '#lib/config';
	import { fetchGatusStatuses } from '#lib/data/gatus';
	import { computeServiceMetrics, filterServices, groupServicesByCategory, type NetworkFilter } from '#lib/portal';
	import type { HealthStatus, LayoutDensity, PinnedBookmark, PortalConfig } from '#lib/types';

	let config = $state.raw<PortalConfig>(DEFAULT_CONFIG);
	let configWarning = $state<string | undefined>(undefined);
	let bookmarks = $state<PinnedBookmark[]>([]);
	let commandPaletteOpen = $state(false);
	let selectedHost = $state<string | null>(null);
	let requestedNetworkFilter = $state<NetworkFilter>('all');
	let density = $state<LayoutDensity>('comfortable');
	let healthMap = $state.raw<Record<string, HealthStatus>>({});
	let healthUpdatedAt = $state<Date | null>(null);
	let healthStale = $state(false);

	let metrics = $derived(computeServiceMetrics(config.services, healthMap));

	// Falls back to 'all' automatically once no endpoints have issues.
	let networkFilter = $derived<NetworkFilter>(
		requestedNetworkFilter === 'issues' && metrics.issueCount === 0 ? 'all' : requestedNetworkFilter
	);
	let filteredServices = $derived(filterServices(config.services, selectedHost, networkFilter, healthMap));
	let groupedServices = $derived(groupServicesByCategory(filteredServices, config.categoryOrder));

	let filterPills = $derived([
		{
			id: 'all' as const, label: 'Total:', count: metrics.totalCount, icon: '',
			title: 'Show all services', show: true,
			activeCls: 'bg-accent text-accent-fg border-transparent font-semibold shadow-2xs',
			idleCls: 'bg-surface border-line text-muted hover:text-heading'
		},
		{
			id: 'public' as const, label: 'Public:', count: metrics.publicCount, icon: '🌐',
			title: 'Filter public endpoints', show: true,
			activeCls: 'bg-status-success text-white border-transparent font-semibold shadow-2xs',
			idleCls: 'bg-status-success-soft border-status-success-border text-status-success'
		},
		{
			id: 'mesh' as const, label: 'Mesh:', count: metrics.meshCount, icon: '🔒',
			title: 'Filter mesh endpoints', show: true,
			activeCls: 'bg-status-info text-white border-transparent font-semibold shadow-2xs',
			idleCls: 'bg-status-info-soft border-status-info-border text-status-info'
		},
		{
			id: 'issues' as const, label: 'Issues:', count: metrics.issueCount, icon: '⚠️',
			title: 'Show only degraded or down endpoints', show: metrics.issueCount > 0,
			activeCls: 'bg-status-danger text-white border-transparent font-semibold shadow-2xs motion-safe:animate-pulse',
			idleCls: 'bg-status-danger-soft border-status-danger-border text-status-danger'
		}
	].filter((p) => p.show));

	onMount(() => {
		try {
			const saved = localStorage.getItem('foyer-density') as LayoutDensity | null;
			if (saved && ['comfortable', 'compact', 'list'].includes(saved)) density = saved;
		} catch {}

		const controller = new AbortController();
		loadPortalConfig('./config.json', controller.signal).then(({ config: loaded, warning }) => {
			config = loaded;
			configWarning = warning;
			document.title = loaded.subtitle ? `${loaded.title} — ${loaded.subtitle}` : loaded.title;
		});
		return () => controller.abort();
	});

	let gatusInFlight = false;
	async function refreshHealth(gatusUrl: string, signal: AbortSignal) {
		if (gatusInFlight || document.hidden) return;
		gatusInFlight = true;
		try {
			const next = await fetchGatusStatuses(gatusUrl, signal);
			if (signal.aborted) return;
			if (next) {
				healthMap = next;
				healthUpdatedAt = new Date();
				healthStale = false;
			} else {
				healthStale = true;
			}
		} finally {
			gatusInFlight = false;
		}
	}

	$effect(() => {
		const gatusUrl = config.gatusUrl;
		if (!gatusUrl) {
			healthMap = {};
			healthStale = false;
			return;
		}
		const controller = new AbortController();
		refreshHealth(gatusUrl, controller.signal);
		const interval = setInterval(() => refreshHealth(gatusUrl, controller.signal), 30_000);
		return () => {
			controller.abort();
			clearInterval(interval);
		};
	});
</script>

<svelte:document
	onvisibilitychange={() => {
		if (!document.hidden && config.gatusUrl) {
			refreshHealth(config.gatusUrl, AbortSignal.timeout(4000));
		}
	}}
/>

<div class="min-h-screen flex flex-col bg-bg text-fg">
	<Header
		title={config.title}
		badge={config.badge}
		subtitle={config.subtitle}
		weather={config.weather}
		onOpenSearch={() => (commandPaletteOpen = true)}
	/>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
		{#if configWarning}
			<div role="alert" class="p-3.5 rounded-xl border border-status-warning-border bg-status-warning-soft text-status-warning text-xs font-mono">
				{configWarning}
			</div>
		{/if}

		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel shadow-2xs">
			<div>
				<h2 class="text-lg font-bold text-heading tracking-tight">{config.welcomeTitle}</h2>
				{#if config.welcomeSubtitle}
					<p class="text-xs text-muted mt-0.5">{config.welcomeSubtitle}</p>
				{/if}
				{#if healthStale}
					<p class="text-[11px] text-status-warning mt-1 font-mono" role="status">
						Gatus unreachable{healthUpdatedAt
							? ` · health as of ${healthUpdatedAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
							: ' · no health data yet'}
					</p>
				{/if}
			</div>

			{#if config.services.length > 0}
				<div class="flex items-center gap-2 sm:gap-2.5 text-xs font-mono flex-wrap" role="group" aria-label="Network status filters">
					{#each filterPills as pill (pill.id)}
						<button
							type="button"
							aria-pressed={networkFilter === pill.id}
							onclick={() => (requestedNetworkFilter = pill.id === 'all' || networkFilter !== pill.id ? pill.id : 'all')}
							class="px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer {networkFilter === pill.id ? pill.activeCls : pill.idleCls}"
							title={pill.title}
						>
							{#if pill.icon}<span aria-hidden="true">{pill.icon} </span>{/if}
							<span>{pill.label}</span>
							<span class="ml-1">{pill.count}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<HostBar hosts={config.hosts} counts={metrics.hostCounts} bind:selectedHost />
		<BookmarksSection bind:bookmarks />

		{#if config.services.length > 0}
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
				<div class="flex items-center gap-3 flex-wrap min-h-8">
					{#if selectedHost !== null || networkFilter !== 'all'}
						<span class="text-xs font-mono text-muted">
							Showing {filteredServices.length} of {config.services.length} services
						</span>
						<button
							type="button"
							onclick={() => {
								selectedHost = null;
								requestedNetworkFilter = 'all';
							}}
							class="text-xs text-accent hover:underline font-mono cursor-pointer"
						>
							Reset filters
						</button>
					{/if}
				</div>
				<LayoutToggle bind:density />
			</div>
		{/if}

		<div class="space-y-10">
			{#if config.services.length === 0}
				<div class="p-10 rounded-2xl border border-dashed border-line text-center space-y-2">
					<p class="text-sm font-medium text-heading">No services configured</p>
					<p class="text-xs text-muted max-w-md mx-auto">
						Serve a <code class="font-mono text-fg">/config.json</code> file at the web root to populate hosts, service categories, Gatus health checks, and weather.
					</p>
				</div>
			{:else if groupedServices.length === 0}
				<div class="text-center py-16 text-muted text-sm">No services match the current filters.</div>
			{:else}
				{#each groupedServices as group (group.category)}
					<CategorySection
						category={group.category}
						services={group.services}
						{healthMap}
						{density}
						categoryIcons={config.categoryIcons}
					/>
				{/each}
			{/if}
		</div>
	</main>

	<footer class="py-6 border-t border-line text-center text-xs text-muted font-mono">
		<div class="flex items-center justify-center gap-3 flex-wrap px-4">
			<span>{config.title.toLowerCase()}</span>
			{#each config.footerLinks ?? [] as link, i (`${i}:${link.url}`)}
				<span aria-hidden="true">•</span>
				<a href={link.url} target="_blank" rel="noopener noreferrer" class="hover:underline hover:text-heading transition-colors">
					{link.label}
				</a>
			{/each}
		</div>
	</footer>

	<CommandPalette
		services={config.services}
		{bookmarks}
		hosts={config.hosts}
		searchUrlTemplate={config.searchUrlTemplate}
		onSelectHost={(hostId) => (selectedHost = selectedHost === hostId ? null : hostId)}
		bind:open={commandPaletteOpen}
	/>
</div>
