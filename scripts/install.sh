#!/usr/bin/env bash
set -euo pipefail

repository="HarmanKhangura/skill-installer"
version="${1:-latest}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js first: https://nodejs.org/" >&2
  exit 1
fi

if [[ "$version" == "latest" ]]; then
  download_base="https://github.com/$repository/releases/latest/download"
else
  download_base="https://github.com/$repository/releases/download/$version"
fi

archive="$(mktemp "${TMPDIR:-/tmp}/skill-installer.XXXXXX.tgz")"
checksum_file="$(mktemp "${TMPDIR:-/tmp}/skill-installer.XXXXXX.sha256")"

cleanup() {
  rm -f "$archive" "$checksum_file"
}
trap cleanup EXIT

curl --fail --location --silent --show-error \
  "$download_base/skill-installer.tgz" \
  --output "$archive"
curl --fail --location --silent --show-error \
  "$download_base/skill-installer.tgz.sha256" \
  --output "$checksum_file"

expected_checksum="$(awk '{print $1}' "$checksum_file")"
if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum="$(sha256sum "$archive" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  actual_checksum="$(shasum -a 256 "$archive" | awk '{print $1}')"
else
  echo "A SHA-256 utility (sha256sum or shasum) is required." >&2
  exit 1
fi

if [[ "$expected_checksum" != "$actual_checksum" ]]; then
  echo "Downloaded archive checksum does not match the release checksum." >&2
  exit 1
fi

npm install --global "$archive"
skill-installer --version
