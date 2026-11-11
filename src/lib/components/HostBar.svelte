<script lang="ts">
	import type { HostNode } from '../types';
	import { FLEET_HOSTS } from '../data/hosts';

	let {
		selectedHost = $bindable('all')
	}: {
		selectedHost: HostNode | 'all';
	} = $props();

	let copiedHost = $state<string | null>(null);

	async function copyIp(ip: string, host: string) {
		try {
			await navigator.clipboard.writeText(ip);
			copiedHost = host;
			setTimeout(() => {
				copiedHost = null;
			}, 1500);
		} catch {}
	}
</script>

<div class="p-3.5 rounded-2xl glass-panel border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
	<div class="flex items-center justify-between mb-2.5 px-1">
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Fleet Conductors</span>
			<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
				{FLEET_HOSTS.length} nodes
			</span>
		</div>
		<span class="text-[11px] text-zinc-400 font-mono hidden sm:inline">
			Click node to filter · click IP to copy
		</span>
	</div>

	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
		{#each FLEET_HOSTS as host}
			{@const isSelected = selectedHost === host.id}
			<div
				class="group flex flex-col p-2.5 rounded-xl border transition-all text-left {isSelected ? 'bg-brand/10 border-brand/40 shadow-xs ring-1 ring-brand/30' : 'bg-white/60 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700'}"
			>
				<button
					type="button"
					aria-pressed={isSelected}
					onclick={() => {
						selectedHost = isSelected ? 'all' : host.id;
					}}
					class="flex-1 text-left cursor-pointer"
				>
					<div class="flex items-center justify-between gap-1 mb-1">
						<span class="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-brand transition-colors font-mono truncate">
							{host.name}
						</span>
						<span class="text-[9px] font-mono uppercase px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
							{host.arch.includes('aarch64') ? 'ARM' : 'x86'}
						</span>
					</div>

					<p class="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-tight mb-2">
						{host.role}
					</p>
				</button>

				<button
					type="button"
					onclick={() => copyIp(host.ip, host.id)}
					aria-label="Copy {host.name} IP address"
					class="mt-auto self-start text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
					title="Copy IP"
				>
					<span>{copiedHost === host.id ? '✓ Copied' : host.ip}</span>
				</button>
			</div>
		{/each}
	</div>
</div>
