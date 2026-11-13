<script lang="ts">
	import type { LayoutDensity } from '../types';

	let {
		density = $bindable('comfortable')
	}: {
		density: LayoutDensity;
	} = $props();

	function setDensity(d: LayoutDensity) {
		density = d;
		try {
			localStorage.setItem('foyer-density', d);
		} catch {}
	}
</script>

<div class="inline-flex items-center rounded-xl p-0.5 border border-line bg-surface text-muted" role="group" aria-label="Layout density">
	<button
		type="button"
		aria-pressed={density === 'comfortable'}
		onclick={() => setDensity('comfortable')}
		class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer {density === 'comfortable' ? 'bg-surface-high text-heading shadow-2xs' : 'hover:text-heading'}"
		title="Comfortable Cards"
	>
		<svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="3" width="7" height="7" rx="1.5" />
			<rect x="14" y="3" width="7" height="7" rx="1.5" />
			<rect x="3" y="14" width="7" height="7" rx="1.5" />
			<rect x="14" y="14" width="7" height="7" rx="1.5" />
		</svg>
		<span class="hidden sm:inline">Cards</span>
	</button>

	<button
		type="button"
		aria-pressed={density === 'compact'}
		onclick={() => setDensity('compact')}
		class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer {density === 'compact' ? 'bg-surface-high text-heading shadow-2xs' : 'hover:text-heading'}"
		title="Compact Grid"
	>
		<svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="3" width="4" height="4" rx="1" />
			<rect x="10" y="3" width="4" height="4" rx="1" />
			<rect x="17" y="3" width="4" height="4" rx="1" />
			<rect x="3" y="10" width="4" height="4" rx="1" />
			<rect x="10" y="10" width="4" height="4" rx="1" />
			<rect x="17" y="10" width="4" height="4" rx="1" />
			<rect x="3" y="17" width="4" height="4" rx="1" />
			<rect x="10" y="17" width="4" height="4" rx="1" />
			<rect x="17" y="17" width="4" height="4" rx="1" />
		</svg>
		<span class="hidden sm:inline">Compact</span>
	</button>

	<button
		type="button"
		aria-pressed={density === 'list'}
		onclick={() => setDensity('list')}
		class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer {density === 'list' ? 'bg-surface-high text-heading shadow-2xs' : 'hover:text-heading'}"
		title="Compact List"
	>
		<svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<line x1="8" y1="6" x2="21" y2="6" stroke-linecap="round" />
			<line x1="8" y1="12" x2="21" y2="12" stroke-linecap="round" />
			<line x1="8" y1="18" x2="21" y2="18" stroke-linecap="round" />
			<line x1="3" y1="6" x2="3.01" y2="6" stroke-linecap="round" />
			<line x1="3" y1="12" x2="3.01" y2="12" stroke-linecap="round" />
			<line x1="3" y1="18" x2="3.01" y2="18" stroke-linecap="round" />
		</svg>
		<span class="hidden sm:inline">List</span>
	</button>
</div>
