export type ServiceCategory =
	| 'Infrastructure'
	| 'AI Engineering'
	| 'AI'
	| 'Identity'
	| 'Dev'
	| 'Apps'
	| 'Documents'
	| 'Security'
	| 'Media'
	| 'Other';

export type NetworkType = 'public' | 'mesh' | 'lan';

export type HostNode = 'core-pi' | 'nixos-nvme' | 'mac-mini' | 'nasbook' | 'orin-nano' | 'bpi-r4';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'checking';

export interface ServiceItem {
	id: string;
	name: string;
	category: ServiceCategory;
	icon: string;
	description: string;
	url: string;
	host: HostNode;
	network: NetworkType;
	authRequired: boolean;
	gatusEndpoint?: string;
	tags?: string[];
}

export interface GatusStatus {
	key: string;
	name: string;
	group: string;
	status: HealthStatus;
	durationMs?: number;
}
