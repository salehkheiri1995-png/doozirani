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

Use the original Bazaar keystore and keep it outside Git. Set `DOOZ_RELEASE_STORE_FILE`, `DOOZ_RELEASE_STORE_PASSWORD`, `DOOZ_RELEASE_KEY_ALIAS`, and `DOOZ_RELEASE_KEY_PASSWORD`, then run `./gradlew assembleRelease`. Verify package, versionCode and certificate with `apkanalyzer` and `apksigner`. Current versionCode is 6 and must exceed the published version.

## Logs and troubleshooting

Use `adb logcat -s DoozAds`. Internal application events are `init_started`, `init_succeeded`, `ad_requested`, `ad_loaded`, `ad_load_failed`, `ad_show_started`, `ad_show_failed`, `ad_closed`, and `reward_earned`; these names are not presented as SDK APIs. For no-fill or show failures, do not grant a reward. Official impressions and revenue must be checked in the publisher panel. Local MP4 playback, timers and clicks are not ads or revenue.

Reward is granted only from the SDK rewarded callback and is deduplicated per request. Client-only rewards are not fraud-proof; use an official server-side verification mechanism if Tapsell enables one for the account.

## Rollback

Revert the PR commits or deploy the previous correctly signed Bazaar artifact. Do not restore local MP4 advertisements or fixed revenue formulas as a fallback.
