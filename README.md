# Foyer

Lightweight static homelab portal and service launchpad built with SvelteKit 5, Tailwind CSS 4, and [`@kleinbem/web-config`](https://github.com/kleinbem/web-config).

Foyer compiles to a pure static SPA (`index.html`, `200.html`, `_app/`) with zero backend process or database, and loads its service and host catalogue at runtime from `/config.json`.

## Features

- **Runtime `/config.json` Catalogue**: Deploy one immutable static build anywhere and mount or serve `/config.json` per environment with strict runtime schema and URL validation.
- **Command Palette (`⌘K` / `/`)**: Multi-token keyboard search across services, pinned bookmarks, and host nodes with `#host`, `@category`, `!network`, and `>` web-search prefixes. Matches in the name come first. With `typeToSearch`, typing a letter or digit anywhere on the page opens it.
- **Network Reachability Badges**: Distinct indicators for `public`, `mesh`, and `lan` endpoints plus one-click filter chips.
- **Live Gatus Health**: Optional client-side polling against a [Gatus](https://gatus.io) `/api/v1/endpoints/statuses` endpoint with visibility-aware refresh and stale-data indication. Each card shows the response time, the outcome of the last 20 checks, and why a failing check failed; the tab title counts the services that are down.
- **Needs Attention**: A panel that lists every service that is down, plus the items of an optional JSON feed (`attentionUrl`), most severe first. It is hidden when there is nothing to show.
- **Host Node Bar**: Per-host service counts and health, one-click host filtering, and IP clipboard copy.
- **Instant Start**: The last loaded `/config.json` is kept in the browser, so the page renders at once and stays usable when the file cannot be fetched.
- **Shared Pinned Links**: Optional `links` in `/config.json` show the same pinned links to every visitor, ahead of their own bookmarks.
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
  "typeToSearch": true,
  "attentionUrl": "/attention.json",
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
  "links": [
    {
      "name": "Docs",
      "url": "https://docs.example.com",
      "icon": "📚"
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

### Attention feed

`attentionUrl` points to a JSON file that anything can write: a cron job, a CI step, a script. Foyer fetches it every five minutes and never sends credentials of its own, so keep tokens in whatever generates the file.

```json
{
  "items": [
    {
      "id": "pr-42",
      "title": "Review requested: fix the flux capacitor",
      "url": "https://git.example.com/lab/core/pulls/42",
      "detail": "Waiting for two days",
      "source": "Forgejo",
      "severity": "warning",
      "updatedAt": "2026-01-15T09:30:00Z"
    }
  ]
}
```

Only `title` is required. `severity` is `critical`, `warning` or `info` (the default). A bare array of items works too; at most 50 items are shown.

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
