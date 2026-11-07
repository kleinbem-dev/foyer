{
  description = "Lightweight homelab portal and service launchpad for the kleinbem fleet";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        formatter = pkgs.nixfmt;

        packages.default = pkgs.buildNpmPackage {
          pname = "foyer";
          version = "0.1.0";
          src = ./.;
          npmDeps = pkgs.importNpmLock { npmRoot = ./.; };
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;
          installPhase = ''
            mkdir -p $out
            cp -r build/* $out/
          '';
          meta = with pkgs.lib; {
            description = "Lightweight homelab portal and service launchpad";
            homepage = "https://github.com/kleinbem-dev/foyer";
            license = licenses.mit;
          };
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            just
          ];
        };
      }
    );
}
