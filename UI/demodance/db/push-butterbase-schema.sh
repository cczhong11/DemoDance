#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
SCHEMA_FILE="${ROOT_DIR}/db/butterbase-schema.applied.json"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi
if [[ ! -f "${SCHEMA_FILE}" ]]; then
  echo "Missing ${SCHEMA_FILE}"
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

if [[ -z "${BUTTERBASE_API_BASE_URL:-}" ]]; then
  echo "BUTTERBASE_API_BASE_URL is not set"
  exit 1
fi
TOKEN="${BUTTERBASE_API_TOKEN:-${BUTTERBASE_API_KEY:-}}"
TOKEN="${TOKEN//\"/}"
if [[ -z "${TOKEN}" ]]; then
  echo "BUTTERBASE_API_TOKEN or BUTTERBASE_API_KEY is not set"
  exit 1
fi

TMP_DRY="$(mktemp)"
TMP_APPLY="$(mktemp)"
trap 'rm -f "$TMP_DRY" "$TMP_APPLY"' EXIT

jq '.dry_run=true' "$SCHEMA_FILE" > "$TMP_DRY"
curl -sS -X POST "${BUTTERBASE_API_BASE_URL}/schema/apply" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data @"$TMP_DRY" | jq '{error, dry_run, applied, statement_count:(.statements|length)}'

jq '.dry_run=false' "$SCHEMA_FILE" > "$TMP_APPLY"
curl -sS -X POST "${BUTTERBASE_API_BASE_URL}/schema/apply" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data @"$TMP_APPLY" | jq '{error, applied, statement_count:(.statements|length)}'

curl -sS -H "Authorization: Bearer ${TOKEN}" "${BUTTERBASE_API_BASE_URL}/schema" | \
  jq '{app_id, table_count:(.schema.tables|keys|length), tables:(.schema.tables|keys)}'
