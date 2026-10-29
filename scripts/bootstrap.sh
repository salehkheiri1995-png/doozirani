#!/usr/bin/env bash
# Prepares a fresh machine (new VPS, new IP, empty clone) for signed Dooz releases.
#
#   DOOZ_KEY_PASSPHRASE='...' ./scripts/bootstrap.sh
#
# Restores android/keystore from the encrypted backup in the repo, fixes the
# keystore path for this machine, and checks the signing fingerprint.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ksdir="$root/android/keystore"
ks="$ksdir/dooz-release.jks"
cred="$ksdir/credentials.env"
archive="$root/backup/dooz-keystore-2026-10-29.7z"
expected="BE:09:01:79:7A:E7:B0:52:1B:C1:49:AE:34:F5:F2:D8:A5:B0:0E:BB"

if [ -f "$ks" ]; then
  echo "Keystore already present: $ks"
else
  [ -f "$archive" ] || { echo "Backup archive missing: $archive"; exit 1; }
  if ! command -v 7z >/dev/null 2>&1 && ! command -v 7za >/dev/null 2>&1; then
    echo "7-Zip is required. Install it first:  sudo apt install -y p7zip-full"
    exit 1
  fi
  : "${DOOZ_KEY_PASSPHRASE:?Set DOOZ_KEY_PASSPHRASE to the archive passphrase (kept in your password manager / email)}"
  mkdir -p "$ksdir"
  sevenzip="$(command -v 7z || command -v 7za)"
  # The archive stores repo-relative paths (android/keystore/...), so extract at the repo root.
  "$sevenzip" x -y "$archive" -o"$root" -p"$DOOZ_KEY_PASSPHRASE" >/dev/null
  echo "Keystore restored from $archive"
fi

[ -f "$cred" ] || { echo "credentials.env missing next to the keystore"; exit 1; }

# The committed credentials.env holds a Windows path; point it at this machine.
if command -v cygpath >/dev/null 2>&1; then
  ks_path="$(cygpath -w "$ks")"      # Git Bash on Windows: Gradle needs C:\...
else
  ks_path="$ks"
fi

tmp="$(mktemp)"
grep -v '^DOOZ_RELEASE_STORE_FILE=' "$cred" > "$tmp" || true
echo "DOOZ_RELEASE_STORE_FILE=$ks_path" >> "$tmp"
grep -q '^DOOZ_RELEASE_STORE_PASSWORD=' "$tmp" || { echo "credentials.env has no DOOZ_RELEASE_STORE_PASSWORD"; exit 1; }
mv "$tmp" "$cred"

# Read without shell expansion: passwords may contain $ or backticks.
while IFS='=' read -r key value; do
  case "$key" in ''|\#*) continue ;; esac
  export "$key=$value"
done < "$cred"

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool not found (install a JDK 17: apt install -y openjdk-17-jdk-headless)"
  exit 1
fi

out="$(keytool -list -v -keystore "$ks" -storepass "$DOOZ_RELEASE_STORE_PASSWORD" -alias "$DOOZ_RELEASE_KEY_ALIAS")"
sha1="$(printf '%s\n' "$out" | grep -i 'SHA1:' | head -1 | sed 's/.*SHA1:[[:space:]]*//' | tr -d ' :\r' | tr 'a-f' 'A-F')"
want="$(printf '%s' "$expected" | tr -d ' :\r' | tr 'a-f' 'A-F')"

if [ "$sha1" != "$want" ]; then
  echo "FATAL: keystore fingerprint mismatch"
  echo "  found: $sha1"
  echo "  want : $want"
  exit 1
fi

echo "OK - signing key ready (SHA-1 $expected)"
echo "Next: ./scripts/release.sh"
