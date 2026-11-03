# The Bar

Character selection and legacy character import at <https://thebar.rpghorizon.com/>.
Next.js builds a static export; no application server or database is required.

Characters stay in the user's browser under `frontend::QuickplayCharacters`, as
`{"characters":{"id":"name"}}`. Keep the exact HTTPS hostname, storage key and
schema when moving hosting. Changing the bucket or proxy does not require users
to export or import characters. The migration leaves application source unchanged.

## Development and verification

The flake supplies Volta, Chromium, deployment tools and shell/workflow linters.
Volta pins Node in `package.json`; npm uses `package-lock.json`.

```sh
nix develop -c bash scripts/build.sh
nix develop -c bash scripts/check.sh
nix develop -c volta run npm run dev
```

On llb-rdev, prefix builds, tests and development-shell initialization with
`/home/llblumire/.local/bin/build-gate`. Gate a one-shot build before starting a
persistent development server; do not hold a build slot for the server. The dev
server binds all interfaces and is available at
<http://llb-rdev.tail52ad67.ts.net:3000> when running there.

`out/` contains the deployment. Browser checks use synthetic characters in an
isolated browser profile and verify existing IDs, rolling, additions, persistence,
legacy import, navigation, direct routes, redirects and missing pages. They never
read users' browser data. `BAR_BASE_URL` selects an external deployment;
`BAR_ORIGIN_IP` overrides that hostname's DNS for staged HTTPS checks. Optional
`BAR_SAVE_STORAGE` and `BAR_LOAD_STORAGE` transfer the synthetic profile between
deployments while retaining its origin.

The legacy framework dependencies remain pinned. Their npm audit findings remain
build dependency debt; production serves only exported files and runs no Next.js
server. Framework upgrades are separate work.

## Hosting and publishing

- Dedicated Scaleway project: `thebar`.
- Versioned website bucket: `thebar-rpghorizon-com-production-fr-par` in `fr-par`.
- Public HTTPS: independent nginx vhost and certificate on `nro-prod-paris`.
- DNS: only `thebar.rpghorizon.com`, pointing at `rpghorizon.com` after cutover.
- `/play` and `/import` map to their exported HTML files. Next navigation payloads
  remain available as `.txt` files. Unknown paths return the exported 404 page.

GitHub Actions builds and checks pull requests. Main builds publish using the
`Production` environment, restricted to `main`, with `SCW_ACCESS_KEY_ID` and
`SCW_SECRET_ACCESS_KEY`. The publisher has project-scoped IAM access
and bucket permissions to list and write release files. The bucket allows anonymous object reads but
does not allow anonymous listing or writes.

`scripts/publish.sh` requires `S3_BUCKET` and AWS-compatible credentials. Uploads
place immutable Next assets first, then payloads and HTML with short browser
cache lifetimes. Older hashed assets stay available for existing browser tabs;
bucket versioning preserves overwritten files. Nginx does not cache documents
or navigation payloads. Publishing is not an atomic multi-object transaction.

## Infrastructure operations

OpenTofu owns this site's project, publisher application/policy, bucket and DNS.
Its private, versioned backend is `personal-websites-opentofu-state-fr-par`, key
`thebar/infrastructure.tfstate`. Existing NRO and RPG Horizon resources are not
managed by this configuration. Resource destruction is guarded.

Operator credentials stay in the local Scaleway profile and ignored `.env.local`
(`PORKBUN_API_KEY`, `PORKBUN_SECRET_API_KEY`). `scripts/with-scaleway.sh` explicitly
selects the backend's project for S3 authentication. Never commit credentials,
state, saved plans or `.terraform/`.

```sh
nix develop -c scripts/tofu.sh init
nix develop -c scripts/tofu.sh plan -out=/absolute/private/path/site.tfplan
# Review the plan before applying; apply requires the saved plan as its last arg.
nix develop -c scripts/tofu.sh apply /absolute/private/path/site.tfplan
```

For initial staging or DNS rollback, plan with `-var=cutover=false`. The only DNS
resource is the existing The Bar CNAME. A rollback changes its value back to
`cname.vercel-dns.com.`; it does not delete storage or change other domain records.
DNS rollback requires the retained, verified Vercel deployment and domain mapping.
Once that project is retired, restore an earlier static release instead.

On the proxy, `infra/install-proxy.sh` installs only `/etc/nginx/conf.d/thebar.conf`,
validates nginx, and reloads it. It restores that file if installation fails.
The site has a separate bounded cache, connection/rate limits and log files.
Do not edit other sites' vhosts during this site's deployment.

Certificate `thebar-rpghorizon-com` uses the scoped
`/usr/local/sbin/certbot-thebar-dns` hook from this repository and the existing
root-only Porkbun credential file. Its hook changes only this hostname's ACME TXT
record and removes only the challenge it created. Certbot's timer and existing
nginx deploy hook handle renewal. Verify renewal after installation:

```sh
sudo certbot renew --cert-name thebar-rpghorizon-com --dry-run \
  --run-deploy-hooks --no-random-sleep-on-renew
```

To restore content, publish a previously verified static artifact with the same
script. For a single-file recovery, restore its prior Object Storage version;
HTML and payloads bypass nginx caching. Preserve old hashed assets when rolling
back. Browser character data remains local to its original HTTPS origin.
