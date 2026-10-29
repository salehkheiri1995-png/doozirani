#!/usr/bin/env bash
# Builds and verifies a signed Dooz release APK on Linux/macOS (e.g. a VPS).
# Usage: ./scripts/release.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cred="$root/android/keystore/credentials.env"

if [ ! -f "$cred" ]; then
  echo "Missing android/keystore/credentials.env"
  echo "Restore it: 7z x backup/dooz-keystore-2026-10-29.7z -oandroid/keystore -p<passphrase>"
  exit 2
fi

# Read KEY=VALUE without shell expansion (passwords may contain $ or backticks).
while IFS='=' read -r key value; do
  case "$key" in ''|\#*) continue ;; esac
  export "$key=$value"
done < "$cred"

# The committed file has a Windows path; always point at the local keystore.
export DOOZ_RELEASE_STORE_FILE="$root/android/keystore/dooz-release.jks"

vc="$(grep -oP 'versionCode \K[0-9]+' "$root/android/app/build.gradle" | head -1)"
echo "Building release with versionCode $vc ..."

(cd "$root/android" && ./gradlew assembleRelease --no-daemon)

apk="$root/android/app/build/outputs/apk/release/app-release.apk"
expected="BE:09:01:79:7A:E7:B0:52:1B:C1:49:AE:34:F5:F2:D8:A5:B0:0E:BB"

if command -v apksigner >/dev/null 2>&1; then
  sha1="$(apksigner verify --print-certs "$apk" | grep -i 'SHA-1 digest' | head -1 | sed 's/.*: //')"
elif [ -n "${ANDROID_HOME:-}" ]; then
  sha1="$("$ANDROID_HOME"/build-tools/*/apksigner verify --print-certs "$apk" 2>/dev/null | grep -i 'SHA-1 digest' | head -1 | sed 's/.*: //')"
else
  echo "apksigner not found; skipping signature check"
  sha1=""
fi

if [ -n "$sha1" ]; then
  if [ "$sha1" = "$expected" ]; then
    echo "OK - signed with the Dooz release key"
  else
    echo "FAIL - wrong key: $sha1"
    exit 1
  fi
fi

cp "$apk" "$root/dooz-release.apk"
echo "Ready to upload: dooz-release.apk (versionCode $vc)"
