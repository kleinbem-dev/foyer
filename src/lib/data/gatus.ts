import type { HealthStatus } from '../types';

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
 * Gracefully returns empty status map if unavailable or unreachable.
 */
export async function fetchGatusStatuses(): Promise<Record<string, HealthStatus>> {
	try {
		const res = await fetch('https://status.kleinbem.dev/api/v1/endpoints/statuses', {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(4000)
		});

		if (!res.ok) {
			return {};
		}

		const endpoints: EndpointStatus[] = await res.json();
		const map: Record<string, HealthStatus> = {};

		for (const ep of endpoints) {
			const latest = ep.results?.[ep.results.length - 1];
			const status: HealthStatus = !latest
				? 'unknown'
				: latest.success
					? 'healthy'
					: 'down';

			// Normalize keys for matching (e.g. "status", "dashboard", "authentik")
			const normName = ep.name.toLowerCase().replace(/[^a-z0-9]/g, '');
			map[normName] = status;
			map[ep.name.toLowerCase()] = status;
			if (ep.key) map[ep.key] = status;

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
		// Silent fallback: offline / CORS / unreachable
		return {};
	}
}
