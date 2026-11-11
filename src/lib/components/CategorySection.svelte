<script lang="ts">
	import type { HealthStatus, LayoutDensity, ServiceCategory, ServiceItem } from '../types';
	import ServiceCard from './ServiceCard.svelte';

	let {
		category,
		services,
		healthMap = {},
		density = 'comfortable'
	}: {
		category: ServiceCategory;
		services: ServiceItem[];
		healthMap?: Record<string, HealthStatus>;
		density?: LayoutDensity;
	} = $props();

	function getCategoryIcon(cat: ServiceCategory): string {
		switch (cat) {
			case 'Infrastructure':
				return '⚡';
			case 'Identity':
				return '🛡️';
			case 'AI':
				return '🤖';
			case 'AI Engineering':
				return '🧬';
			case 'Dev':
				return '💻';
			case 'Apps':
				return '📱';
			case 'Documents':
				return '📁';
			case 'Security':
				return '🔒';
			case 'Media':
				return '📻';
			default:
				return '📦';
		}
	}

	let containerClass = $derived.by(() => {
		switch (density) {
			case 'list':
				return 'space-y-1.5 flex flex-col';
			case 'compact':
				return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5';
			default:
				return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5';
		}
	});
</script>

{#if services.length > 0}
	<section class="space-y-3">
		<div class="flex items-center gap-2">
			<span class="text-sm select-none">{getCategoryIcon(category)}</span>
			<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
				{category}
			</h2>
			<span class="text-xs text-zinc-400 dark:text-zinc-600 font-mono">
				({services.length})
			</span>
			<div class="flex-1 border-t border-zinc-200/60 dark:border-zinc-800/60 ml-2"></div>
		</div>

		<div class={containerClass}>
			{#each services as service (service.id)}
				{@const normKey = service.id.toLowerCase().replace(/[^a-z0-9]/g, '')}
				{@const health = service.gatusEndpoint ? (healthMap[service.gatusEndpoint] ?? healthMap[normKey] ?? 'unknown') : 'unknown'}
				<ServiceCard {service} {health} {density} />
			{/each}
		</div>
	</section>
{/if}
