<script lang="ts">
	import { resolveHealth } from '../data/gatus';
	import { getCategoryIcon } from '../portal';
	import type { HealthStatus, LayoutDensity, ServiceItem } from '../types';
	import ServiceCard from './ServiceCard.svelte';

	let {
		category,
		services,
		healthMap = {},
		density = 'comfortable',
		categoryIcons
	}: {
		category: string;
		services: ServiceItem[];
		healthMap?: Record<string, HealthStatus>;
		density?: LayoutDensity;
		categoryIcons?: Record<string, string>;
	} = $props();

	let containerClass = $derived(
		density === 'list'
			? 'space-y-1.5 flex flex-col'
			: density === 'compact'
				? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5'
				: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5'
	);
</script>

{#if services.length > 0}
	<section class="space-y-3">
		<div class="flex items-center gap-2">
			<span class="text-sm select-none" aria-hidden="true">{getCategoryIcon(category, categoryIcons)}</span>
			<h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
				{category}
			</h2>
			<span class="text-xs text-muted font-mono">
				({services.length})
			</span>
			<div class="flex-1 border-t border-line ml-2"></div>
		</div>

		<div class={containerClass}>
			{#each services as service (service.id)}
				{@const health = resolveHealth(service, healthMap)}
				<ServiceCard {service} {health} {density} />
			{/each}
		</div>
	</section>
{/if}
