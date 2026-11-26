<script lang="ts">
	import { fetchWeather, type WeatherSnapshot } from '../portal';
	import type { WeatherConfig } from '../types';

	let { config }: { config: WeatherConfig } = $props();

	let weather = $state.raw<WeatherSnapshot | null>(null);
	let loading = $state(true);

	$effect(() => {
		const target = config;
		const controller = new AbortController();
		let inFlight = false;

		async function refresh() {
			if (inFlight || document.hidden) return;
			inFlight = true;
			try {
				const next = await fetchWeather(target, controller.signal);
				if (next) weather = next;
			} finally {
				inFlight = false;
				loading = false;
			}
		}

		function onVisibilityChange() {
			if (!document.hidden) refresh();
		}

		refresh();
		document.addEventListener('visibilitychange', onVisibilityChange);
		const interval = setInterval(refresh, 15 * 60 * 1000);
		return () => {
			controller.abort();
			document.removeEventListener('visibilitychange', onVisibilityChange);
			clearInterval(interval);
		};
	});

	let tooltip = $derived(
		weather
			? config.label
				? `${config.label}: ${weather.condition}`
				: weather.condition
			: ''
	);
</script>

{#if weather}
	<div
		class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-surface-high text-fg border border-line shadow-2xs"
		title={tooltip}
	>
		<span aria-hidden="true">{weather.icon}</span>
		<span>{weather.temp}°C</span>
	</div>
{:else if loading}
	<div
		class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted rounded-full bg-surface/60"
		aria-label="Loading weather"
	>
		<span class="motion-safe:animate-pulse">⛅ --°C</span>
	</div>
{/if}
