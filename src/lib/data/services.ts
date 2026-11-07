import type { ServiceItem } from '../types';

export const FLEET_SERVICES: ServiceItem[] = [
	// Identity
	{
		id: 'authentik',
		name: 'Authentik',
		category: 'Identity',
		icon: '🪪',
		description: 'Shared identity provider (SSO, social login, persona OIDC).',
		url: 'https://auth.kleinbem.dev',
		host: 'core-pi',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'authentik',
		tags: ['sso', 'oidc', 'auth']
	},
	{
		id: 'vaultwarden',
		name: 'Vaultwarden',
		category: 'Identity',
		icon: '🔐',
		description: 'Self-hosted password manager for people & personas.',
		url: 'https://vault.kleinbem.dev',
		host: 'core-pi',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'vaultwarden',
		tags: ['passwords', 'bitwarden', 'security']
	},
	{
		id: 'ente-web',
		name: 'Ente Auth Web',
		category: 'Identity',
		icon: '🔑',
		description: 'End-to-end encrypted 2FA token manager web app.',
		url: 'https://2fa.kleinbem.dev',
		host: 'core-pi',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'ente-web',
		tags: ['2fa', 'totp', 'security']
	},

	// Infrastructure
	{
		id: 'status',
		name: 'Fleet Status',
		category: 'Infrastructure',
		icon: '🟢',
		description: 'Real-time Gatus fleet uptime and endpoint latency monitor.',
		url: 'https://status.kleinbem.dev',
		host: 'core-pi',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'status',
		tags: ['gatus', 'monitoring', 'uptime']
	},
	{
		id: 'attic',
		name: 'Attic Cache',
		category: 'Infrastructure',
		icon: '📦',
		description: 'Fast, deduplicated Nix binary cache server.',
		url: 'https://cache.kleinbem.dev',
		host: 'core-pi',
		network: 'mesh',
		authRequired: false,
		gatusEndpoint: 'attic',
		tags: ['nix', 'cache', 'nar']
	},
	{
		id: 'ntfy',
		name: 'ntfy Push',
		category: 'Infrastructure',
		icon: '📣',
		description: 'Pub/sub notifications and fleet deploy signals.',
		url: 'https://ntfy.kleinbem.dev',
		host: 'core-pi',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'ntfy',
		tags: ['alerts', 'push', 'notifications']
	},
	{
		id: 'stalwart',
		name: 'Stalwart Mail',
		category: 'Infrastructure',
		icon: '📬',
		description: 'Persona-fleet mail server (JMAP/IMAP/SMTP).',
		url: 'https://mail.kleinbem.dev',
		host: 'mac-mini',
		network: 'mesh',
		authRequired: true,
		tags: ['email', 'jmap', 'mail']
	},
	{
		id: 'garage-ui',
		name: 'Garage UI',
		category: 'Infrastructure',
		icon: '🪣',
		description: 'Distributed S3 object storage dashboard and cluster manager.',
		url: 'http://10.85.46.134:80',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		tags: ['s3', 'storage', 'backup']
	},
	{
		id: 'cockpit',
		name: 'Cockpit',
		category: 'Infrastructure',
		icon: '🎛️',
		description: 'Web-based host management interface for Linux.',
		url: 'https://cockpit.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: true,
		tags: ['admin', 'host', 'system']
	},
	{
		id: 'syncthing',
		name: 'Syncthing',
		category: 'Infrastructure',
		icon: '🔄',
		description: 'Continuous decentralized file synchronization.',
		url: 'https://syncthing.kleinbem.dev',
		host: 'nasbook',
		network: 'mesh',
		authRequired: true,
		tags: ['sync', 'files', 'storage']
	},
	{
		id: 'cups',
		name: 'Cups Printing',
		category: 'Infrastructure',
		icon: '🖨️',
		description: 'Fleet print server and network queue management.',
		url: 'http://10.85.48.115:631',
		host: 'core-pi',
		network: 'lan',
		authRequired: false,
		tags: ['print', 'cups']
	},

	// AI & AI Engineering
	{
		id: 'open-webui',
		name: 'Open WebUI',
		category: 'AI',
		icon: '🤖',
		description: 'Full-featured AI chat interface powered by local Ollama models.',
		url: 'https://chat.kleinbem.dev',
		host: 'mac-mini',
		network: 'public',
		authRequired: false,
		gatusEndpoint: 'open-webui',
		tags: ['llm', 'chat', 'ollama']
	},
	{
		id: 'cadre',
		name: 'Cadre Teammates',
		category: 'AI Engineering',
		icon: '🦾',
		description: 'Private AI teammates on your own compute (Goose over local inference).',
		url: 'https://cadre.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: true,
		tags: ['agents', 'goose', 'mesh-llm']
	},
	{
		id: 'revue',
		name: 'Revue AI',
		category: 'Dev',
		icon: '👁️',
		description: 'Nix-native AI PR review daemon for Forgejo & GitHub.',
		url: 'https://revue.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		gatusEndpoint: 'revue',
		tags: ['code-review', 'ci', 'forgejo']
	},
	{
		id: 'buzz',
		name: 'Buzz Workspace',
		category: 'AI Engineering',
		icon: '🐝',
		description: 'Team chat, git forge, and agent collaborative workspace.',
		url: 'https://buzz.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: true,
		tags: ['chat', 'nostr', 'agents']
	},
	{
		id: 'comfyui',
		name: 'ComfyUI',
		category: 'AI Engineering',
		icon: '🎨',
		description: 'Node-based modular visual image and video generation.',
		url: 'http://10.85.46.108:8188',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		tags: ['sd', 'diffusion', 'images']
	},
	{
		id: 'langflow',
		name: 'Langflow',
		category: 'AI Engineering',
		icon: '🌊',
		description: 'Visual UI builder for multi-agent workflows and RAG pipelines.',
		url: 'http://10.85.46.109:7860',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		tags: ['rag', 'agents', 'flow']
	},
	{
		id: 'langfuse',
		name: 'Langfuse',
		category: 'AI Engineering',
		icon: '📊',
		description: 'Open source LLM engineering platform, tracing, and evals.',
		url: 'http://10.85.46.110:3000',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		tags: ['observability', 'telemetry', 'tracing']
	},

	// Dev
	{
		id: 'forgejo',
		name: 'Forgejo',
		category: 'Dev',
		icon: '🌳',
		description: 'Self-hosted Git forge mirroring fleet GitHub repos.',
		url: 'https://git.kleinbem.dev',
		host: 'core-pi',
		network: 'mesh',
		authRequired: false,
		tags: ['git', 'forge', 'repo']
	},
	{
		id: 'code-server',
		name: 'Code Server',
		category: 'Dev',
		icon: '💻',
		description: 'VS Code in a hardened container reachable from browser.',
		url: 'https://code.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: true,
		tags: ['ide', 'vscode', 'editor']
	},
	{
		id: 'caido',
		name: 'Caido Security',
		category: 'Security',
		icon: '🛡️',
		description: 'Headless web security proxy and penetration testing daemon.',
		url: 'https://caido.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: true,
		tags: ['proxy', 'audit', 'security']
	},

	// Apps & Media
	{
		id: 'home-assistant',
		name: 'Home Assistant',
		category: 'Apps',
		icon: '🏡',
		description: 'Open-source home automation hub and device dashboard.',
		url: 'https://hass.kleinbem.dev',
		host: 'core-pi',
		network: 'mesh',
		authRequired: false,
		gatusEndpoint: 'home-assistant',
		tags: ['smarthome', 'iot', 'automation']
	},
	{
		id: 'n8n',
		name: 'n8n Automation',
		category: 'Apps',
		icon: '📡',
		description: 'Fair-code workflow automation tool connecting fleet APIs.',
		url: 'https://n8n.kleinbem.dev',
		host: 'nixos-nvme',
		network: 'mesh',
		authRequired: false,
		tags: ['workflows', 'automation', 'webhooks']
	},
	{
		id: 'miniflux',
		name: 'Miniflux',
		category: 'Media',
		icon: '📰',
		description: 'Minimalist, fast, and opinionated RSS feed reader.',
		url: 'https://reader.kleinbem.dev',
		host: 'nasbook',
		network: 'public',
		authRequired: false,
		tags: ['rss', 'news', 'feeds']
	},
	{
		id: 'paperless',
		name: 'Paperless-ngx',
		category: 'Documents',
		icon: '📄',
		description: 'Document archive with automatic OCR, indexing, and tags.',
		url: 'https://paperless.kleinbem.dev',
		host: 'nasbook',
		network: 'mesh',
		authRequired: true,
		tags: ['docs', 'ocr', 'archive']
	},
	{
		id: 'qbittorrent',
		name: 'qBittorrent',
		category: 'Apps',
		icon: '📥',
		description: 'Headless BitTorrent client with Web UI.',
		url: 'https://torrents.kleinbem.dev',
		host: 'nasbook',
		network: 'mesh',
		authRequired: true,
		tags: ['torrents', 'downloads']
	}
];

export const CATEGORY_ORDER: ServiceItem['category'][] = [
	'Infrastructure',
	'Identity',
	'AI',
	'AI Engineering',
	'Dev',
	'Apps',
	'Documents',
	'Security',
	'Media'
];
