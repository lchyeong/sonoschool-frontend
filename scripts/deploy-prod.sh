#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-east-1}"
BUCKET="${BUCKET:-sonoschool-prod-web}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-E29MZ2355SJSTM}"

npm run build

aws s3 sync dist/assets/ "s3://${BUCKET}/assets/" \
  --region "${REGION}" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync dist/ "s3://${BUCKET}/" \
  --region "${REGION}" \
  --exclude "index.html" \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate"

aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --region "${REGION}" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*"
