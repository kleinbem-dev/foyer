<script lang="ts">
	import StatusDot from '@kleinbem/web-config/components/StatusDot';
	import type { HealthStatus, LayoutDensity, ServiceItem } from '../types';

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

	$effect(() => () => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	const NETWORK_BADGES = {
		public: { label: 'Public', bg: 'bg-status-success-soft text-status-success border-status-success-border', icon: '🌐' },
		mesh: { label: 'Mesh', bg: 'bg-status-info-soft text-status-info border-status-info-border', icon: '🔒' },
		lan: { label: 'LAN', bg: 'bg-status-warning-soft text-status-warning border-status-warning-border', icon: '🏠' }
	} as const;

	let networkBadge = $derived(NETWORK_BADGES[service.network]);
	let displayUrl = $derived(service.url.replace(/^https?:\/\//, ''));

	async function copyUrl() {
		try {
			await navigator.clipboard.writeText(service.url);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copied = false;
				copyTimer = null;
			}, 1500);
		} catch {}
	}
</script>

{#snippet netBadge(hideLabelMobile: boolean)}
	<span
		class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border {networkBadge.bg}"
		title="{networkBadge.label} network endpoint"
	>
		<span aria-hidden="true">{networkBadge.icon}</span>
		<span class={hideLabelMobile ? 'hidden sm:inline' : ''}>{networkBadge.label}</span>
	</span>
{/snippet}

{#snippet copyBtn(label: string, cls: string)}
	<button
		type="button"
		onclick={copyUrl}
		aria-label="Copy {service.name} URL"
		class="{cls} cursor-pointer"
		title="Copy URL"
	>
		{label}
	</button>
{/snippet}

{#if density === 'compact'}
	<div class="group relative flex items-center justify-between p-3 rounded-xl border border-line bg-surface/80 hover:bg-surface-high shadow-2xs hover:shadow-xs transition-all duration-150 hover:-translate-y-0.5">
		<a
			href={service.url}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-2.5 min-w-0 flex-1 mr-2"
			title={service.description || undefined}
		>
			<span aria-hidden="true" class="text-xl select-none group-hover:scale-110 transition-transform">{service.icon}</span>
			<div class="min-w-0 flex-1">
				<h3 class="font-semibold text-xs text-heading group-hover:text-accent transition-colors truncate">{service.name}</h3>
				<span class="text-[10px] font-mono text-muted block truncate">{service.host}</span>
			</div>
		</a>
		<div class="flex items-center gap-1.5 shrink-0">
			<StatusDot status={health} />
			{@render copyBtn(copied ? '✓' : '📋', 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-heading p-1 rounded transition-opacity text-[10px] font-mono')}
		</div>
	</div>
{:else if density === 'list'}
	<div class="group flex items-center justify-between py-2 px-3 rounded-xl border border-line bg-surface/70 hover:bg-surface-high shadow-2xs hover:shadow-xs transition-colors">
		<a href={service.url} target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 min-w-0 flex-1 mr-4">
			<span aria-hidden="true" class="text-xl select-none group-hover:scale-110 transition-transform shrink-0">{service.icon}</span>
			<div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
				<div class="sm:col-span-4 min-w-0">
					<h3 class="font-semibold text-xs text-heading group-hover:text-accent transition-colors truncate">{service.name}</h3>
					{#if service.description}
						<span class="text-[10px] text-muted line-clamp-1">{service.description}</span>
					{/if}
				</div>
				<div class="sm:col-span-4 hidden sm:block min-w-0">
					<span class="text-[11px] font-mono text-muted truncate block">{displayUrl}</span>
				</div>
				<div class="sm:col-span-4 flex items-center gap-2">
					<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-high text-muted">{service.host}</span>
					<span class="text-[10px] font-mono text-muted">{service.category}</span>
				</div>
			</div>
		</a>
		<div class="flex items-center gap-2 shrink-0">
			{@render netBadge(true)}
			<StatusDot status={health} />
			{@render copyBtn(copied ? '✓' : '📋', 'text-muted hover:text-heading p-1 rounded transition-colors text-xs font-mono')}
		</div>
	</div>
{:else}
	<div class="group relative flex flex-col justify-between p-4 rounded-xl border border-line bg-surface/80 hover:bg-surface-high shadow-xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
		<div>
			<div class="flex items-start justify-between gap-2 mb-2.5">
				<a href={service.url} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 flex-1 min-w-0">
					<span aria-hidden="true" class="text-2xl select-none group-hover:scale-110 transition-transform duration-150">{service.icon}</span>
					<div class="min-w-0">
						<h3 class="font-semibold text-sm text-heading group-hover:text-accent transition-colors truncate">{service.name}</h3>
						<span class="text-[11px] font-mono text-muted">{service.host}</span>
					</div>
				</a>
				<div class="flex items-center gap-1.5 shrink-0">
					<StatusDot status={health} />
					{@render netBadge(false)}
				</div>
			</div>
			{#if service.description}
				<p class="text-xs text-fg line-clamp-2 leading-relaxed">{service.description}</p>
			{/if}
		</div>
		<div class="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-[11px] text-muted font-mono">
			<span class="truncate max-w-[200px]">{displayUrl}</span>
			{@render copyBtn(copied ? '✓ Copied' : 'Copy', 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-heading transition-opacity p-0.5')}
		</div>
	</div>
{/if}
