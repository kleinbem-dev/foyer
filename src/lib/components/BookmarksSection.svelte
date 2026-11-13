<script lang="ts">
	import { onMount } from 'svelte';
	import { createBookmark, parseStoredBookmarks } from '../portal';
	import type { PinnedBookmark } from '../types';

	const STORAGE_KEY = 'foyer-bookmarks';

	let {
		bookmarks = $bindable<PinnedBookmark[]>([])
	}: {
		bookmarks?: PinnedBookmark[];
	} = $props();

	let showAddModal = $state(false);
	let dialogEl = $state<HTMLDialogElement | null>(null);
	let nameInputEl = $state<HTMLInputElement | null>(null);
	let newName = $state('');
	let newUrl = $state('');
	let newIcon = $state('⭐');
	let formError = $state('');

	function loadSaved() {
		try {
			bookmarks = parseStoredBookmarks(localStorage.getItem(STORAGE_KEY));
		} catch {}
	}

	onMount(loadSaved);

	$effect(() => {
		if (showAddModal && dialogEl && !dialogEl.open) {
			dialogEl.showModal();
			nameInputEl?.focus();
		}
	});

	function saveBookmarks(items: PinnedBookmark[]): boolean {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
			bookmarks = items;
			return true;
		} catch {
			return false;
		}
	}

	function openModal() {
		formError = '';
		showAddModal = true;
	}

	function closeModal() {
		dialogEl?.close();
		showAddModal = false;
	}

	function addBookmark(e: SubmitEvent) {
		e.preventDefault();
		const { bookmark, error } = createBookmark(newName, newUrl, newIcon);
		if (!bookmark) {
			formError = error ?? 'Invalid bookmark';
			return;
		}
		if (!saveBookmarks([...bookmarks, bookmark])) {
			formError = 'Failed to save to local storage';
			return;
		}

		newName = '';
		newUrl = '';
		newIcon = '⭐';
		formError = '';
		closeModal();
	}

	function removeBookmark(id: string) {
		saveBookmarks(bookmarks.filter((b) => b.id !== id));
	}
</script>

<svelte:window
	onstorage={(e) => {
		if (e.key === STORAGE_KEY) loadSaved();
	}}
/>

<section class="space-y-3" aria-label="Pinned and Quick Links">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-bold text-heading flex items-center gap-1.5">
				<span aria-hidden="true">⭐</span>
				<span>Pinned & Quick Links</span>
			</h2>
			<span class="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-surface-high text-muted">
				{bookmarks.length}
			</span>
		</div>

		<button
			type="button"
			onclick={openModal}
			class="text-xs font-medium px-2.5 py-1 rounded-lg border border-dashed border-outline/60 hover:border-accent text-fg hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"
		>
			<span aria-hidden="true">+</span>
			<span>Add Link</span>
		</button>
	</div>

	{#if bookmarks.length === 0}
		<div class="p-6 rounded-xl border border-dashed border-line text-center text-xs text-muted">
			No pinned links yet. Click <span class="font-semibold text-heading">+ Add Link</span> to pin frequent bookmarks to your homelab portal.
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
			{#each bookmarks as bm (bm.id)}
				<div class="group relative flex items-center justify-between p-2.5 rounded-xl border border-line bg-surface/80 hover:bg-surface-high shadow-2xs hover:shadow-xs transition-colors">
					<a
						href={bm.url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 min-w-0 flex-1"
					>
						<span aria-hidden="true" class="text-lg shrink-0">{bm.icon}</span>
						<div class="min-w-0 flex-1">
							<span class="block text-xs font-medium text-heading truncate group-hover:text-accent transition-colors">
								{bm.name}
							</span>
							<span class="block text-[10px] font-mono text-muted truncate">
								{bm.url.replace(/^https?:\/\//, '')}
							</span>
						</div>
					</a>

					<button
						type="button"
						onclick={() => removeBookmark(bm.id)}
						class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-status-danger p-1 rounded transition-opacity cursor-pointer"
						title="Remove bookmark"
						aria-label="Remove bookmark {bm.name}"
					>
						<svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if showAddModal}
	<dialog
		bind:this={dialogEl}
		closedby="any"
		aria-labelledby="add-bookmark-title"
		onclose={() => (showAddModal = false)}
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
		class="m-auto w-full max-w-sm rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl"
	>
		<div class="p-5 space-y-4">
			<div class="flex items-center justify-between border-b border-line pb-3">
				<h2 id="add-bookmark-title" class="font-bold text-sm text-heading">Add Pinned Link</h2>
				<button
					type="button"
					onclick={closeModal}
					class="text-muted hover:text-heading cursor-pointer p-1"
					aria-label="Close dialog"
				>
					✕
				</button>
			</div>

			<form onsubmit={addBookmark} class="space-y-3">
				<div>
					<label for="bm-name" class="block text-xs font-medium text-fg mb-1">Name</label>
					<input
						bind:this={nameInputEl}
						id="bm-name"
						type="text"
						bind:value={newName}
						placeholder="e.g. Proxmox, UniFi, Grafana"
						required
						class="w-full px-3 py-1.5 rounded-lg border border-line bg-bg text-xs text-heading focus:outline-accent"
					/>
				</div>

				<div>
					<label for="bm-url" class="block text-xs font-medium text-fg mb-1">URL</label>
					<input
						id="bm-url"
						type="text"
						bind:value={newUrl}
						placeholder="https://..."
						required
						aria-invalid={formError ? 'true' : undefined}
						aria-describedby={formError ? 'bm-url-error' : undefined}
						class="w-full px-3 py-1.5 rounded-lg border border-line bg-bg text-xs text-heading focus:outline-accent"
					/>
					{#if formError}
						<p id="bm-url-error" role="alert" class="mt-1 text-[11px] text-status-danger">{formError}</p>
					{/if}
				</div>

				<div>
					<label for="bm-icon" class="block text-xs font-medium text-fg mb-1">Emoji Icon</label>
					<input
						id="bm-icon"
						type="text"
						bind:value={newIcon}
						placeholder="⭐, 🚀, 📡"
						maxlength="4"
						class="w-20 px-3 py-1.5 rounded-lg border border-line bg-bg text-xs text-heading focus:outline-accent"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						type="button"
						onclick={closeModal}
						class="px-3 py-1.5 text-xs text-muted hover:text-heading cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-fg hover:bg-accent-hover transition-colors cursor-pointer"
					>
						Save Link
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}
