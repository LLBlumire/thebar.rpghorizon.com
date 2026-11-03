#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
: "${S3_BUCKET:?Set The Bar bucket name}"
[[ "$S3_BUCKET" == thebar-rpghorizon-com-production-fr-par ]] || {
  echo 'Refusing to publish to an unexpected bucket.' >&2; exit 1;
}
for document in index play import 404; do test -f "out/${document}.html"; done
export AWS_DEFAULT_REGION=fr-par AWS_EC2_METADATA_DISABLED=true
readonly endpoint=https://s3.fr-par.scw.cloud
# Upload every asset before replacing documents. Retain older release assets.
aws --endpoint-url "$endpoint" s3 sync out/_next/static/ "s3://${S3_BUCKET}/_next/static/" \
  --cache-control 'public, max-age=31536000, immutable' --only-show-errors
aws --endpoint-url "$endpoint" s3 sync out/ "s3://${S3_BUCKET}/" \
  --exclude '_next/static/*' --exclude '*.html' --exclude '*.txt' \
  --cache-control 'public, max-age=3600, stale-while-revalidate=86400' --only-show-errors
aws --endpoint-url "$endpoint" s3 sync out/ "s3://${S3_BUCKET}/" \
  --exclude '*' --include '*.txt' --content-type 'text/plain; charset=utf-8' \
  --cache-control 'public, max-age=60, must-revalidate' --only-show-errors
aws --endpoint-url "$endpoint" s3 sync out/ "s3://${S3_BUCKET}/" \
  --delete --exclude '*' --include '*.html' \
  --content-type 'text/html; charset=utf-8' \
  --cache-control 'public, max-age=60, must-revalidate' --only-show-errors
