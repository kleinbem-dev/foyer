import type { FooterLink, HostInfo, NetworkType, PortalConfig, ServiceItem, WeatherConfig } from './types';

export const DEFAULT_SEARCH_URL_TEMPLATE = 'https://duckduckgo.com/?q=%s';

export const DEFAULT_CATEGORY_ORDER = [
	'Infrastructure', 'Identity', 'AI', 'AI Engineering', 'Dev', 'Apps', 'Documents', 'Security', 'Media'
];

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
	Infrastructure: '⚡', Identity: '🛡️', AI: '🤖', 'AI Engineering': '🧬',
	Dev: '💻', Apps: '📱', Documents: '📁', Security: '🔒', Media: '📻', Other: '📦'
};

export const DEFAULT_CONFIG: PortalConfig = {
	title: 'Foyer',
	subtitle: 'Self-hosted service launchpad',
	welcomeTitle: 'Welcome home',
	welcomeSubtitle: 'Configure /config.json to populate your hosts, services, and live health checks.',
	hosts: [],
	services: [],
	categoryOrder: DEFAULT_CATEGORY_ORDER,
	searchUrlTemplate: DEFAULT_SEARCH_URL_TEMPLATE,
	footerLinks: [{ label: 'source', url: 'https://github.com/kleinbem-dev/foyer' }]
};

/** Allows only absolute http(s) URLs with a non-empty hostname. */
export function isValidHttpUrl(candidate: string): boolean {
	try {
		const u = new URL(candidate);
		return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0;
	} catch {
		return false;
	}
}

/** Allows http(s) URLs or single-slash same-origin paths, rejecting protocol-relative and script schemes. */
export function isSafePortalUrl(candidate: string): boolean {
	if (candidate.startsWith('/') && !candidate.startsWith('//')) {
		return !/[\s\0]/.test(candidate);
	}
	return isValidHttpUrl(candidate);
}

function asNonEmptyString(val: unknown): string | undefined {
	const trimmed = typeof val === 'string' ? val.trim() : '';
	return trimmed.length > 0 ? trimmed : undefined;
}

function isNetworkType(val: unknown): val is NetworkType {
	return val === 'public' || val === 'mesh' || val === 'lan';
}

function parseHosts(raw: unknown): HostInfo[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const hosts: HostInfo[] = [];

	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const obj = entry as Record<string, unknown>;
		const id = asNonEmptyString(obj.id);
		const name = asNonEmptyString(obj.name) ?? id;
		if (!id || !name || seen.has(id)) continue;
		seen.add(id);
		hosts.push({
			id,
			name,
			role: asNonEmptyString(obj.role) ?? 'Node',
			ip: asNonEmptyString(obj.ip),
			arch: asNonEmptyString(obj.arch),
			icon: asNonEmptyString(obj.icon)
		});
	}
	return hosts;
}

function parseServices(raw: unknown): ServiceItem[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const services: ServiceItem[] = [];

	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const obj = entry as Record<string, unknown>;
		const id = asNonEmptyString(obj.id);
		const name = asNonEmptyString(obj.name);
		const url = asNonEmptyString(obj.url);
		if (!id || !name || !url || !isSafePortalUrl(url) || seen.has(id)) continue;
		seen.add(id);

		const tags = Array.isArray(obj.tags)
			? obj.tags.map(asNonEmptyString).filter((t): t is string => t !== undefined)
			: undefined;

		services.push({
			id,
			name,
			category: asNonEmptyString(obj.category) ?? 'Other',
			icon: asNonEmptyString(obj.icon) ?? '📦',
			description: typeof obj.description === 'string' ? obj.description.trim() : '',
			url,
			host: asNonEmptyString(obj.host) ?? 'local',
			network: isNetworkType(obj.network) ? obj.network : 'lan',
			gatusEndpoint: asNonEmptyString(obj.gatusEndpoint),
			tags: tags && tags.length > 0 ? tags : undefined
		});
	}
	return services;
}

function parseWeather(raw: unknown): WeatherConfig | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const obj = raw as Record<string, unknown>;
	const lat = typeof obj.latitude === 'number' ? obj.latitude : Number.NaN;
	const lon = typeof obj.longitude === 'number' ? obj.longitude : Number.NaN;
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) return undefined;
	if (!Number.isFinite(lon) || lon < -180 || lon > 180) return undefined;
	return {
		latitude: lat,
		longitude: lon,
		timezone: asNonEmptyString(obj.timezone),
		label: asNonEmptyString(obj.label)
	};
}

function parseFooterLinks(raw: unknown): FooterLink[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const links: FooterLink[] = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const obj = entry as Record<string, unknown>;
		const label = asNonEmptyString(obj.label);
		const url = asNonEmptyString(obj.url);
		if (label && url && isSafePortalUrl(url)) links.push({ label, url });
	}
	return links;
}

/**
 * Validates an untrusted JSON payload into a safe PortalConfig and deduplicates host/service IDs
 * so Svelte keyed each-blocks cannot throw on duplicate keys.
 */
export function parsePortalConfig(raw: unknown): PortalConfig {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return structuredClone(DEFAULT_CONFIG);
	}
	const obj = raw as Record<string, unknown>;
	const gatusCandidate = asNonEmptyString(obj.gatusUrl);
	const searchCandidate = asNonEmptyString(obj.searchUrlTemplate);
	const categoryOrder = Array.isArray(obj.categoryOrder)
		? obj.categoryOrder.map(asNonEmptyString).filter((c): c is string => c !== undefined)
		: DEFAULT_CATEGORY_ORDER;

	let categoryIcons: Record<string, string> | undefined;
	if (obj.categoryIcons && typeof obj.categoryIcons === 'object' && !Array.isArray(obj.categoryIcons)) {
		categoryIcons = {};
		for (const [k, v] of Object.entries(obj.categoryIcons as Record<string, unknown>)) {
			const icon = asNonEmptyString(v);
			if (k.trim() && icon) categoryIcons[k.trim()] = icon;
		}
	}

	return {
		title: asNonEmptyString(obj.title) ?? DEFAULT_CONFIG.title,
		badge: asNonEmptyString(obj.badge),
		subtitle: asNonEmptyString(obj.subtitle),
		welcomeTitle: asNonEmptyString(obj.welcomeTitle) ?? DEFAULT_CONFIG.welcomeTitle,
		welcomeSubtitle: asNonEmptyString(obj.welcomeSubtitle),
		hosts: parseHosts(obj.hosts),
		services: parseServices(obj.services),
		categoryOrder: categoryOrder.length > 0 ? categoryOrder : DEFAULT_CATEGORY_ORDER,
		categoryIcons,
		gatusUrl: gatusCandidate && isSafePortalUrl(gatusCandidate) ? gatusCandidate : undefined,
		weather: parseWeather(obj.weather),
		searchUrlTemplate:
			searchCandidate && isValidHttpUrl(searchCandidate.replace('%s', 'test'))
				? searchCandidate
				: DEFAULT_SEARCH_URL_TEMPLATE,
		footerLinks: parseFooterLinks(obj.footerLinks) ?? DEFAULT_CONFIG.footerLinks
	};
}

export async function loadPortalConfig(
	configPath = './config.json',
	signal?: AbortSignal
): Promise<{ config: PortalConfig; warning?: string }> {
	try {
		const timeout = AbortSignal.timeout(5000);
		const res = await fetch(configPath, {
			headers: { Accept: 'application/json' },
			cache: 'no-cache',
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});

		if (res.status === 404) return { config: structuredClone(DEFAULT_CONFIG) };
		if (!res.ok) {
			return {
				config: structuredClone(DEFAULT_CONFIG),
				warning: `Failed to load ${configPath} (HTTP ${res.status}); using default configuration.`
			};
		}

		const json: unknown = await res.json();
		if (!json || typeof json !== 'object' || Array.isArray(json)) {
			return {
				config: structuredClone(DEFAULT_CONFIG),
				warning: `${configPath} must contain a JSON object; using default configuration.`
			};
		}
		return { config: parsePortalConfig(json) };
	} catch (err) {
		if (signal?.aborted) return { config: structuredClone(DEFAULT_CONFIG) };
		return {
			config: structuredClone(DEFAULT_CONFIG),
			warning: err instanceof SyntaxError
				? `Invalid JSON in ${configPath}; using default configuration.`
				: undefined
		};
	}
}
