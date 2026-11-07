<script lang="ts">
	import type { ServiceItem } from '../types';

	let {
		services,
		open = $bindable(false)
	}: {
		services: ServiceItem[];
		open: boolean;
	} = $props();

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return services;
		return services.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.description.toLowerCase().includes(q) ||
				s.category.toLowerCase().includes(q) ||
				s.host.toLowerCase().includes(q) ||
				s.tags?.some((t) => t.toLowerCase().includes(q))
		);
	});

	$effect(() => {
		if (open) {
			query = '';
			selectedIndex = 0;
			setTimeout(() => inputEl?.focus(), 50);
		}
	});

	$effect(() => {
		// Reset selected index when query changes
		query;
		selectedIndex = 0;
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (!open) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				open = true;
			}
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
				e.preventDefault();
				open = true;
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const selected = filtered[selectedIndex];
			if (selected) {
				window.open(selected.url, '_blank', 'noopener,noreferrer');
				open = false;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-zinc-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') open = false;
		}}
	>
		<div
			class="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
		>
			<div class="flex items-center px-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
				<svg class="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					placeholder="Search services, categories, hosts, or tags... (Esc to close)"
					class="w-full py-3.5 px-3 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
				/>
				<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
					ESC
				</kbd>
			</div>

			<div class="overflow-y-auto p-2 divide-y divide-transparent">
				{#if filtered.length === 0}
					<div class="py-12 text-center text-sm text-zinc-500">
						No services found for "{query}".
					</div>
				{:else}
					{#each filtered as service, index (service.id)}
						{@const isSelected = index === selectedIndex}
						<a
							href={service.url}
							target="_blank"
							rel="noopener noreferrer"
							onmouseenter={() => (selectedIndex = index)}
							onclick={() => (open = false)}
							class="flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors {isSelected
								? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
								: 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}"
						>
							<div class="flex items-center gap-3 min-w-0">
								<span class="text-xl select-none shrink-0">{service.icon}</span>
								<div class="truncate">
									<div class="flex items-center gap-2">
										<span class="font-medium text-zinc-900 dark:text-zinc-100">{service.name}</span>
										<span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 font-mono">
											{service.category}
										</span>
									</div>
									<p class="text-xs text-zinc-500 truncate mt-0.5">{service.description}</p>
								</div>
							</div>

							<div class="flex items-center gap-2 shrink-0 ml-3">
								<span class="text-[11px] font-mono text-zinc-400">{service.host}</span>
								{#if isSelected}
									<span class="text-[11px] text-zinc-400 font-mono">↵ open</span>
								{/if}
							</div>
						</a>
					{/each}
				{/if}
			</div>

			<div class="px-4 py-2 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
				<span>↑↓ to navigate</span>
				<span>↵ to open</span>
				<span>{filtered.length} services</span>
			</div>
		</div>
	</div>
{/if}
