import type { HostInfo } from '../types';

export const FLEET_HOSTS: HostInfo[] = [
	{
		id: 'core-pi',
		name: 'core-pi',
		role: 'Gateway & Auth Conductor',
		ip: '10.0.0.22',
		arch: 'aarch64'
	},
	{
		id: 'nixos-nvme',
		name: 'nixos-nvme',
		role: 'Primary Workstation & Build Fleet',
		ip: '10.0.0.20',
		arch: 'x86_64'
	},
	{
		id: 'mac-mini',
		name: 'mac-mini',
		role: 'Media & LLM Inference Conductor',
		ip: '10.0.0.23',
		arch: 'aarch64'
	},
	{
		id: 'nasbook',
		name: 'nasbook',
		role: 'Storage & Persistent Vault',
		ip: '10.0.0.21',
		arch: 'x86_64'
	},
	{
		id: 'orin-nano',
		name: 'orin-nano',
		role: 'Edge AI & Acceleration',
		ip: '10.0.0.24',
		arch: 'aarch64'
	},
	{
		id: 'bpi-r4',
		name: 'bpi-r4',
		role: 'Fleet OpenWrt Router',
		ip: '10.0.0.1',
		arch: 'aarch64'
	}
];
