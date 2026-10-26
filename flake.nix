{
  description = "PRECURSOR — Reliability-Gated Early Warning for Network Failures";

  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "precursor-dev";
          buildInputs = with pkgs; [
            python3
            python3Packages.pip
            python3Packages.virtualenv
            stdenv.cc.cc.lib
            zlib
            glib
            iputils
            iproute2
            procps
            curl
          ];

          shellHook = ''
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
              pkgs.stdenv.cc.cc.lib
              pkgs.zlib
              pkgs.glib
            ]}:$LD_LIBRARY_PATH"
            export PYTHONPATH="$PWD:$PYTHONPATH"
            echo "🚀 PRECURSOR dev shell active. Run: source .venv/bin/activate"
          '';
        };
      }
    );
}
