<script lang="ts">
	import ThemeToggle from '@kleinbem/web-config/theme/toggle';
	import type { WeatherConfig } from '../types';
	import WeatherWidget from './WeatherWidget.svelte';

	let {
		title = 'Foyer',
		badge,
		subtitle,
		weather,
		onOpenSearch
	}: {
		title?: string;
		badge?: string;
		subtitle?: string;
		weather?: WeatherConfig;
		onOpenSearch: () => void;
	} = $props();

	let now = $state(new Date());

	// Refresh at minute boundaries instead of waking every second for an HH:MM display.
	$effect(() => {
		let timer: ReturnType<typeof setTimeout>;
		function scheduleNextMinute() {
			const current = new Date();
			now = current;
			const delayMs = (60 - current.getSeconds()) * 1000 - current.getMilliseconds() + 50;
			timer = setTimeout(scheduleNextMinute, delayMs);
		}
		scheduleNextMinute();
		return () => clearTimeout(timer);
	});

	let timeStr = $derived(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
	let dateStr = $derived(
		now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
	);
</script>

<svelte:document
	onvisibilitychange={() => {
		if (!document.hidden) now = new Date();
	}}
/>

<header class="sticky top-0 z-40 w-full border-b border-line glass-panel">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
		<div class="flex items-center gap-3 min-w-0">
			<span class="text-2xl select-none" aria-hidden="true">🏠</span>
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<h1 class="font-bold text-base tracking-tight text-heading truncate">
						{title}
					</h1>
					{#if badge}
						<span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-mono font-medium rounded bg-surface-high text-muted border border-line">
							{badge}
						</span>
					{/if}
				</div>
				{#if subtitle}
					<p class="text-[11px] text-muted font-mono hidden sm:block truncate">
						{subtitle}
					</p>
				{/if}
			</div>
		</div>

		<button
			type="button"
			onclick={onOpenSearch}
			class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-line bg-surface/80 hover:bg-surface-high text-muted hover:text-heading text-xs shadow-2xs transition-colors cursor-pointer max-w-xs w-full sm:w-64"
		>
			<svg aria-hidden="true" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<span class="flex-1 text-left truncate">Search services...</span>
			<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg text-muted border border-line">
				⌘K
			</kbd>
		</button>

		<div class="flex items-center gap-3 shrink-0">
			<div class="hidden md:flex flex-col text-right font-mono leading-none">
				<span class="text-xs font-semibold text-heading">{timeStr}</span>
				<span class="text-[10px] text-muted mt-0.5">{dateStr}</span>
			</div>

			{#if weather}
				<div class="hidden sm:block">
					<WeatherWidget config={weather} />
				</div>
			{/if}

			<div class="pl-1 border-l border-line">
				<ThemeToggle />
			</div>
		</div>
	</div>
</header>
