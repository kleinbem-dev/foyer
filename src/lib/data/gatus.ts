import type { HealthStatus, ServiceItem } from '../types';

export interface EndpointStatus {
	name: string;
	group: string;
	key: string;
	results?: Array<{
		success: boolean;
		duration: number;
		timestamp: string;
	}>;
}

const ENDPOINTS_STATUS_PATH = '/api/v1/endpoints/statuses';

export function buildGatusStatusesUrl(gatusUrl: string): string {
	const trimmed = gatusUrl.trim();
	const isRelative = trimmed.startsWith('/');
	const parsed = new URL(trimmed || ENDPOINTS_STATUS_PATH, 'http://foyer.local');
	const basePath = parsed.pathname.replace(/\/+$/, '');
	parsed.pathname = basePath.endsWith(ENDPOINTS_STATUS_PATH)
		? basePath
		: `${basePath}${ENDPOINTS_STATUS_PATH}`;
	return isRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
}

/**
 * Fetch endpoint statuses from a Gatus instance.
 * Returns null when Gatus is unreachable or returns malformed data so callers can keep the last known state.
 */
export async function fetchGatusStatuses(
	gatusUrl = ENDPOINTS_STATUS_PATH,
	signal?: AbortSignal
): Promise<Record<string, HealthStatus> | null> {
	try {
		const endpoint = buildGatusStatusesUrl(gatusUrl);
		const timeout = AbortSignal.timeout(4000);
		const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

		const res = await fetch(endpoint, {
			headers: { Accept: 'application/json' },
			signal: combinedSignal
		});

		if (!res.ok) {
			return null;
		}

		const endpoints: unknown = await res.json();
		if (!Array.isArray(endpoints)) return null;
		const map: Record<string, HealthStatus> = {};

		for (const ep of endpoints as EndpointStatus[]) {
			if (!ep || typeof ep.name !== 'string') continue;
			const results = Array.isArray(ep.results) ? ep.results : [];
			const latest = results[results.length - 1];
			const status: HealthStatus = !latest ? 'unknown' : latest.success ? 'healthy' : 'down';

			const normName = ep.name.toLowerCase().replace(/[^a-z0-9]/g, '');
			if (normName) map[normName] = status;
			map[ep.name.toLowerCase()] = status;
			if (typeof ep.key === 'string' && ep.key) {
				map[ep.key] = status;
				map[ep.key.toLowerCase()] = status;
			}
		}

		return map;
	} catch {
		return null;
	}
}

/**
 * Health of one service: its configured Gatus endpoint/key, then its normalised id, then its raw id.
 */
export function resolveHealth(
	service: Pick<ServiceItem, 'id' | 'gatusEndpoint'>,
	healthMap: Record<string, HealthStatus>
): HealthStatus {
	const endpointKey = service.gatusEndpoint?.trim();
	const normEndpoint = endpointKey?.toLowerCase().replace(/[^a-z0-9]/g, '');
	const normId = service.id.toLowerCase().replace(/[^a-z0-9]/g, '');

	return (
		(endpointKey ? (healthMap[endpointKey] ?? healthMap[endpointKey.toLowerCase()]) : undefined) ??
		(normEndpoint ? healthMap[normEndpoint] : undefined) ??
		healthMap[normId] ??
		healthMap[service.id] ??
		'unknown'
	);
}
