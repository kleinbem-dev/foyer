# AGENTS.md

Guidance for AI assistants working on Foyer.

## What Foyer is

Foyer is the lightweight, next-generation homelab portal and service launchpad for the kleinbem fleet (`home.kleinbem.dev`).
It replaces legacy heavy dashboards (like Homepage) with a fast, modern static SvelteKit application styled with `@kleinbem/web-config` and Tailwind CSS 4.

## Key Capabilities

- **Fleet Design System**: Uses `@kleinbem/web-config` themes (dark/light, system preference, zero-FOUC).
- **Fleet Inventory Integration**: Reads services dynamically from `inventory.nix` data.
- **Network Reachability Indicators**: Highlights Public (Cloudflare Tunnel), Mesh-Only (NetBird), and LAN endpoints.
- **Gatus Live Health**: Queries live service statuses from `status.kleinbem.dev`.
- **Command Palette (`⌘K`)**: Instant fuzzy search across services, hosts, and tools.
- **Zero Runtime Overhead**: Packaged via Nix (`buildNpmPackage`) as a pure static SPA served directly by Caddy.

## Development

```bash
just dev      # Run Vite dev server
just check    # Run svelte-check and TypeScript checks
just build    # Build static production assets
just preview  # Preview production build
```
