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

/**
 * Fetch endpoint statuses from the fleet Gatus instance.
 * Returns null when Gatus is unreachable, so callers can keep the last known state.
 */
export async function fetchGatusStatuses(): Promise<Record<string, HealthStatus> | null> {
	try {
		const res = await fetch('https://status.kleinbem.dev/api/v1/endpoints/statuses', {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(4000)
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
			const status: HealthStatus = !latest
				? 'unknown'
				: latest.success
					? 'healthy'
					: 'down';

			// Normalize keys for matching (e.g. "status", "dashboard", "authentik")
			const normName = ep.name.toLowerCase().replace(/[^a-z0-9]/g, '');
			map[normName] = status;
			map[ep.name.toLowerCase()] = status;
			if (typeof ep.key === 'string' && ep.key) map[ep.key] = status;

			// Common aliases for fleet probes
			if (normName === 'chat') {
				map['openwebui'] = status;
				map['open-webui'] = status;
			} else if (normName === 'enteauthweb') {
				map['enteweb'] = status;
				map['ente-web'] = status;
				map['ente'] = status;
			} else if (normName === 'atticcache') {
				map['attic'] = status;
			} else if (normName === 'homeassistant') {
				map['home-assistant'] = status;
				map['ha'] = status;
			}
		}

		return map;
	} catch {
		// Offline / CORS / unreachable
		return null;
	}
}

/**
 * Health of one service: its Gatus endpoint, then its normalised id, then its raw id.
 */
export function resolveHealth(
	service: Pick<ServiceItem, 'id' | 'gatusEndpoint'>,
	healthMap: Record<string, HealthStatus>
): HealthStatus {
	const normKey = service.id.toLowerCase().replace(/[^a-z0-9]/g, '');
	return (
		(service.gatusEndpoint ? healthMap[service.gatusEndpoint] : undefined) ??
		healthMap[normKey] ??
		healthMap[service.id] ??
		'unknown'
	);
}
