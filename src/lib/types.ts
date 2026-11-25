export type NetworkType = 'public' | 'mesh' | 'lan';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'checking';

/** What Gatus last reported for one endpoint. */
export interface EndpointDetail {
	name: string;
	status: HealthStatus;
	/** Duration of the latest probe in milliseconds. */
	responseMs?: number;
	/** ISO timestamp of the latest probe. */
	checkedAt?: string;
	/** Outcome of the most recent probes, oldest first. */
	history: boolean[];
	/** ISO timestamp of the first probe in the current run of failures. */
	downSince?: string;
	/** Why the latest probe failed: its error, or the conditions that did not hold. */
	reason?: string;
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';

/** One entry of the "Needs attention" panel: a service that is down, or an item of the attention feed. */
export interface AttentionItem {
	id: string;
	title: string;
	severity: AttentionSeverity;
	url?: string;
	detail?: string;
	/** Short label for where the item comes from, such as "GitHub". */
	source?: string;
	/** ISO timestamp. */
	updatedAt?: string;
}

export type LayoutDensity = 'comfortable' | 'compact' | 'list';

export interface PinnedBookmark {
	id: string;
	name: string;
	url: string;
	icon: string;
	createdAt: number;
}

/** A pinned link from `/config.json`: the same for every visitor, not removable in the UI. */
export interface PinnedLink {
	id: string;
	name: string;
	url: string;
	icon: string;
}

export interface HostInfo {
	id: string;
	name: string;
	role: string;
	ip?: string;
	arch?: string;
	icon?: string;
}

export interface ServiceItem {
	id: string;
	name: string;
	category: string;
	icon: string;
	description: string;
	url: string;
	host: string;
	network: NetworkType;
	gatusEndpoint?: string;
	tags?: string[];
}

export interface WeatherConfig {
	latitude: number;
	longitude: number;
	timezone?: string;
	label?: string;
}

export interface FooterLink {
	label: string;
	url: string;
}

export interface PortalConfig {
	title: string;
	badge?: string;
	subtitle?: string;
	welcomeTitle: string;
	welcomeSubtitle?: string;
	hosts: HostInfo[];
	services: ServiceItem[];
	categoryOrder?: string[];
	categoryIcons?: Record<string, string>;
	gatusUrl?: string;
	weather?: WeatherConfig;
	searchUrlTemplate?: string;
	footerLinks?: FooterLink[];
	links?: PinnedLink[];
	/** JSON feed of items that need attention, shown above the services. */
	attentionUrl?: string;
	/** Open the search palette when a letter or digit is typed anywhere on the page. */
	typeToSearch?: boolean;
}
