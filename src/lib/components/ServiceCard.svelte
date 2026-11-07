<script lang="ts">
	import type { HealthStatus, ServiceItem } from '../types';
	import StatusDot from './StatusDot.svelte';

	let {
		service,
		health = 'unknown'
	}: {
		service: ServiceItem;
		health?: HealthStatus;
	} = $props();

	let networkBadge = $derived.by(() => {
		switch (service.network) {
			case 'public':
				return { label: 'Public', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: '🌐' };
			case 'mesh':
				return { label: 'Mesh', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', icon: '🔒' };
			case 'lan':
				return { label: 'LAN', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: '🏠' };
		}
	});
</script>

<a
	href={service.url}
	target="_blank"
	rel="noopener noreferrer"
	class="group relative flex flex-col justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 shadow-xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5"
>
	<div>
		<div class="flex items-start justify-between gap-2 mb-2.5">
			<div class="flex items-center gap-2.5">
				<span class="text-2xl select-none group-hover:scale-110 transition-transform duration-150">
					{service.icon}
				</span>
				<div>
					<h3 class="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-brand transition-colors">
						{service.name}
					</h3>
					<span class="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
						{service.host}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<StatusDot status={health} />
				<span
					class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border {networkBadge.bg}"
					title={`${networkBadge.label} network endpoint`}
				>
					<span>{networkBadge.icon}</span>
					<span>{networkBadge.label}</span>
				</span>
			</div>
		</div>

		<p class="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
			{service.description}
		</p>
	</div>

	<div class="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
		<span class="truncate max-w-[200px]">{service.url.replace(/^https?:\/\//, '')}</span>
		<svg
			class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 dark:text-zinc-300"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
		</svg>
	</div>
</a>
