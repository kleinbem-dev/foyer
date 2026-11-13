# AGENTS.md

Guidance for AI assistants working on Foyer.

## Architecture

Foyer is a pure static SvelteKit 5 SPA (`ssr = false`, `prerender = true`, `200.html` fallback) styled with Tailwind CSS 4 and `@kleinbem/web-config`.

- **`src/lib/config.ts`**: Runtime `/config.json` parser and loader (`parsePortalConfig`, `loadPortalConfig`, URL scheme sanitization, duplicate-ID filtering). Upstream ships a neutral default in `static/config.json`; fleet deployments inject site inventory via `/config.json`.
- **`src/lib/portal.ts`**: Pure domain logic for bookmark validation/creation, multi-token `⌘K` palette search (`#host`, `@category`, `!network`, `>`), category grouping, health metrics, and Open-Meteo parsing.
- **`src/lib/data/gatus.ts`**: Optional client-side Gatus `/api/v1/endpoints/statuses` health polling and endpoint resolution.
- **`src/lib/components/`**: Svelte 5 runes UI components (`Header`, `WeatherWidget`, `HostBar`, `LayoutToggle`, `BookmarksSection`, `CategorySection`, `ServiceCard`, `CommandPalette`). Modals use native `<dialog>` (`showModal()`).
- **`test/`**: Hermetic Node `node:test` + Svelte 5 SSR test suite (`test/setup.ts` compiles `.svelte` and `.svelte.js`/`.svelte.ts` on the fly with zero extra npm dependencies).
- **`nix/package.nix`**: `nixpkgs`-compliant `buildNpmPackage` derivation (`fetchNpmDeps`, `strictDeps = true`, `__structuredAttrs = true`, `checkPhase`, `installCheckPhase`, and offline Caddy `passthru.tests.smoke`).

## Development & Verification

```bash
just dev          # Run Vite dev server
just test         # Run unit and SSR component tests
just check        # Run svelte-check and TypeScript checks (--fail-on-warnings)
just build        # Build static production assets
nix flake check   # Run sandboxed package build, checks, installCheck, and Caddy smoke test
```

When editing `.svelte` files, verify with `npx --offline @sveltejs/mcp svelte-autofixer <file>`.

## TypeScript

`typescript` is aliased to `@typescript/typescript6` and TypeScript 7 sits beside it as
`@typescript/native`: `svelte-check` and the Svelte tooling need the TS 6 JavaScript API, which the
native TS 7 compiler does not ship. Same setup in every fleet Svelte repo.
