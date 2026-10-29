# Offline signing-key backup

`dooz-keystore-2026-10-29.7z` is an AES-256 encrypted 7z archive (encrypted
headers) containing:

- `dooz-release.jks` - Dooz release signing key
- `credentials.env` - store/key passwords and alias
- `README.txt` - fingerprints, backup rules

**The archive passphrase is NOT stored in this repository.** It was sent to the
project owner by email (2026-10-29) and must also be kept in a password manager.
Without it the archive cannot be opened.

Key fingerprint (SHA-1): `BE:09:01:79:7A:E7:B0:52:1B:C1:49:AE:34:F5:F2:D8:A5:B0:0E:BB`

Restore:

```powershell
7z x dooz-keystore-2026-10-29.7z -oandroid\keystore -p<passphrase>
pwsh -File scripts\verify-apk-signature.ps1 -Apk <apk>
```

> The raw `.jks` and `credentials.env` must never be committed. `*.jks` and
> `android/keystore/` are already covered by `.gitignore`.
