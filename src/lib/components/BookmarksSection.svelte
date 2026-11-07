<script lang="ts">
	import { onMount } from 'svelte';
	import type { PinnedBookmark } from '../types';

	let bookmarks = $state<PinnedBookmark[]>([]);
	let showAddModal = $state(false);
	let newName = $state('');
	let newUrl = $state('');
	let newIcon = $state('⭐');
	let urlError = $state('');

	function isValidHttpUrl(candidate: string): boolean {
		try {
			const u = new URL(candidate);
			return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0;
		} catch {
			return false;
		}
	}

	function isValidBookmark(item: unknown): item is PinnedBookmark {
		return (
			typeof item === 'object' &&
			item !== null &&
			typeof (item as PinnedBookmark).id === 'string' &&
			typeof (item as PinnedBookmark).name === 'string' &&
			typeof (item as PinnedBookmark).url === 'string'
		);
	}

	onMount(() => {
		function loadSaved() {
			try {
				const saved = localStorage.getItem('foyer-bookmarks');
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.every(isValidBookmark)) {
						bookmarks = parsed;
					}
				}
			} catch {}
		}

		loadSaved();
		function onStorage(e: StorageEvent) {
			if (e.key === 'foyer-bookmarks') {
				loadSaved();
			}
		}
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	function saveBookmarks(items: PinnedBookmark[]): boolean {
		try {
			localStorage.setItem('foyer-bookmarks', JSON.stringify(items));
			bookmarks = items;
			return true;
		} catch (err) {
			console.error('Failed to save bookmarks to localStorage', err);
			return false;
		}
	}

	function addBookmark(e: Event) {
		e.preventDefault();
		urlError = '';
		if (!newName.trim() || !newUrl.trim()) return;
		let url = newUrl.trim();
		if (!/^https?:\/\//i.test(url)) {
			url = 'https://' + url;
		}
		if (!isValidHttpUrl(url)) {
			urlError = 'Please enter a valid HTTP or HTTPS URL';
			return;
		}

		const item: PinnedBookmark = {
			id: 'bm-' + Date.now(),
			name: newName.trim(),
			url,
			icon: newIcon.trim() || '🔗',
			createdAt: Date.now()
		};

		if (!saveBookmarks([...bookmarks, item])) {
			urlError = 'Failed to save to local storage';
			return;
		}

		newName = '';
		newUrl = '';
		newIcon = '⭐';
		urlError = '';
		showAddModal = false;
	}

	function removeBookmark(id: string) {
		saveBookmarks(bookmarks.filter((b) => b.id !== id));
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
				<span>⭐</span>
				<span>Pinned & Quick Links</span>
			</span>
			<span class="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
				{bookmarks.length}
			</span>
		</div>

		<button
			type="button"
			onclick={() => (showAddModal = true)}
			class="text-xs font-medium px-2.5 py-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-brand text-zinc-600 dark:text-zinc-300 hover:text-brand transition-colors flex items-center gap-1 cursor-pointer"
		>
			<span>+</span>
			<span>Add Link</span>
		</button>
	</div>

	{#if bookmarks.length === 0}
		<div class="p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
			No pinned links yet. Click <span class="font-semibold text-zinc-600 dark:text-zinc-300">+ Add Link</span> to pin frequent bookmarks to your homelab portal.
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
			{#each bookmarks as bm (bm.id)}
				<div class="group relative flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800 shadow-2xs hover:shadow-xs transition-all">
					<a
						href={bm.url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 min-w-0 flex-1"
					>
						<span class="text-lg shrink-0">{bm.icon}</span>
						<div class="min-w-0 flex-1">
							<span class="block text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-brand transition-colors">
								{bm.name}
							</span>
							<span class="block text-[10px] font-mono text-zinc-400 truncate">
								{bm.url.replace(/^https?:\/\//, '')}
							</span>
						</div>
					</a>

					<button
						type="button"
						onclick={() => removeBookmark(bm.id)}
						class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-zinc-400 hover:text-rose-500 p-1 rounded transition-opacity cursor-pointer focus:outline-hidden"
						title="Remove bookmark"
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Bookmark Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="add-bookmark-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) showAddModal = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showAddModal = false;
		}}
	>
		<div class="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
				<h3 id="add-bookmark-title" class="font-bold text-sm text-zinc-900 dark:text-zinc-50">Add Pinned Link</h3>
				<button
					type="button"
					onclick={() => (showAddModal = false)}
					class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
				>
					✕
				</button>
			</div>

			<form onsubmit={addBookmark} class="space-y-3">
				<div>
					<label for="bm-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
					<input
						id="bm-name"
						type="text"
						bind:value={newName}
						placeholder="e.g. Proxmox, UniFi, Grafana"
						required
						autofocus
						class="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-brand"
					/>
				</div>

				<div>
					<label for="bm-url" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">URL</label>
					<input
						id="bm-url"
						type="text"
						bind:value={newUrl}
						placeholder="https://..."
						required
						class="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-brand"
					/>
					{#if urlError}
						<p class="mt-1 text-[11px] text-rose-500">{urlError}</p>
					{/if}
				</div>

				<div>
					<label for="bm-icon" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Emoji Icon</label>
					<input
						id="bm-icon"
						type="text"
						bind:value={newIcon}
						placeholder="⭐, 🚀, 📡"
						maxlength="4"
						class="w-20 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-brand"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						type="button"
						onclick={() => (showAddModal = false)}
						class="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
					>
						Save Link
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
