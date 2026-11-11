<script lang="ts">
	import type { HealthStatus } from '../types';

	let { status = 'unknown' }: { status: HealthStatus } = $props();

	let label = $derived.by(() => {
		switch (status) {
			case 'healthy':
				return 'Operational';
			case 'degraded':
				return 'Degraded';
			case 'down':
				return 'Offline';
			case 'checking':
				return 'Checking...';
			default:
				return 'Unknown';
		}
	});

	let colorClass = $derived.by(() => {
		switch (status) {
			case 'healthy':
				return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
			case 'degraded':
				return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
			case 'down':
				return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
			default:
				return 'bg-zinc-400/60 dark:bg-zinc-600/60';
		}
	});
</script>

<div class="inline-flex items-center gap-1.5" title={`Status: ${label}`}>
	<span class={`h-2 w-2 rounded-full transition-colors ${colorClass}`}></span>
	<span class="sr-only">{label}</span>
</div>
