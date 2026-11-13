import {
	DEFAULT_CATEGORY_ICONS,
	DEFAULT_CATEGORY_ORDER,
	DEFAULT_SEARCH_URL_TEMPLATE,
	isValidHttpUrl
} from './config';
import { resolveHealth } from './data/gatus';
import type { HealthStatus, HostInfo, PinnedBookmark, ServiceItem, WeatherConfig } from './types';

export type NetworkFilter = 'all' | 'public' | 'mesh' | 'issues';

export interface PaletteEntry {
	id: string;
	kind: 'service' | 'bookmark' | 'host';
	name: string;
	description: string;
	icon: string;
	category: string;
	host?: string;
	network?: string;
	url?: string;
	ip?: string;
	tags?: string[];
}

export interface WeatherSnapshot {
	temp: number;
	condition: string;
	icon: string;
}

export function isValidBookmark(item: unknown): item is PinnedBookmark {
	if (!item || typeof item !== 'object') return false;
	const bm = item as Record<string, unknown>;
	return (
		typeof bm.id === 'string' && bm.id.trim().length > 0 &&
		typeof bm.name === 'string' && bm.name.trim().length > 0 &&
		typeof bm.icon === 'string' && bm.icon.trim().length > 0 &&
		typeof bm.createdAt === 'number' && Number.isFinite(bm.createdAt) &&
		typeof bm.url === 'string' && isValidHttpUrl(bm.url)
	);
}

export function parseStoredBookmarks(raw: string | null): PinnedBookmark[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const seen = new Set<string>();
		const valid: PinnedBookmark[] = [];
		for (const item of parsed) {
			if (isValidBookmark(item) && !seen.has(item.id)) {
				seen.add(item.id);
				valid.push(item);
			}
		}
		return valid;
	} catch {
		return [];
	}
}

export function createBookmark(
	nameInput: string,
	urlInput: string,
	iconInput: string
): { bookmark?: PinnedBookmark; error?: string } {
	const name = nameInput.trim();
	const rawUrl = urlInput.trim();
	if (!name || !rawUrl) return { error: 'Name and URL are required' };

	const url = /^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
	if (!isValidHttpUrl(url)) return { error: 'Please enter a valid HTTP or HTTPS URL' };

	const id = typeof crypto?.randomUUID === 'function'
		? `bm-${crypto.randomUUID()}`
		: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	return {
		bookmark: { id, name, url, icon: iconInput.trim() || '🔗', createdAt: Date.now() }
	};
}

export function buildPaletteEntries(
	services: ServiceItem[],
	bookmarks: PinnedBookmark[] = [],
	hosts: HostInfo[] = []
): PaletteEntry[] {
	return [
		...services.map((s): PaletteEntry => ({
			id: `svc:${s.id}`, kind: 'service', name: s.name, description: s.description,
			icon: s.icon, category: s.category, host: s.host, network: s.network, url: s.url, tags: s.tags
		})),
		...bookmarks.map((bm): PaletteEntry => ({
			id: `bm:${bm.id}`, kind: 'bookmark', name: bm.name,
			description: bm.url.replace(/^https?:\/\//, ''), icon: bm.icon, category: 'Pinned', url: bm.url
		})),
		...hosts.map((h): PaletteEntry => ({
			id: `host:${h.id}`, kind: 'host', name: h.name,
			description: h.ip ? `${h.role} · ${h.ip}` : h.role,
			icon: h.icon ?? '🖥️', category: 'Host', host: h.id, ip: h.ip, tags: h.arch ? [h.arch] : undefined
		}))
	];
}

/** Multi-token search with `#host`, `@category`, and `!network` prefix filters. */
export function filterPaletteEntries(entries: PaletteEntry[], rawQuery: string): PaletteEntry[] {
	const raw = rawQuery.trim();
	if (!raw) return entries;
	if (raw.startsWith('>')) return [];

	const hostFilters: string[] = [];
	const catFilters: string[] = [];
	const netFilters: string[] = [];
	const words: string[] = [];

	for (const token of raw.toLowerCase().split(/\s+/)) {
		if (token.startsWith('#') && token.length > 1) hostFilters.push(token.slice(1));
		else if (token.startsWith('@') && token.length > 1) catFilters.push(token.slice(1));
		else if (token.startsWith('!') && token.length > 1) netFilters.push(token.slice(1));
		else if (!['#', '@', '!'].includes(token)) words.push(token);
	}

	return entries.filter((entry) => {
		const host = entry.host?.toLowerCase() ?? '';
		const cat = entry.category.toLowerCase();
		const net = entry.network?.toLowerCase() ?? '';

		if (hostFilters.some((f) => !host.includes(f))) return false;
		if (catFilters.some((f) => !cat.includes(f))) return false;
		if (netFilters.some((f) => !net.includes(f))) return false;
		if (words.length === 0) return true;

		const fields = [entry.name, entry.description, entry.category, host, net, ...(entry.tags ?? [])]
			.map((s) => s.toLowerCase());
		return words.every((w) => fields.some((f) => f.includes(w)));
	});
}

export function formatWebSearchUrl(term: string, template = DEFAULT_SEARCH_URL_TEMPLATE): string | null {
	const clean = term.trim();
	if (!clean) return null;
	const encoded = encodeURIComponent(clean);
	const url = template.includes('%s') ? template.replaceAll('%s', encoded) : `${template}${encoded}`;
	return isValidHttpUrl(url) ? url : null;
}

export function filterServices(
	services: ServiceItem[],
	selectedHost: string,
	networkFilter: NetworkFilter,
	healthMap: Record<string, HealthStatus>
): ServiceItem[] {
	return services.filter((s) => {
		if (selectedHost !== 'all' && s.host !== selectedHost) return false;
		if (networkFilter === 'public') return s.network === 'public';
		if (networkFilter === 'mesh') return s.network === 'mesh';
		if (networkFilter === 'issues') {
			const h = resolveHealth(s, healthMap);
			return h === 'down' || h === 'degraded';
		}
		return true;
	});
}

export function groupServicesByCategory(
	services: ServiceItem[],
	categoryOrder: string[] = DEFAULT_CATEGORY_ORDER
): Array<{ category: string; services: ServiceItem[] }> {
	const buckets = new Map<string, ServiceItem[]>();
	for (const svc of services) {
		const list = buckets.get(svc.category);
		if (list) list.push(svc);
		else buckets.set(svc.category, [svc]);
	}

	const groups: Array<{ category: string; services: ServiceItem[] }> = [];
	const visited = new Set<string>();
	for (const cat of [...categoryOrder, ...buckets.keys()]) {
		if (visited.has(cat)) continue;
		const inCat = buckets.get(cat);
		if (inCat?.length) {
			groups.push({ category: cat, services: inCat });
			visited.add(cat);
		}
	}
	return groups;
}

export function getCategoryIcon(category: string, customIcons?: Record<string, string>): string {
	return customIcons?.[category] ?? DEFAULT_CATEGORY_ICONS[category] ?? '📦';
}

export function computeServiceMetrics(
	services: ServiceItem[],
	healthMap: Record<string, HealthStatus>
) {
	let publicCount = 0;
	let meshCount = 0;
	let healthyCount = 0;
	let issueCount = 0;
	const hostCounts: Record<string, number> = { total: services.length };

	for (const s of services) {
		hostCounts[s.host] = (hostCounts[s.host] ?? 0) + 1;
		if (s.network === 'public') publicCount++;
		else if (s.network === 'mesh') meshCount++;

		const status = resolveHealth(s, healthMap);
		if (status === 'healthy') healthyCount++;
		else if (status === 'down' || status === 'degraded') issueCount++;
	}
	return { publicCount, meshCount, healthyCount, issueCount, hostCounts };
}

export function describeWeatherCode(code: number): { icon: string; condition: string } {
	if (code === 0) return { icon: '☀️', condition: 'Clear' };
	if (code === 1 || code === 2) return { icon: '🌤️', condition: 'Partly Cloudy' };
	if (code === 3) return { icon: '☁️', condition: 'Overcast' };
	if (code >= 45 && code <= 48) return { icon: '🌫️', condition: 'Foggy' };
	if (code >= 51 && code <= 67) return { icon: '🌧️', condition: 'Rain' };
	if (code >= 71 && code <= 77) return { icon: '🌨️', condition: 'Snow' };
	if (code >= 80 && code <= 82) return { icon: '🌦️', condition: 'Showers' };
	if (code >= 95) return { icon: '⛈️', condition: 'Thunderstorm' };
	return { icon: '⛅', condition: 'Fair' };
}

export async function fetchWeather(
	config: WeatherConfig,
	signal?: AbortSignal
): Promise<WeatherSnapshot | null> {
	try {
		const params = new URLSearchParams({
			latitude: String(config.latitude),
			longitude: String(config.longitude),
			current: 'temperature_2m,weather_code',
			timezone: config.timezone ?? 'auto'
		});
		const timeout = AbortSignal.timeout(5000);
		const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
			headers: { Accept: 'application/json' },
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});
		if (!res.ok) return null;

		const cur = ((await res.json()) as { current?: { temperature_2m?: unknown; weather_code?: unknown } } | null)?.current;
		if (
			typeof cur?.temperature_2m !== 'number' || !Number.isFinite(cur.temperature_2m) ||
			typeof cur.weather_code !== 'number' || !Number.isFinite(cur.weather_code)
		) {
			return null;
		}
		return { temp: Math.round(cur.temperature_2m), ...describeWeatherCode(cur.weather_code) };
	} catch {
		return null;
	}
}
