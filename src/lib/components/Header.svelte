<script lang="ts">
	import { onMount } from 'svelte';
	import ThemeToggle from '@kleinbem/web-config/theme/toggle';
	import WeatherWidget from './WeatherWidget.svelte';

	let { onOpenSearch }: { onOpenSearch: () => void } = $props();

	let now = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(interval);
	});

	let timeStr = $derived(
		now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	);
	let dateStr = $derived(
		now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
	);
</script>

<header class="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 glass-panel">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
		<!-- Brand / Logo -->
		<div class="flex items-center gap-3">
			<span class="text-2xl select-none">🏠</span>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
						Foyer
					</h1>
					<span class="text-[10px] uppercase tracking-wider px-1.5 py-0.2 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
						fleet
					</span>
				</div>
				<p class="text-[11px] text-zinc-500 font-mono hidden sm:block">
					home.kleinbem.dev
				</p>
			</div>
		</div>

		<!-- Search Trigger button -->
		<button
			type="button"
			onclick={onOpenSearch}
			class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs shadow-2xs transition-all cursor-pointer max-w-xs w-full sm:w-64"
		>
			<svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<span class="flex-1 text-left truncate">Search services...</span>
			<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
				⌘K
			</kbd>
		</button>

		<!-- Right side widgets & controls -->
		<div class="flex items-center gap-3">
			<!-- Date & Time -->
			<div class="hidden md:flex flex-col text-right font-mono leading-none">
				<span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{timeStr}</span>
				<span class="text-[10px] text-zinc-400 mt-0.5">{dateStr}</span>
			</div>

			<!-- Weather -->
			<div class="hidden sm:block">
				<WeatherWidget />
			</div>

			<!-- Theme Toggle -->
			<div class="pl-1 border-l border-zinc-200 dark:border-zinc-800">
				<ThemeToggle />
			</div>
		</div>
	</div>
</header>
