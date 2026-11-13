<script lang="ts">
	import { tick } from 'svelte';
	import { DEFAULT_SEARCH_URL_TEMPLATE } from '../config';
	import {
		buildPaletteEntries,
		filterPaletteEntries,
		formatWebSearchUrl,
		type PaletteEntry
	} from '../portal';
	import type { HostInfo, PinnedBookmark, ServiceItem } from '../types';

	let {
		services,
		bookmarks = [],
		hosts = [],
		searchUrlTemplate = DEFAULT_SEARCH_URL_TEMPLATE,
		onSelectHost,
		open = $bindable(false)
	}: {
		services: ServiceItem[];
		bookmarks?: PinnedBookmark[];
		hosts?: HostInfo[];
		searchUrlTemplate?: string;
		onSelectHost?: (hostId: string) => void;
		open: boolean;
	} = $props();

	const uid = $props.id();
	const listboxId = `${uid}-results`;
	const optionId = (index: number) => `${uid}-opt-${index}`;

	let query = $state('');
	let copyNotice = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;
	let dialogEl = $state<HTMLDialogElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);

	let entries = $derived(buildPaletteEntries(services, bookmarks, hosts));
	let filtered = $derived(filterPaletteEntries(entries, query));

	// Writable derived: resets selection to 0 whenever query or filtered bounds change without an $effect mutation.
	let selectedIndex = $derived.by(() => {
		void query;
		void filtered.length;
		return 0;
	});

	$effect(() => {
		return () => {
			if (copyTimer) clearTimeout(copyTimer);
		};
	});

	$effect(() => {
		if (open && dialogEl && !dialogEl.open) {
			dialogEl.showModal();
			inputEl?.focus();
		}
	});

	function closePalette() {
		dialogEl?.close();
		open = false;
	}

	async function scrollActiveIntoView() {
		await tick();
		listEl?.querySelector<HTMLElement>(`#${CSS.escape(optionId(selectedIndex))}`)?.scrollIntoView({
			block: 'nearest'
		});
	}

	async function copySelectedValue() {
		const selected = filtered[selectedIndex];
		const value = selected?.url ?? selected?.ip;
		if (!selected || !value) return;
		try {
			await navigator.clipboard.writeText(value);
			copyNotice = `Copied ${selected.name}`;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copyNotice = null;
				copyTimer = null;
			}, 1500);
		} catch {}
	}

	function webSearch(term: string) {
		const targetUrl = formatWebSearchUrl(term, searchUrlTemplate);
		if (!targetUrl) return;
		window.open(targetUrl, '_blank', 'noopener,noreferrer');
		closePalette();
	}

	function activateEntry(entry: PaletteEntry) {
		if (entry.kind === 'host' && entry.host) {
			onSelectHost?.(entry.host);
			closePalette();
			return;
		}
		if (entry.url) {
			window.open(entry.url, '_blank', 'noopener,noreferrer');
			closePalette();
		}
	}

	function handleWindowKeyDown(e: KeyboardEvent) {
		if (!open) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				query = '';
				copyNotice = null;
				open = true;
			} else if (
				e.key === '/' &&
				!(e.metaKey || e.ctrlKey || e.altKey) &&
				!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '') &&
				!(document.activeElement as HTMLElement | null)?.isContentEditable
			) {
				e.preventDefault();
				query = '';
				copyNotice = null;
				open = true;
			}
		}
	}

	function handleDialogKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
			if (
				inputEl &&
				document.activeElement === inputEl &&
				inputEl.selectionStart === inputEl.selectionEnd &&
				filtered[selectedIndex]
			) {
				e.preventDefault();
				copySelectedValue();
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filtered.length > 0) {
				selectedIndex = (selectedIndex + 1) % filtered.length;
				scrollActiveIntoView();
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filtered.length > 0) {
				selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
				scrollActiveIntoView();
			}
		} else if (e.key === 'Enter') {
			if (e.target instanceof HTMLButtonElement) return;
			e.preventDefault();
			const trimmed = query.trim();
			if (trimmed.startsWith('>')) {
				webSearch(trimmed.slice(1));
				return;
			}
			const selected = filtered[selectedIndex];
			if (selected) {
				activateEntry(selected);
			} else if (trimmed) {
				webSearch(trimmed);
			}
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

{#if open}
	<dialog
		bind:this={dialogEl}
		closedby="any"
		aria-label="Search services"
		onclose={() => {
			open = false;
			query = '';
			copyNotice = null;
		}}
		onclick={(e) => {
			if (e.target === e.currentTarget) closePalette();
		}}
		onkeydown={handleDialogKeyDown}
		class="mx-auto mt-20 sm:mt-28 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl overflow-hidden"
	>
		<div class="flex flex-col max-h-[75vh]">
			<div class="flex items-center px-4 border-b border-line">
				<svg aria-hidden="true" class="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					role="combobox"
					aria-label="Search services"
					aria-expanded="true"
					aria-controls={listboxId}
					aria-autocomplete="list"
					aria-activedescendant={selectedIndex < filtered.length ? optionId(selectedIndex) : undefined}
					placeholder="Search services, pinned links, or hosts (#host, @category, !public, >web)..."
					class="w-full py-3.5 px-3 text-sm bg-transparent outline-none text-heading placeholder:text-muted"
				/>
				{#if copyNotice}
					<span role="status" class="text-xs text-status-success font-mono px-2 py-0.5 rounded bg-status-success-soft shrink-0">
						{copyNotice}
					</span>
				{:else}
					<kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-high text-muted border border-line">
						ESC
					</kbd>
				{/if}
			</div>

			<div
				bind:this={listEl}
				id={listboxId}
				role="listbox"
				aria-label="Search results"
				class="overflow-y-auto p-2"
			>
				{#if query.trim().startsWith('>')}
					{@const searchTerm = query.trim().slice(1).trim()}
					<button
						type="button"
						onclick={() => webSearch(searchTerm)}
						disabled={!searchTerm}
						class="w-full flex items-center justify-between p-3 rounded-xl bg-surface-high text-heading text-left cursor-pointer disabled:opacity-50"
					>
						<div class="flex items-center gap-3 min-w-0">
							<span aria-hidden="true" class="text-xl">🔍</span>
							<div class="truncate">
								<span class="font-medium text-xs">Search Web</span>
								<p class="text-[11px] text-muted truncate">{searchTerm ? `"${searchTerm}"` : 'Type a search query...'}</p>
							</div>
						</div>
						<span class="text-xs font-mono text-muted">↵ open</span>
					</button>
				{:else if filtered.length === 0}
					<div class="py-8 text-center space-y-2">
						<p class="text-sm text-muted">
							{query.trim() ? `No matches found for "${query.trim()}".` : 'No services configured yet.'}
						</p>
						{#if query.trim()}
							<button
								type="button"
								onclick={() => webSearch(query)}
								class="text-xs text-accent hover:underline font-medium cursor-pointer"
							>
								Search web for "{query.trim()}" →
							</button>
						{/if}
					</div>
				{:else}
					{#each filtered as entry, index (entry.id)}
						{@const isSelected = index === selectedIndex}
						<button
							type="button"
							id={optionId(index)}
							role="option"
							aria-selected={isSelected}
							tabindex="-1"
							onmousemove={() => {
								if (selectedIndex !== index) selectedIndex = index;
							}}
							onclick={() => activateEntry(entry)}
							class="w-full text-left flex items-center justify-between p-2.5 rounded-xl text-sm transition-colors cursor-pointer {isSelected
								? 'bg-surface-high text-heading'
								: 'text-fg hover:bg-surface-high/60'}"
						>
							<div class="flex items-center gap-3 min-w-0">
								<span aria-hidden="true" class="text-xl select-none shrink-0">{entry.icon}</span>
								<div class="truncate">
									<div class="flex items-center gap-2">
										<span class="font-medium text-heading truncate">{entry.name}</span>
										<span class="text-[10px] px-1.5 py-0.5 rounded bg-bg text-muted font-mono border border-line">
											{entry.category}
										</span>
									</div>
									{#if entry.description}
										<p class="text-xs text-muted truncate mt-0.5">{entry.description}</p>
									{/if}
								</div>
							</div>

							<div class="flex items-center gap-2 shrink-0 ml-3">
								{#if entry.host && entry.kind === 'service'}
									<span class="text-[11px] font-mono text-muted">{entry.host}</span>
								{/if}
								{#if isSelected}
									<span class="text-[11px] text-muted font-mono">
										{entry.kind === 'host' ? '↵ filter' : '↵ open'}
									</span>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<div class="px-4 py-2 bg-bg/60 border-t border-line flex items-center justify-between text-[11px] text-muted font-mono">
				<span>↑↓ navigate · ⌘C copy</span>
				<span>↵ select</span>
				<span>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
			</div>
		</div>
	</dialog>
{/if}
