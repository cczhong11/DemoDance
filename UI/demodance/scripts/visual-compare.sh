#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_DIR="${ROOT_DIR}/UI/demodance"
OUT_DIR="${APP_DIR}/.playwright-baseline-check"
DIFF_DIR="${OUT_DIR}/diff"

mkdir -p "${OUT_DIR}" "${DIFF_DIR}"

echo "[visual-compare] Ensuring Playwright chromium is installed..."
cd "${APP_DIR}"
if [ ! -d "${HOME}/Library/Caches/ms-playwright/chromium-1217" ] || [ ! -d "${HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217" ]; then
  npx playwright install chromium >/dev/null
fi

echo "[visual-compare] Capturing actual screenshots..."
npx playwright screenshot --viewport-size=1672,941 http://localhost:3000/onboarding "${OUT_DIR}/actual-onboarding.png"
npx playwright screenshot --viewport-size=1672,941 http://localhost:3000/workflow "${OUT_DIR}/actual-workflow.png"
npx playwright screenshot --viewport-size=1672,941 http://localhost:3000/generate "${OUT_DIR}/actual-generate.png"

echo "[visual-compare] Building diff images..."
ffmpeg -y -i "${ROOT_DIR}/s1.png" -i "${OUT_DIR}/actual-onboarding.png" -filter_complex blend=all_mode=difference -frames:v 1 "${DIFF_DIR}/onboarding-diff.png" >/dev/null 2>&1
ffmpeg -y -i "${ROOT_DIR}/s2.png" -i "${OUT_DIR}/actual-workflow.png" -filter_complex blend=all_mode=difference -frames:v 1 "${DIFF_DIR}/workflow-diff.png" >/dev/null 2>&1
ffmpeg -y -i "${ROOT_DIR}/s3.png" -i "${OUT_DIR}/actual-generate.png" -filter_complex blend=all_mode=difference -frames:v 1 "${DIFF_DIR}/generate-diff.png" >/dev/null 2>&1

echo "[visual-compare] PSNR summary (higher is better):"
ffmpeg -i "${ROOT_DIR}/s1.png" -i "${OUT_DIR}/actual-onboarding.png" -lavfi psnr -f null - 2>&1 | rg "average:" || true
ffmpeg -i "${ROOT_DIR}/s2.png" -i "${OUT_DIR}/actual-workflow.png" -lavfi psnr -f null - 2>&1 | rg "average:" || true
ffmpeg -i "${ROOT_DIR}/s3.png" -i "${OUT_DIR}/actual-generate.png" -lavfi psnr -f null - 2>&1 | rg "average:" || true

echo "[visual-compare] Artifacts:"
echo "  ${OUT_DIR}/actual-onboarding.png"
echo "  ${OUT_DIR}/actual-workflow.png"
echo "  ${OUT_DIR}/actual-generate.png"
echo "  ${DIFF_DIR}/onboarding-diff.png"
echo "  ${DIFF_DIR}/workflow-diff.png"
echo "  ${DIFF_DIR}/generate-diff.png"
