export type NetworkType = 'public' | 'mesh' | 'lan';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'checking';

export type LayoutDensity = 'comfortable' | 'compact' | 'list';

export interface PinnedBookmark {
	id: string;
	name: string;
	url: string;
	icon: string;
	createdAt: number;
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
}
