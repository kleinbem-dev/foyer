<script lang="ts">
	import type { HostInfo } from '../types';

	let {
		hosts,
		counts = {},
		selectedHost = $bindable('all')
	}: {
		hosts: HostInfo[];
		counts?: Record<string, number>;
		selectedHost?: string;
	} = $props();

	let copiedHost = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (copyTimer) clearTimeout(copyTimer);
		};
	});

	async function copyIp(ip: string, hostId: string) {
		try {
			await navigator.clipboard.writeText(ip);
			copiedHost = hostId;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copiedHost = null;
				copyTimer = null;
			}, 1500);
		} catch {}
	}

	function formatArch(arch: string): string {
		const lower = arch.toLowerCase();
		if (lower.includes('aarch64') || lower.includes('arm')) return 'ARM';
		if (lower.includes('x86_64') || lower.includes('amd64')) return 'x86';
		return arch;
	}
</script>

{#if hosts.length > 0}
	<section aria-label="Hosts" class="p-3.5 rounded-2xl glass-panel shadow-2xs">
		<div class="flex items-center justify-between mb-2.5 px-1">
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold text-heading">Hosts</span>
				<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-high text-muted">
					{hosts.length} {hosts.length === 1 ? 'node' : 'nodes'}
				</span>
			</div>
			<span class="text-[11px] text-muted font-mono hidden sm:inline">
				Click node to filter{hosts.some((h) => h.ip) ? ' · click IP to copy' : ''}
			</span>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
			{#each hosts as host (host.id)}
				{@const isSelected = selectedHost === host.id}
				{@const count = counts[host.id] ?? 0}
				<div
					class="group flex flex-col p-2.5 rounded-xl border transition-colors text-left {isSelected
						? 'bg-accent-soft border-accent/50 shadow-2xs ring-1 ring-accent/30'
						: 'bg-surface/60 border-line hover:bg-surface-high hover:border-outline/50'}"
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
							<span class="font-semibold text-xs text-heading group-hover:text-accent transition-colors font-mono truncate flex items-center gap-1">
								{#if host.icon}
									<span aria-hidden="true">{host.icon}</span>
								{/if}
								<span class="truncate">{host.name}</span>
							</span>
							<div class="flex items-center gap-1 shrink-0">
								{#if host.arch}
									<span class="text-[9px] font-mono uppercase px-1 rounded bg-surface-high text-muted">
										{formatArch(host.arch)}
									</span>
								{/if}
								<span class="text-[9px] font-mono px-1 rounded bg-surface-high text-muted" title="{count} services">
									{count}
								</span>
							</div>
						</div>

						<p class="text-[10px] text-muted line-clamp-1 leading-tight mb-2">
							{host.role}
						</p>
					</button>

					{#if host.ip}
						{@const ip = host.ip}
						<button
							type="button"
							onclick={() => copyIp(ip, host.id)}
							aria-label="Copy {host.name} IP address"
							class="mt-auto self-start text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-high hover:bg-accent-soft text-fg hover:text-accent-soft-fg transition-colors flex items-center gap-1 cursor-pointer"
							title="Copy IP"
						>
							<span>{copiedHost === host.id ? '✓ Copied' : ip}</span>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
