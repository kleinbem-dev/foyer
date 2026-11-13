# Foyer

Lightweight static homelab portal and service launchpad built with SvelteKit 5, Tailwind CSS 4, and [`@kleinbem/web-config`](https://github.com/kleinbem/web-config).

Foyer compiles to a pure static SPA (`index.html`, `200.html`, `_app/`) with zero backend process or database, and loads its service and host catalogue at runtime from `/config.json`.

## Features

- **Runtime `/config.json` Catalogue**: Deploy one immutable static build anywhere and mount or serve `/config.json` per environment with strict runtime schema and URL validation.
- **Command Palette (`⌘K` / `/`)**: Multi-token keyboard search across services, pinned bookmarks, and host nodes with `#host`, `@category`, `!network`, and `>` web-search prefixes.
- **Network Reachability Badges**: Distinct indicators for `public`, `mesh`, and `lan` endpoints plus one-click filter chips.
- **Live Gatus Health**: Optional client-side polling against a [Gatus](https://gatus.io) `/api/v1/endpoints/statuses` endpoint with visibility-aware refresh and stale-data indication.
- **Host Node Bar**: Per-host service counts, one-click host filtering, and IP clipboard copy.
- **Local Quick Bookmarks**: Browser-stored personal links (`localStorage`) in a dedicated native `<dialog>` modal, immediately searchable from `⌘K`.
- **Optional Weather & Clock**: Minute-aligned UTC/local header clock and optional [Open-Meteo](https://open-meteo.com) telemetry widget.

## Runtime Configuration (`/config.json`)

Serve a `/config.json` file at the web root alongside Foyer's static assets (an empty neutral config ships by default):

```json
{
  "title": "Foyer",
  "subtitle": "Homelab Launchpad",
  "gatusUrl": "https://status.example.com",
  "searchUrlTemplate": "https://duckduckgo.com/?q=%s",
  "weather": {
    "latitude": 51.5072,
    "longitude": -0.1276,
    "label": "London"
  },
  "categoryOrder": ["Infrastructure", "Media"],
  "hosts": [
    {
      "id": "core-01",
      "name": "core-01",
      "ip": "192.0.2.10",
      "role": "Edge & Ingress"
    }
  ],
  "services": [
    {
      "id": "grafana",
      "name": "Grafana",
      "description": "Metrics and dashboards",
      "url": "https://grafana.example.com",
      "icon": "📊",
      "category": "Infrastructure",
      "host": "core-01",
      "network": "mesh",
      "gatusEndpoint": "grafana",
      "tags": ["metrics", "observability"]
    }
  ],
  "footerLinks": [
    {
      "label": "Status",
      "url": "https://status.example.com"
    }
  ]
}
```

## Development

```bash
just dev      # Start Vite development server
just test     # Run Node + Svelte SSR unit & component tests
just check    # Run svelte-check and TypeScript checks (--fail-on-warnings)
just build    # Build production static assets to build/
just preview  # Preview production build locally
```

## Nix & Deployment

Foyer builds reproducibly in the Nix sandbox via `buildNpmPackage` (`nix/package.nix`):

```bash
nix build .#default
nix flake check
```

Serve the resulting store path with any static file server (such as Caddy or nginx) configured with `try_files {path} /200.html` and mount your site-specific `/config.json` over the web root.

## License

[MIT](./LICENSE)
