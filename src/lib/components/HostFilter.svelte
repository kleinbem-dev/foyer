<script lang="ts">
	import type { HostNode } from '../types';

	let {
		selectedHost = $bindable('all'),
		counts
	}: {
		selectedHost: HostNode | 'all';
		counts: Record<string, number>;
	} = $props();

	const hosts: Array<{ id: HostNode | 'all'; label: string; icon: string }> = [
		{ id: 'all', label: 'All Hosts', icon: '🌐' },
		{ id: 'core-pi', label: 'core-pi', icon: '🍓' },
		{ id: 'nixos-nvme', label: 'nixos-nvme', icon: '⚡' },
		{ id: 'mac-mini', label: 'mac-mini', icon: '🍎' },
		{ id: 'nasbook', label: 'nasbook', icon: '🗄️' },
		{ id: 'orin-nano', label: 'orin-nano', icon: '🧠' }
	];
</script>

<div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
	{#each hosts as h}
		{@const active = selectedHost === h.id}
		{@const count = h.id === 'all' ? counts.total : (counts[h.id] ?? 0)}
		{#if h.id === 'all' || count > 0}
			<button
				type="button"
				onclick={() => (selectedHost = h.id)}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer select-none
					{active
						? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
						: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'}"
			>
				<span>{h.icon}</span>
				<span>{h.label}</span>
				<span
					class="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] {active
						? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
						: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}"
				>
					{count}
				</span>
			</button>
		{/if}
	{/each}
</div>
