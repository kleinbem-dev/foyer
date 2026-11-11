<script lang="ts">
	import type { ServiceItem, HealthStatus, LayoutDensity } from '../types';
	import StatusDot from './StatusDot.svelte';

	let {
		service,
		health = 'unknown',
		density = 'comfortable'
	}: {
		service: ServiceItem;
		health?: HealthStatus;
		density?: LayoutDensity;
	} = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

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

	async function copyUrl(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(service.url);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copied = false;
				copyTimer = null;
			}, 1500);
		} catch (err) {
			console.error('Failed to copy URL', err);
		}
	}
</script>

{#if density === 'compact'}
	<!-- Compact Grid Item -->
	<div
		class="group relative flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 shadow-2xs hover:shadow-xs transition-all duration-150 hover:-translate-y-0.5"
	>
		<a
			href={service.url}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-2.5 min-w-0 flex-1 mr-2"
			title={service.description}
		>
			<span class="text-xl select-none group-hover:scale-110 transition-transform">
				{service.icon}
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-brand transition-colors truncate">
					{service.name}
				</h3>
				<span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block truncate">
					{service.host}
				</span>
			</div>
		</a>

		<div class="flex items-center gap-1.5 shrink-0">
			<StatusDot status={health} />
			<button
				type="button"
				onclick={copyUrl}
				aria-label="Copy {service.name} URL"
				class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded transition-opacity cursor-pointer"
				title="Copy URL"
			>
				<span class="text-[10px] font-mono">{copied ? '✓' : '📋'}</span>
			</button>
		</div>
	</div>
{:else if density === 'list'}
	<!-- List Row Item -->
	<div
		class="group flex items-center justify-between py-2 px-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-800/80 shadow-2xs hover:shadow-xs transition-all"
	>
		<a
			href={service.url}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-3 min-w-0 flex-1 mr-4"
		>
			<span class="text-xl select-none group-hover:scale-110 transition-transform shrink-0">
				{service.icon}
			</span>

			<div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
				<div class="sm:col-span-4 min-w-0">
					<h3 class="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-brand transition-colors truncate">
						{service.name}
					</h3>
					<span class="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
						{service.description}
					</span>
				</div>

				<div class="sm:col-span-4 hidden sm:block min-w-0">
					<span class="text-[11px] font-mono text-zinc-400 truncate block">
						{service.url.replace(/^https?:\/\//, '')}
					</span>
				</div>

				<div class="sm:col-span-4 flex items-center gap-2">
					<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
						{service.host}
					</span>
					<span class="text-[10px] font-mono text-zinc-400">
						{service.category}
					</span>
				</div>
			</div>
		</a>

		<div class="flex items-center gap-2 shrink-0">
			<span
				class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border {networkBadge.bg}"
				title={`${networkBadge.label} network endpoint`}
			>
				<span>{networkBadge.icon}</span>
				<span class="hidden sm:inline">{networkBadge.label}</span>
			</span>

			<StatusDot status={health} />

			<button
				type="button"
				onclick={copyUrl}
				aria-label="Copy {service.name} URL"
				class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded transition-colors cursor-pointer text-xs font-mono"
				title="Copy URL"
			>
				{copied ? '✓' : '📋'}
			</button>

			<a
				href={service.url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
				title="Open link"
			>
				<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
				</svg>
			</a>
		</div>
	</div>
{:else}
	<!-- Comfortable Card (Default) -->
	<div
		class="group relative flex flex-col justify-between p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 shadow-xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5"
	>
		<div>
			<div class="flex items-start justify-between gap-2 mb-2.5">
				<a
					href={service.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2.5 flex-1 min-w-0"
				>
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
				</a>

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
			<a
				href={service.url}
				target="_blank"
				rel="noopener noreferrer"
				class="truncate max-w-[200px] hover:text-brand transition-colors"
			>
				{service.url.replace(/^https?:\/\//, '')}
			</a>
			<div class="flex items-center gap-1.5">
				<button
					type="button"
					onclick={copyUrl}
					aria-label="Copy {service.name} URL"
					class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-zinc-800 dark:hover:text-zinc-200 transition-opacity p-0.5 cursor-pointer"
					title="Copy URL"
				>
					<span>{copied ? '✓ Copied' : 'Copy'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
