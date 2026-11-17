import { isSafePortalUrl } from '../config';
import type { AttentionItem, AttentionSeverity, EndpointDetail, ServiceItem } from '../types';
import { resolveDetail } from './gatus';

const MAX_FEED_ITEMS = 50;
const SEVERITY_RANK: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };

function text(value: unknown, maxLength: number): string | undefined {
	if (typeof value !== 'string') return undefined;
	const clean = value.replace(/\s+/g, ' ').trim();
	if (!clean) return undefined;
	return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

function isSeverity(value: unknown): value is AttentionSeverity {
	return value === 'critical' || value === 'warning' || value === 'info';
}

/**
 * Validates an untrusted attention feed: `{ "items": [...] }` or a bare array of items.
 * Entries without a title are dropped, unsafe URLs are removed, and ids are made unique.
 */
export function parseAttentionFeed(raw: unknown): AttentionItem[] {
	const list = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
			? (raw as { items: unknown[] }).items
			: [];

	const seen = new Set<string>();
	const items: AttentionItem[] = [];
	for (const entry of list) {
		if (items.length >= MAX_FEED_ITEMS) break;
		if (!entry || typeof entry !== 'object') continue;
		const obj = entry as Record<string, unknown>;
		const title = text(obj.title, 200);
		if (!title) continue;
		const url = text(obj.url, 2000);
		const safeUrl = url && isSafePortalUrl(url) ? url : undefined;
		const id = `feed:${text(obj.id, 200) ?? safeUrl ?? title}`;
		if (seen.has(id)) continue;
		seen.add(id);
		const updatedAt = text(obj.updatedAt, 40);
		items.push({
			id,
			title,
			severity: isSeverity(obj.severity) ? obj.severity : 'info',
			url: safeUrl,
			detail: text(obj.detail, 300),
			source: text(obj.source, 40),
			updatedAt: updatedAt && Number.isFinite(Date.parse(updatedAt)) ? updatedAt : undefined
		});
	}
	return items;
}

/** Returns null when the feed is unreachable or not JSON, so callers can keep the last known items. */
export async function fetchAttentionFeed(url: string, signal?: AbortSignal): Promise<AttentionItem[] | null> {
	try {
		const timeout = AbortSignal.timeout(5000);
		const res = await fetch(url, {
			headers: { Accept: 'application/json' },
			cache: 'no-cache',
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});
		if (!res.ok) return null;
		return parseAttentionFeed(await res.json());
	} catch {
		return null;
	}
}

/** One critical item per service whose latest probe failed. */
export function buildServiceAttention(
	services: ServiceItem[],
	details: Record<string, EndpointDetail>
): AttentionItem[] {
	const items: AttentionItem[] = [];
	for (const service of services) {
		const detail = resolveDetail(service, details);
		if (detail?.status !== 'down') continue;
		items.push({
			id: `svc:${service.id}`,
			title: `${service.name} is down`,
			severity: 'critical',
			url: service.url,
			detail: detail.reason,
			source: service.host,
			updatedAt: detail.downSince ?? detail.checkedAt
		});
	}
	return items;
}

/** Most severe first, then most recent first; items without a time go last within their severity. */
export function sortAttention(items: AttentionItem[]): AttentionItem[] {
	const time = (item: AttentionItem) => (item.updatedAt ? Date.parse(item.updatedAt) : Number.NEGATIVE_INFINITY);
	return [...items].sort(
		(a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || time(b) - time(a)
	);
}
