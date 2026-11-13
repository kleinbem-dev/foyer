{
  lib,
  buildNpmPackage,
  nodejs,
  nix-update-script,
  runCommand,
  caddy,
  curl,
  jq,
}:

buildNpmPackage (finalAttrs: {
  pname = "foyer";
  version = "0.1.0";

  # In nixpkgs (`pkgs/by-name/fo/foyer/package.nix`), swap `fileset` for
  # `fetchFromGitHub { owner = "kleinbem-dev"; repo = "foyer"; tag = "v${finalAttrs.version}"; hash = "..."; }`.
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../package-lock.json
      ../tsconfig.json
      ../vite.config.ts
      ../src
      ../static
      ../test
    ];
  };

  npmDepsHash = "sha256-rFIpfCDb2SYN6SVz9K+sA0ht3KWCP3JjgsDj7rw+WJw=";
  # pacote creates `_cacache/tmp` when unpacking git dependencies (`@kleinbem/web-config`).
  makeCacheWritable = true;

  strictDeps = true;
  __structuredAttrs = true;

  doCheck = true;

  checkPhase = ''
    runHook preCheck

    npm test
    npm run check

    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r build/* "$out/"

    runHook postInstall
  '';

  doInstallCheck = true;

  installCheckPhase = ''
    runHook preInstallCheck

    for expected in index.html 200.html config.json _app; do
      if [ ! -e "$out/$expected" ]; then
        echo "missing expected build output: $expected" >&2
        exit 1
      fi
    done

    if grep -rn '/nix/store/' "$out"; then
      echo "unexpected /nix/store reference leaked into static assets" >&2
      exit 1
    fi

    runHook postInstallCheck
  '';

  passthru = {
    updateScript = nix-update-script { };
    tests.smoke =
      runCommand "${finalAttrs.pname}-smoke-test"
        {
          nativeBuildInputs = [
            caddy
            curl
            jq
          ];
        }
        ''
          sock="$TMPDIR/caddy.sock"
          cat > Caddyfile <<EOF
          {
            admin off
            auto_https off
          }
          http:// {
            bind unix/$sock
            root * ${finalAttrs.finalPackage}
            try_files {path} /200.html
            file_server
          }
          EOF

          HOME="$TMPDIR" XDG_DATA_HOME="$TMPDIR" XDG_CONFIG_HOME="$TMPDIR" \
            caddy run --config Caddyfile >"$TMPDIR/caddy.log" 2>&1 &
          caddy_pid=$!
          trap 'kill "$caddy_pid" 2>/dev/null || true' EXIT

          ready=0
          for _ in $(seq 1 50); do
            if curl -fsS --unix-socket "$sock" http://localhost/ >/dev/null 2>&1; then
              ready=1
              break
            fi
            sleep 0.1
          done
          if [ "$ready" -ne 1 ]; then
            cat "$TMPDIR/caddy.log" >&2
            echo "caddy failed to start on $sock" >&2
            exit 1
          fi

          curl -fsS --unix-socket "$sock" http://localhost/ | grep -q "sveltekit"
          curl -fsS --unix-socket "$sock" http://localhost/deep/spa/route | grep -q "sveltekit"
          curl -fsS --unix-socket "$sock" http://localhost/config.json | jq -e '.title == "Foyer" and (.services | type == "array")' >/dev/null

          touch "$out"
        '';
  };

  meta = {
    description = "Lightweight static homelab portal and service launchpad";
    homepage = "https://github.com/kleinbem-dev/foyer";
    changelog = "https://github.com/kleinbem-dev/foyer/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [ kleinbem ];
    inherit (nodejs.meta) platforms;
  };
})
