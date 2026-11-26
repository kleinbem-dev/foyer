import type { EndpointDetail, HealthStatus, ServiceItem } from '../types';

export interface EndpointStatus {
	name: string;
	group: string;
	key: string;
	results?: Array<{
		success: boolean;
		/** Nanoseconds. */
		duration: number;
		timestamp: string;
		errors?: string[];
		conditionResults?: Array<{ condition: string; success: boolean }>;
	}>;
}

export interface GatusSnapshot {
	statuses: Record<string, HealthStatus>;
	details: Record<string, EndpointDetail>;
}

const ENDPOINTS_STATUS_PATH = '/api/v1/endpoints/statuses';
const HISTORY_LENGTH = 20;
const REASON_MAX_LENGTH = 160;

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

type ProbeResult = NonNullable<EndpointStatus['results']>[number];

function isProbeResult(value: unknown): value is ProbeResult {
	return !!value && typeof value === 'object' && typeof (value as ProbeResult).success === 'boolean';
}

function asTimestamp(value: unknown): string | undefined {
	return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
}

function failureReason(result: ProbeResult): string | undefined {
	const errors = Array.isArray(result.errors)
		? result.errors.filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
		: [];
	const failed = Array.isArray(result.conditionResults)
		? result.conditionResults
				.filter((c) => c && c.success === false && typeof c.condition === 'string')
				.map((c) => c.condition)
		: [];
	const reason = (errors.length > 0 ? errors : failed).join('; ').replace(/\s+/g, ' ').trim();
	if (!reason) return undefined;
	return reason.length > REASON_MAX_LENGTH ? `${reason.slice(0, REASON_MAX_LENGTH - 1)}…` : reason;
}

function describeEndpoint(name: string, rawResults: unknown): EndpointDetail {
	const results = Array.isArray(rawResults) ? rawResults.filter(isProbeResult) : [];
	const latest = results[results.length - 1];
	if (!latest) return { name, status: 'unknown', history: [] };

	const detail: EndpointDetail = {
		name,
		status: latest.success ? 'healthy' : 'down',
		history: results.slice(-HISTORY_LENGTH).map((r) => r.success),
		checkedAt: asTimestamp(latest.timestamp)
	};
	if (typeof latest.duration === 'number' && Number.isFinite(latest.duration) && latest.duration >= 0) {
		detail.responseMs = Math.round(latest.duration / 1e6);
	}
	if (!latest.success) {
		detail.reason = failureReason(latest);
		let first = results.length - 1;
		while (first > 0 && !results[first - 1].success) first--;
		// A run that fills the whole window started before it: the true start is unknown.
		if (first > 0) detail.downSince = asTimestamp(results[first].timestamp);
	}
	return detail;
}

/**
 * Fetch endpoint statuses from a Gatus instance.
 * Returns null when Gatus is unreachable or returns malformed data so callers can keep the last known state.
 */
export async function fetchGatusSnapshot(
	gatusUrl = ENDPOINTS_STATUS_PATH,
	signal?: AbortSignal
): Promise<GatusSnapshot | null> {
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
		const statuses: Record<string, HealthStatus> = {};
		const details: Record<string, EndpointDetail> = {};

		for (const ep of endpoints as EndpointStatus[]) {
			if (!ep || typeof ep.name !== 'string') continue;
			const detail = describeEndpoint(ep.name, ep.results);

			const keys = [ep.name.toLowerCase().replace(/[^a-z0-9]/g, ''), ep.name.toLowerCase()];
			if (typeof ep.key === 'string' && ep.key) keys.push(ep.key, ep.key.toLowerCase());
			for (const key of keys) {
				if (!key) continue;
				statuses[key] = detail.status;
				details[key] = detail;
			}
		}

		return { statuses, details };
	} catch {
		return null;
	}
}

/** Like `fetchGatusSnapshot`, reduced to the status of each endpoint. */
export async function fetchGatusStatuses(
	gatusUrl = ENDPOINTS_STATUS_PATH,
	signal?: AbortSignal
): Promise<Record<string, HealthStatus> | null> {
	return (await fetchGatusSnapshot(gatusUrl, signal))?.statuses ?? null;
}

/** Entry for one service: its configured Gatus endpoint/key, then its normalised id, then its raw id. */
function lookup<T>(service: Pick<ServiceItem, 'id' | 'gatusEndpoint'>, map: Record<string, T>): T | undefined {
	const endpointKey = service.gatusEndpoint?.trim();
	const normEndpoint = endpointKey?.toLowerCase().replace(/[^a-z0-9]/g, '');
	const normId = service.id.toLowerCase().replace(/[^a-z0-9]/g, '');

	return (
		(endpointKey ? (map[endpointKey] ?? map[endpointKey.toLowerCase()]) : undefined) ??
		(normEndpoint ? map[normEndpoint] : undefined) ??
		map[normId] ??
		map[service.id]
	);
}

export function resolveHealth(
	service: Pick<ServiceItem, 'id' | 'gatusEndpoint'>,
	healthMap: Record<string, HealthStatus>
): HealthStatus {
	return lookup(service, healthMap) ?? 'unknown';
}

export function resolveDetail(
	service: Pick<ServiceItem, 'id' | 'gatusEndpoint'>,
	details: Record<string, EndpointDetail>
): EndpointDetail | undefined {
	return lookup(service, details);
}
