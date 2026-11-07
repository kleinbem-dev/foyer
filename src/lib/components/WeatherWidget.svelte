<script lang="ts">
	import { onMount } from 'svelte';

	interface WeatherData {
		temp: number;
		condition: string;
		icon: string;
	}

	let weather = $state<WeatherData | null>(null);
	let loading = $state(true);

	function getWeatherIcon(code: number): { icon: string; condition: string } {
		if (code === 0) return { icon: '☀️', condition: 'Clear' };
		if (code === 1 || code === 2) return { icon: '🌤️', condition: 'Partly Cloudy' };
		if (code === 3) return { icon: '☁️', condition: 'Overcast' };
		if (code >= 45 && code <= 48) return { icon: '🌫️', condition: 'Foggy' };
		if (code >= 51 && code <= 67) return { icon: '🌧️', condition: 'Rain' };
		if (code >= 71 && code <= 77) return { icon: '🌨️', condition: 'Snow' };
		if (code >= 80 && code <= 82) return { icon: '🌦️', condition: 'Showers' };
		if (code >= 95) return { icon: '⛈️', condition: 'Thunderstorm' };
		return { icon: '⛅', condition: 'Fair' };
	}

	onMount(() => {
		async function loadWeather() {
			try {
				const res = await fetch(
					'https://api.open-meteo.com/v1/forecast?latitude=52.02&longitude=-8.34&current=temperature_2m,weather_code&timezone=Europe%2FDublin',
					{ signal: AbortSignal.timeout(5000) }
				);
				if (!res.ok) throw new Error('Weather fetch failed');
				const data = await res.json();
				const cur = data.current;
				const { icon, condition } = getWeatherIcon(cur.weather_code);
				weather = {
					temp: Math.round(cur.temperature_2m),
					condition,
					icon
				};
			} catch {
				// Silently fail gracefully
			} finally {
				loading = false;
			}
		}

		loadWeather();
		const interval = setInterval(loadWeather, 15 * 60 * 1000);
		return () => clearInterval(interval);
	});
</script>

{#if weather}
	<div
		class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs"
		title={`Watergrasshill: ${weather.condition}`}
	>
		<span>{weather.icon}</span>
		<span>{weather.temp}°C</span>
	</div>
{:else if loading}
	<div class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 dark:text-zinc-500 rounded-full bg-zinc-100/50 dark:bg-zinc-800/40">
		<span class="animate-pulse">⛅ --°C</span>
	</div>
{/if}
