<script lang="ts">
	import { tick } from 'svelte';
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
	let dialogEl = $state<HTMLElement | null>(null);
	let copyNotice = $state<string | null>(null);

	let filtered = $derived.by(() => {
		const raw = query.trim();
		if (!raw) return services;

		// Command prefix: > query searches web
		if (raw.startsWith('>')) {
			return [];
		}

		let q = raw.toLowerCase();

		// Filter prefixes: #host, @cat, !net
		let hostFilter: string | null = null;
		let catFilter: string | null = null;
		let netFilter: string | null = null;

		const tokens = q.split(/\s+/);
		const words: string[] = [];

		for (const t of tokens) {
			if (t.startsWith('#')) {
				hostFilter = t.slice(1);
			} else if (t.startsWith('@')) {
				catFilter = t.slice(1);
			} else if (t.startsWith('!')) {
				netFilter = t.slice(1);
			} else {
				words.push(t);
			}
		}

		const matchText = words.join(' ');

		return services.filter((s) => {
			if (hostFilter && !s.host.toLowerCase().includes(hostFilter)) return false;
			if (catFilter && !s.category.toLowerCase().includes(catFilter)) return false;
			if (netFilter && !s.network.toLowerCase().includes(netFilter)) return false;
			if (!matchText) return true;

			return (
				s.name.toLowerCase().includes(matchText) ||
				s.description.toLowerCase().includes(matchText) ||
				s.category.toLowerCase().includes(matchText) ||
				s.host.toLowerCase().includes(matchText) ||
				s.tags?.some((t) => t.toLowerCase().includes(matchText))
			);
		});
	});

	$effect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		query = '';
		selectedIndex = 0;
		copyNotice = null;
		inputEl?.focus();
		return () => previous?.focus?.();
	});

	// When a result link has focus, move focus with the highlight so Enter opens the highlighted one.
	async function followSelection() {
		const active = document.activeElement;
		if (!(active instanceof HTMLAnchorElement) || !dialogEl?.contains(active)) return;
		await tick();
		dialogEl.querySelectorAll<HTMLAnchorElement>('a[data-result]')[selectedIndex]?.focus();
	}

	// Keep Tab inside the open dialog.
	function trapTab(e: KeyboardEvent) {
		if (!dialogEl) return;
		const focusable = Array.from(
			dialogEl.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;
		if (e.shiftKey && (active === first || !dialogEl.contains(active))) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !dialogEl.contains(active))) {
			e.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		// Reset selected index when query changes
		query;
		selectedIndex = 0;
	});

	async function copyCurrentUrl() {
		const selected = filtered[selectedIndex];
		if (!selected) return;
		try {
			await navigator.clipboard.writeText(selected.url);
			copyNotice = `Copied ${selected.name} URL`;
			setTimeout(() => (copyNotice = null), 1500);
		} catch (err) {
			console.error('Clipboard copy failed', err);
		}
	}

	function webSearch(term: string) {
		const clean = term.trim();
		if (!clean) return;
		window.open(`https://duckduckgo.com/?q=${encodeURIComponent(clean)}`, '_blank', 'noopener,noreferrer');
		open = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!open) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				open = true;
			}
			if (
				e.key === '/' &&
				!(e.metaKey || e.ctrlKey || e.altKey) &&
				!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '') &&
				!(document.activeElement as HTMLElement | null)?.isContentEditable
			) {
				e.preventDefault();
				open = true;
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		} else if (e.key === 'Tab') {
			trapTab(e);
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
			// Copy highlighted URL if input text isn't selected
			if (
				inputEl &&
				document.activeElement === inputEl &&
				inputEl.selectionStart === inputEl.selectionEnd &&
				filtered[selectedIndex]
			) {
				e.preventDefault();
				copyCurrentUrl();
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
			followSelection();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
			followSelection();
		} else if (e.key === 'Enter') {
			// A focused result link or button activates itself natively.
			if (e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement) return;
			e.preventDefault();
			if (query.trim().startsWith('>')) {
				webSearch(query.trim().slice(1));
				return;
			}
			const selected = filtered[selectedIndex];
			if (selected) {
				window.open(selected.url, '_blank', 'noopener,noreferrer');
				open = false;
			} else if (query.trim()) {
				webSearch(query);
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-zinc-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
		bind:this={dialogEl}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Search services"
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
					aria-label="Search services"
					placeholder="Search services (#host, @category, !public, >web)..."
					class="w-full py-3.5 px-3 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
				/>
				{#if copyNotice}
					<span class="text-xs text-emerald-600 dark:text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10">
						{copyNotice}
					</span>
				{:else}
					<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
						ESC
					</kbd>
				{/if}
			</div>

			<div class="overflow-y-auto p-2 divide-y divide-transparent">
				{#if query.trim().startsWith('>')}
					{@const searchTerm = query.trim().slice(1).trim()}
					<button
						type="button"
						onclick={() => webSearch(searchTerm)}
						class="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-left cursor-pointer"
					>
						<div class="flex items-center gap-3">
							<span class="text-xl">🔍</span>
							<div>
								<span class="font-medium text-xs">Search DuckDuckGo</span>
								<p class="text-[11px] text-zinc-500">"{searchTerm}"</p>
							</div>
						</div>
						<span class="text-xs font-mono text-zinc-400">↵ open</span>
					</button>
				{:else if filtered.length === 0}
					<div class="py-8 text-center space-y-2">
						<p class="text-sm text-zinc-500">No services found for "{query}".</p>
						<button
							type="button"
							onclick={() => webSearch(query)}
							class="text-xs text-brand hover:underline font-medium cursor-pointer"
						>
							Search web for "{query.trim()}" →
						</button>
					</div>
				{:else}
					{#each filtered as service, index (service.id)}
						{@const isSelected = index === selectedIndex}
						<a
							href={service.url}
							target="_blank"
							rel="noopener noreferrer"
							data-result
							onmousemove={() => {
								// mousemove, not mouseenter: scrolling under a still pointer fires enter only.
								if (selectedIndex === index) return;
								selectedIndex = index;
								followSelection();
							}}
							onfocus={() => (selectedIndex = index)}
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
				<span>↑↓ navigate · ⌘C copy URL</span>
				<span>↵ open</span>
				<span>{filtered.length} services</span>
			</div>
		</div>
	</div>
{/if}
