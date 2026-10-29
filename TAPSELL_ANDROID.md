# Tapsell Android integration

## SDK

This branch uses Tapsell Mediation Android SDK `1.4.0-alpha04`, pinned for reproducibility.

- Official documentation: https://developer.tapsell.ir/docs/sdk/platforms/android/quick-start/
- Official sample: https://github.com/tapsellorg/TapsellMediation-AndroidSample
- Android: minSdk 21, compile/target SDK 35, JDK 17, Gradle 8.9, AGP 8.7.3.

The supplied 64-character app key and 24-character placement IDs were not verified as Mediation credentials. The current Mediation sample uses a manifest app ID and UUID zone IDs. Never pass `s01`; it is only a display name. Obtain compatible values from the publisher panel or Tapsell support instead of inventing IDs.

## Configuration

Set `tapsell.mediation.appId=REAL_MEDIATION_APP_ID` in untracked `android/local.properties`, or export `TAPSELL_MEDIATION_APP_ID`. Export `VITE_TAPSELL_REWARDED_ZONE_ID`, `VITE_TAPSELL_BANNER_ZONE_ID`, and `VITE_TAPSELL_INTERSTITIAL_ZONE_ID` before the web build.

## Build

```bash
npm install
npm run lint
npm run build
cd android
./gradlew assembleDebug
```

The debug APK goes to `android/app/build/outputs/apk/debug/app-debug.apk`; it is not suitable for updating Cafe Bazaar.

## Release signing

Never build a Bazaar update with Google AI Studio: its build sandbox generates a new signing key on every build and does not keep it, so its APKs cannot update an already published app.

Sign locally with the permanent key in `android/keystore/dooz-release.jks` (git-ignored, SHA-1 `BE:09:01:79:...:0E:BB`). Load the credentials and build:

```powershell
cd android
Get-Content keystore\credentials.env | Where-Object { $_ -match '^DOOZ_RELEASE_\w+=' } |
  ForEach-Object { $k, $v = $_.Split('=', 2); Set-Item "env:$k" $v }
.\gradlew.bat assembleRelease
```

The signed APK is `app/build/outputs/apk/release/app-release.apk` (an `-unsigned` file means the `DOOZ_RELEASE_*` variables were missing). Check it before uploading:

```powershell
pwsh -File ..\scripts\verify-apk-signature.ps1 -Apk app\build\outputs\apk\release\app-release.apk
```

`applicationId` must stay `dooz.tapcell` and `versionCode` must increase for every upload. See `BAZAAR_KEY_CHANGE.md` for the pending key-reset request and the backup rules.

## Logs and troubleshooting

Use `adb logcat -s DoozAds`. Internal application events are `init_started`, `init_succeeded`, `ad_requested`, `ad_loaded`, `ad_load_failed`, `ad_show_started`, `ad_show_failed`, `ad_closed`, and `reward_earned`; these names are not presented as SDK APIs. For no-fill or show failures, do not grant a reward. Official impressions and revenue must be checked in the publisher panel. Local MP4 playback, timers and clicks are not ads or revenue.

Reward is granted only from the SDK rewarded callback and is deduplicated per request. Client-only rewards are not fraud-proof; use an official server-side verification mechanism if Tapsell enables one for the account.

## Rollback

Revert the PR commits or deploy the previous correctly signed Bazaar artifact. Do not restore local MP4 advertisements or fixed revenue formulas as a fallback.
