# Verifies that an APK is signed with the Dooz release key.
# Usage:  pwsh -File scripts/verify-apk-signature.ps1 -Apk public/dooz.apk
# Exit code 0 = correct key, 1 = wrong key / unsigned, 2 = bad usage.
param(
    [Parameter(Mandatory = $true)][string]$Apk,
    [string]$ExpectedSha1 = 'BE:09:01:79:7A:E7:B0:52:1B:C1:49:AE:34:F5:F2:D8:A5:B0:0E:BB'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Apk)) { Write-Error "APK not found: $Apk"; exit 2 }

$sdk = $env:ANDROID_HOME; if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
$apksigner = $null
if ($sdk) {
    $apksigner = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
}

$sha1 = $null
if ($apksigner) {
    $certs = & $apksigner verify --print-certs $Apk 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host ($certs -join "`n"); Write-Error "APK signature is not valid"; exit 1 }
    $sha1 = ($certs | Select-String -Pattern 'SHA-1 digest' | Select-Object -First 1) -replace '.*SHA-1 digest:\s*', ''
} else {
    # Fallback: pull the signing certificate out of the APK and read it with keytool.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $Apk))
    try {
        $entry = $zip.Entries | Where-Object { $_.FullName -match '^META-INF/.*\.(RSA|DSA|EC)$' } | Select-Object -First 1
        if (-not $entry) { Write-Error "APK is unsigned (no META-INF certificate)"; exit 1 }
        $tmp = Join-Path ([IO.Path]::GetTempPath()) ("doozcert-" + [guid]::NewGuid() + ".cer")
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $tmp, $true)
    } finally { $zip.Dispose() }
    $out = & keytool -printcert -file $tmp 2>&1
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $sha1 = ($out | Select-String -Pattern 'SHA1:' | Select-Object -First 1) -replace '.*SHA1:\s*', ''
}

# Normalise both sides to plain uppercase hex so "AA:BB:CC" and "AABBCC" compare equal.
$sha1 = ($sha1 -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
$ExpectedSha1 = ($ExpectedSha1 -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()

Write-Host "APK      : $Apk"
Write-Host "SHA-1    : $sha1"
Write-Host "Expected : $ExpectedSha1"
if ($sha1 -eq $ExpectedSha1) {
    Write-Host "OK - signed with the Dooz release key" -ForegroundColor Green
    exit 0
}
Write-Host "FAIL - this APK cannot update the published app" -ForegroundColor Red
exit 1
