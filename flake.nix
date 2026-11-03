{
  description = "The Bar static hosting and verification tools";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { nixpkgs, ... }: {
    devShells = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in {
        default = pkgs.mkShell {
          packages = [ pkgs.volta pkgs.awscli2 pkgs.opentofu pkgs.scaleway-cli
                       pkgs.shellcheck pkgs.actionlint pkgs.python3 pkgs.chromium ];
        };
      });
  };
}
