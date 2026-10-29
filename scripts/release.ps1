# Builds and verifies a signed Dooz release APK on Windows.
# Usage: pwsh -File scripts/release.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$cred = Join-Path $root 'android\keystore\credentials.env'
if (-not (Test-Path $cred)) {
    Write-Host "Missing android/keystore/credentials.env" -ForegroundColor Red
    Write-Host "Restore it from backup/dooz-keystore-2026-10-29.7z (passphrase is in your email)."
    exit 2
}

Get-Content $cred | Where-Object { $_ -match '^DOOZ_RELEASE_\w+=' } | ForEach-Object {
    $k, $v = $_.Split('=', 2)
    Set-Item -Path "env:$k" -Value $v
}

$vc = (Select-String -Path (Join-Path $root 'android\app\build.gradle') -Pattern 'versionCode (\d+)').Matches[0].Groups[1].Value
Write-Host "Building release with versionCode $vc ..." -ForegroundColor Cyan

Push-Location (Join-Path $root 'android')
try { & .\gradlew.bat assembleRelease --no-daemon; $code = $LASTEXITCODE } finally { Pop-Location }
if ($code -ne 0) { Write-Host "Gradle build failed" -ForegroundColor Red; exit 1 }

Write-Host ""
& pwsh -File (Join-Path $PSScriptRoot 'verify-apk-signature.ps1') -Apk (Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk')
if ($LASTEXITCODE -ne 0) { exit 1 }

Copy-Item (Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk') (Join-Path $root 'dooz-release.apk') -Force
Write-Host "Ready to upload: dooz-release.apk (versionCode $vc)" -ForegroundColor Green
