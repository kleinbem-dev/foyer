<script lang="ts">
	import { onMount } from 'svelte';
	import type { HealthStatus, HostNode, LayoutDensity, ServiceCategory } from '#lib/types';
	import { CATEGORY_ORDER, FLEET_SERVICES } from '#lib/data/services';
	import { fetchGatusStatuses, resolveHealth } from '#lib/data/gatus';
	import HostFilter from '#lib/components/HostFilter.svelte';
	import HostBar from '#lib/components/HostBar.svelte';
	import BookmarksSection from '#lib/components/BookmarksSection.svelte';
	import LayoutToggle from '#lib/components/LayoutToggle.svelte';
	import CategorySection from '#lib/components/CategorySection.svelte';

	let selectedHost = $state<HostNode | 'all'>('all');
	let networkFilter = $state<'all' | 'public' | 'mesh' | 'issues'>('all');
	let density = $state<LayoutDensity>('comfortable');
	let healthMap = $state<Record<string, HealthStatus>>({});
	// Last successful Gatus poll; the map is kept on failures, so show how old it is.
	let healthUpdatedAt = $state<Date | null>(null);
	let healthStale = $state(false);

	onMount(() => {
		try {
			const savedDensity = localStorage.getItem('foyer-density') as LayoutDensity;
			if (savedDensity && ['comfortable', 'compact', 'list'].includes(savedDensity)) {
				density = savedDensity;
			}
		} catch {}
	});

	// Host counts calculation
	let counts = $derived.by(() => {
		const res: Record<string, number> = { total: FLEET_SERVICES.length };
		for (const s of FLEET_SERVICES) {
			res[s.host] = (res[s.host] ?? 0) + 1;
		}
		return res;
	});

	// Filtered by selected host & network/health
	let filteredServices = $derived.by(() => {
		let list = FLEET_SERVICES;
		if (selectedHost !== 'all') {
			list = list.filter((s) => s.host === selectedHost);
		}
		if (networkFilter === 'public') {
			list = list.filter((s) => s.network === 'public');
		} else if (networkFilter === 'mesh') {
			list = list.filter((s) => s.network === 'mesh');
		} else if (networkFilter === 'issues') {
			list = list.filter((s) => {
				const h = resolveHealth(s, healthMap);
				return h === 'down' || h === 'degraded';
			});
		}
		return list;
	});

	// Grouped by category in specified order
	let groupedServices = $derived.by(() => {
		const groups: Array<{ category: ServiceCategory; services: typeof FLEET_SERVICES }> = [];
		for (const cat of CATEGORY_ORDER) {
			const servicesInCat = filteredServices.filter((s) => s.category === cat);
			if (servicesInCat.length > 0) {
				groups.push({ category: cat, services: servicesInCat });
			}
		}

		// Catch any uncategorized
		const otherServices = filteredServices.filter((s) => !CATEGORY_ORDER.includes(s.category));
		if (otherServices.length > 0) {
			groups.push({ category: 'Other', services: otherServices });
		}

		return groups;
	});

	// Overview summary metrics
	let metrics = $derived.by(() => {
		const publicCount = FLEET_SERVICES.filter((s) => s.network === 'public').length;
		const meshCount = FLEET_SERVICES.filter((s) => s.network === 'mesh').length;
		const healthyCount = FLEET_SERVICES.filter((s) => resolveHealth(s, healthMap) === 'healthy').length;
		const issueCount = FLEET_SERVICES.filter((s) => {
			const status = resolveHealth(s, healthMap);
			return status === 'down' || status === 'degraded';
		}).length;
		return { publicCount, meshCount, healthyCount, issueCount };
	});

	$effect(() => {
		if (networkFilter === 'issues' && metrics.issueCount === 0) {
			networkFilter = 'all';
		}
	});

	onMount(() => {
		async function refreshHealth() {
			const next = await fetchGatusStatuses();
			if (next) {
				healthMap = next;
				healthUpdatedAt = new Date();
				healthStale = false;
			} else {
				healthStale = true;
			}
		}

		refreshHealth();
		const interval = setInterval(refreshHealth, 30_000);
		return () => clearInterval(interval);
	});
</script>

<div class="space-y-7">
	<!-- Hero & Metrics Bar -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel shadow-xs">
		<div>
			<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
				Welcome home
			</h2>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
				Central gateway to self-hosted compute, storage, and AI agents.
			</p>
			{#if healthStale}
				<p class="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-mono" role="status">
					Gatus unreachable{healthUpdatedAt
						? ` · health as of ${healthUpdatedAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
						: ' · no health data yet'}
				</p>
			{/if}
		</div>

		<div class="flex items-center gap-2 sm:gap-2.5 text-xs font-mono flex-wrap" role="group" aria-label="Network status filters">
			<button
				type="button"
				aria-pressed={networkFilter === 'all'}
				onclick={() => (networkFilter = 'all')}
				class="px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer {networkFilter === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent font-semibold shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
				title="Show all services"
			>
				<span>Total:</span>
				<span class="ml-1">{counts.total}</span>
			</button>

			<button
				type="button"
				aria-pressed={networkFilter === 'public'}
				onclick={() => (networkFilter = networkFilter === 'public' ? 'all' : 'public')}
				class="px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer {networkFilter === 'public' ? 'bg-emerald-600 text-white border-transparent font-semibold shadow-xs' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'}"
				title="Filter public endpoints"
			>
				<span>🌐 Public:</span>
				<span class="ml-1">{metrics.publicCount}</span>
			</button>

			<button
				type="button"
				aria-pressed={networkFilter === 'mesh'}
				onclick={() => (networkFilter = networkFilter === 'mesh' ? 'all' : 'mesh')}
				class="px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer {networkFilter === 'mesh' ? 'bg-indigo-600 text-white border-transparent font-semibold shadow-xs' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20'}"
				title="Filter mesh endpoints"
			>
				<span>🔒 Mesh:</span>
				<span class="ml-1">{metrics.meshCount}</span>
			</button>

			{#if metrics.issueCount > 0}
				<button
					type="button"
					aria-pressed={networkFilter === 'issues'}
					onclick={() => (networkFilter = networkFilter === 'issues' ? 'all' : 'issues')}
					class="px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer {networkFilter === 'issues' ? 'bg-rose-600 text-white border-transparent font-semibold shadow-xs animate-pulse' : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'}"
					title="Show only degraded/down endpoints"
				>
					<span>⚠️ Issues:</span>
					<span class="ml-1">{metrics.issueCount}</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Fleet Conductor Nodes -->
	<HostBar bind:selectedHost />

	<!-- Pinned & Quick Links -->
	<BookmarksSection />

	<!-- Filter & Density Toolbar -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
		<div class="flex items-center gap-3 flex-wrap">
			<HostFilter bind:selectedHost {counts} />

			{#if selectedHost !== 'all' || networkFilter !== 'all'}
				<button
					type="button"
					onclick={() => {
						selectedHost = 'all';
						networkFilter = 'all';
					}}
					class="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline font-mono cursor-pointer"
				>
					Reset filters
				</button>
			{/if}
		</div>

		<!-- Layout Density Selector -->
		<LayoutToggle bind:density />
	</div>

	<!-- Category Sections -->
	<div class="space-y-10">
		{#if groupedServices.length === 0}
			<div class="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
				No services match the current filters.
			</div>
		{:else}
			{#each groupedServices as group (group.category)}
				<CategorySection
					category={group.category}
					services={group.services}
					{healthMap}
					{density}
				/>
			{/each}
		{/if}
	</div>
</div>
