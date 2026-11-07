<script lang="ts">
	import { onMount } from 'svelte';
	import type { HealthStatus, HostNode, ServiceCategory } from '#lib/types';
	import { CATEGORY_ORDER, FLEET_SERVICES } from '#lib/data/services';
	import { fetchGatusStatuses } from '#lib/data/gatus';
	import HostFilter from '#lib/components/HostFilter.svelte';
	import CategorySection from '#lib/components/CategorySection.svelte';

	let selectedHost = $state<HostNode | 'all'>('all');
	let healthMap = $state<Record<string, HealthStatus>>({});

	// Host counts calculation
	let counts = $derived.by(() => {
		const res: Record<string, number> = { total: FLEET_SERVICES.length };
		for (const s of FLEET_SERVICES) {
			res[s.host] = (res[s.host] ?? 0) + 1;
		}
		return res;
	});

	// Filtered by selected host
	let filteredServices = $derived.by(() => {
		if (selectedHost === 'all') return FLEET_SERVICES;
		return FLEET_SERVICES.filter((s) => s.host === selectedHost);
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
		const healthyCount = Object.values(healthMap).filter((s) => s === 'healthy').length;
		return { publicCount, meshCount, healthyCount };
	});

	onMount(() => {
		async function refreshHealth() {
			healthMap = await fetchGatusStatuses();
		}

		refreshHealth();
		const interval = setInterval(refreshHealth, 30_000);
		return () => clearInterval(interval);
	});
</script>

<div class="space-y-8">
	<!-- Hero & Metrics Bar -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel shadow-xs">
		<div>
			<h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
				Welcome home
			</h2>
			<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
				Central gateway to self-hosted compute, storage, and AI agents.
			</p>
		</div>

		<div class="flex items-center gap-2 sm:gap-3 text-xs font-mono">
			<div class="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
				<span class="text-zinc-400">Total:</span>
				<span class="font-semibold text-zinc-900 dark:text-zinc-100 ml-1">{counts.total}</span>
			</div>
			<div class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
				<span>🌐 Public:</span>
				<span class="font-semibold ml-1">{metrics.publicCount}</span>
			</div>
			<div class="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
				<span>🔒 Mesh:</span>
				<span class="font-semibold ml-1">{metrics.meshCount}</span>
			</div>
		</div>
	</div>

	<!-- Filter Controls -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
		<HostFilter bind:selectedHost {counts} />

		{#if selectedHost !== 'all'}
			<button
				type="button"
				onclick={() => (selectedHost = 'all')}
				class="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline font-mono cursor-pointer"
			>
				Reset filter
			</button>
		{/if}
	</div>

	<!-- Category Sections -->
	<div class="space-y-10">
		{#if groupedServices.length === 0}
			<div class="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
				No services running on <span class="font-mono text-zinc-700 dark:text-zinc-300">{selectedHost}</span>.
			</div>
		{:else}
			{#each groupedServices as group (group.category)}
				<CategorySection
					category={group.category}
					services={group.services}
					{healthMap}
				/>
			{/each}
		{/if}
	</div>
</div>
