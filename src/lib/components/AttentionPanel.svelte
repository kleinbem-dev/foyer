<script lang="ts">
	import { formatRelativeTime } from '../portal';
	import type { AttentionItem, AttentionSeverity } from '../types';

	const COLLAPSED_COUNT = 5;

	let { items }: { items: AttentionItem[] } = $props();

	let expanded = $state(false);
	let visible = $derived(expanded ? items : items.slice(0, COLLAPSED_COUNT));
	let worst = $derived<AttentionSeverity>(
		items.some((i) => i.severity === 'critical') ? 'critical'
		: items.some((i) => i.severity === 'warning') ? 'warning'
		: 'info'
	);

	const SEVERITY = {
		critical: { icon: '🔴', label: 'Critical', border: 'border-status-danger-border', text: 'text-status-danger' },
		warning: { icon: '🟠', label: 'Warning', border: 'border-status-warning-border', text: 'text-status-warning' },
		info: { icon: '🔵', label: 'Info', border: 'border-line', text: 'text-heading' }
	} as const;
</script>

{#if items.length > 0}
	<section aria-label="Needs attention" class="p-3.5 rounded-2xl glass-panel shadow-2xs border {SEVERITY[worst].border}">
		<div class="flex items-center gap-2 mb-2 px-1">
			<h2 class="text-xs font-semibold {SEVERITY[worst].text}">Needs attention</h2>
			<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-high text-muted">{items.length}</span>
		</div>

		<ul class="space-y-1">
			{#each visible as item (item.id)}
				{@const sev = SEVERITY[item.severity]}
				{@const when = formatRelativeTime(item.updatedAt)}
				<li class="flex items-start gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-high/60 transition-colors">
					<span class="text-[10px] leading-5 select-none shrink-0" role="img" aria-label={sev.label}>{sev.icon}</span>
					<div class="min-w-0 flex-1">
						{#if item.url}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-xs font-medium text-heading hover:text-accent hover:underline break-words"
							>
								{item.title}
							</a>
						{:else}
							<span class="text-xs font-medium text-heading break-words">{item.title}</span>
						{/if}
						{#if item.detail}
							<p class="text-[11px] text-muted font-mono line-clamp-2" title={item.detail}>{item.detail}</p>
						{/if}
					</div>
					<div class="flex items-center gap-2 shrink-0 text-[10px] font-mono text-muted leading-5">
						{#if item.source}
							<span class="px-1.5 rounded bg-surface-high">{item.source}</span>
						{/if}
						{#if when}
							<time datetime={item.updatedAt}>{when}</time>
						{/if}
					</div>
				</li>
			{/each}
		</ul>

		{#if items.length > COLLAPSED_COUNT}
			<button
				type="button"
				aria-expanded={expanded}
				onclick={() => (expanded = !expanded)}
				class="mt-1.5 ml-2 text-[11px] font-mono text-accent hover:underline cursor-pointer"
			>
				{expanded ? 'Show fewer' : `Show ${items.length - COLLAPSED_COUNT} more`}
			</button>
		{/if}
	</section>
{/if}
