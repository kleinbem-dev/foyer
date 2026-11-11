<script lang="ts">
	import '../app.css';
	import Header from '#lib/components/Header.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import { FLEET_SERVICES } from '#lib/data/services';

	let { children } = $props();
	let commandPaletteOpen = $state(false);
</script>

<div class="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
	<Header onOpenSearch={() => (commandPaletteOpen = true)} />

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>

	<footer class="py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 text-center text-xs text-zinc-400 font-mono">
		<div class="flex items-center justify-center gap-3">
			<span>foyer</span>
			<span>•</span>
			<span>kleinbem fleet</span>
			<span>•</span>
			<a href="https://status.kleinbem.dev" target="_blank" rel="noopener noreferrer" class="hover:underline text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
				fleet status
			</a>
			<span>•</span>
			<a href="https://github.com/kleinbem-dev/foyer" target="_blank" rel="noopener noreferrer" class="hover:underline text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
				source
			</a>
		</div>
	</footer>

	<CommandPalette services={FLEET_SERVICES} bind:open={commandPaletteOpen} />
</div>
