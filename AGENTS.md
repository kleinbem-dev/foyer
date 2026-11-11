# AGENTS.md

Guidance for AI assistants working on Foyer.

## What Foyer is

Foyer is the lightweight, next-generation homelab portal and service launchpad for the kleinbem fleet (`home.kleinbem.dev`).
It replaces legacy heavy dashboards (like Homepage) with a fast, modern static SvelteKit application styled with `@kleinbem/web-config` and Tailwind CSS 4.

## Key Capabilities

- **Fleet Design System**: Uses `@kleinbem/web-config` themes (dark/light, system preference, zero-FOUC).
- **Service catalogue**: hand-maintained `FLEET_SERVICES` in `src/lib/data/services.ts` and `FLEET_HOSTS` in `src/lib/data/hosts.ts` (not generated from `inventory.nix`).
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

## TypeScript

`typescript` is aliased to `@typescript/typescript6` and TypeScript 7 sits beside it as
`@typescript/native`: svelte-check and the Svelte tooling need the TS 6 JavaScript API, which the
native TS 7 compiler does not ship. Same setup in every fleet Svelte repo.
