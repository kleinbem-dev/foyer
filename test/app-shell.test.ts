import * as assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';

function extractHeadInitScript(html: string): string {
	const match = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>[\s\S]*?<\/head>/i);
	assert.ok(match && match[1], 'Expected inline theme initialization script in <head>');
	return match[1];
}

function runThemeInit(options: {
	storedTheme?: string | null;
	storedFontSize?: string | null;
	prefersDark?: boolean;
	throwStorage?: boolean;
}) {
	const html = readFileSync('src/app.html', 'utf8');
	const script = extractHeadInitScript(html);

	const classes = new Set<string>();
	const dataset: Record<string, string> = {};

	const context = {
		localStorage: {
			getItem(key: string) {
				if (options.throwStorage) {
					throw new Error('SecurityError: storage disabled');
				}
				if (key === 'fleet-theme') return options.storedTheme ?? null;
				if (key === 'fleet-font-size') return options.storedFontSize ?? null;
				return null;
			}
		},
		window: {
			matchMedia() {
				return { matches: Boolean(options.prefersDark) };
			}
		},
		document: {
			documentElement: {
				dataset,
				classList: {
					add(cls: string) {
						if (/\s/.test(cls)) throw new Error('InvalidCharacterError');
						classes.add(cls);
					},
					toggle(cls: string, force?: boolean) {
						if (force === undefined) {
							if (classes.has(cls)) classes.delete(cls);
							else classes.add(cls);
						} else if (force) {
							classes.add(cls);
						} else {
							classes.delete(cls);
						}
					}
				}
			}
		}
	};

	runInNewContext(script, context);
	return { dataset, classes };
}

describe('app.html zero-FOUC initialization script', () => {
	it('applies explicit dark and light stored themes', () => {
		const dark = runThemeInit({ storedTheme: 'dark', prefersDark: false });
		assert.equal(dark.dataset.theme, 'dark');
		assert.ok(dark.classes.has('dark'));
		assert.ok(!dark.classes.has('light'));

		const light = runThemeInit({ storedTheme: 'light', prefersDark: true });
		assert.equal(light.dataset.theme, 'light');
		assert.ok(light.classes.has('light'));
		assert.ok(!light.classes.has('dark'));
	});

	it('falls back to prefers-color-scheme when unset or set to system', () => {
		const sysDark = runThemeInit({ storedTheme: 'system', prefersDark: true });
		assert.equal(sysDark.dataset.theme, 'dark');
		assert.ok(sysDark.classes.has('dark'));

		const unsetLight = runThemeInit({ storedTheme: null, prefersDark: false });
		assert.equal(unsetLight.dataset.theme, 'light');
		assert.ok(unsetLight.classes.has('light'));
	});

	it('never throws when localStorage throws SecurityError or contains malformed values', () => {
		const res = runThemeInit({ throwStorage: true, prefersDark: true });
		assert.ok(res);

		const malformed = runThemeInit({
			storedTheme: 'unexpected-value',
			storedFontSize: 'bad value with spaces',
			prefersDark: true
		});
		assert.equal(malformed.dataset.theme, 'dark');
		assert.equal(malformed.dataset.fontSize, undefined);
	});
});

describe('static production build output (when build/ exists)', () => {
	it('contains valid SPA entrypoints and no leaked /nix/store paths', () => {
		if (!existsSync('build/index.html')) return;

		const indexHtml = readFileSync('build/index.html', 'utf8');
		const fallbackHtml = readFileSync('build/200.html', 'utf8');
		assert.match(indexHtml, /<!doctype html>/i);
		assert.match(fallbackHtml, /<!doctype html>/i);

		const files = readdirSync('build', { recursive: true });
		assert.ok(files.some((f) => String(f).startsWith('_app/')));

		for (const rel of files) {
			const path = `build/${String(rel)}`;
			if (/\.(html|js|css|json)$/.test(path)) {
				const content = readFileSync(path, 'utf8');
				assert.doesNotMatch(content, /\/nix\/store\//, `Unexpected Nix store reference in ${path}`);
			}
		}
	});
});
