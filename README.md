# Foyer 🏠

> *The elegant, lightweight homelab portal and service launchpad for the kleinbem fleet.*

Foyer serves as the front door to [`home.kleinbem.dev`](https://home.kleinbem.dev). Built with modern SvelteKit and Tailwind CSS 4 using the shared [`@kleinbem/web-config`](https://github.com/kleinbem/web-config) design system, Foyer delivers instantaneous page loads with zero runtime overhead on host infrastructure.

## ✨ Features

- **Fleet Design System**: Fully synchronized theme tokens, typography, and dark/light modes powered by `@kleinbem/web-config`.
- **Zero Runtime Overhead**: Packaged via Nix as a pure static SPA served directly by Caddy; no persistent Node.js or container runtime required on `core-pi`.
- **Network Reachability Awareness**: Clear visual badges for **Public** (Cloudflare Tunnel), **Mesh-Only** (NetBird), and **LAN-Only** services.
- **Real-Time Health & Uptime**: Direct live status integration with the fleet's [Gatus](https://status.kleinbem.dev) instance.
- **Command Palette (`⌘K` / `/`)**: Fast keyboard-driven fuzzy search across all services, host nodes, and quick links.
- **Host Node Filtering**: Filter services dynamically by node (`core-pi`, `nixos-nvme`, `mac-mini`, `nasbook`, `bpi-r4`).
- **Live Weather & Telemetry**: Built-in weather widget (Open-Meteo) and system clocks.

## 🛠️ Development

```bash
just dev      # Start local development server
just check    # Run Svelte and TypeScript checks
just build    # Build static assets (to build/)
just preview  # Preview production build
```

## 📦 Deployment & Nix

Packaged using `pkgs.buildNpmPackage` with reproducible npm locks:

```bash
nix build .#default
```
