#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

def run(cmd, cwd=None):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"STDERR: {res.stderr}")
        print(f"STDOUT: {res.stdout}")
        sys.exit(res.returncode)
    return res.stdout

BUILD_DIR = "/tmp/apk_build"
APPLET_DIR = "/app/applet"
ANDROID_JAR = "/usr/lib/android-sdk/platforms/android-23/android.jar"

# 0. Build latest production web assets
print("Step 0: Building latest production web app with Vite...")
run("npm run build", cwd=APPLET_DIR)

if os.path.exists(BUILD_DIR):
    shutil.rmtree(BUILD_DIR)

os.makedirs(f"{BUILD_DIR}/src/dooz/tapcell", exist_ok=True)
os.makedirs(f"{BUILD_DIR}/res/values", exist_ok=True)
os.makedirs(f"{BUILD_DIR}/res/mipmap", exist_ok=True)
os.makedirs(f"{BUILD_DIR}/assets/www", exist_ok=True)
os.makedirs(f"{BUILD_DIR}/obj", exist_ok=True)
os.makedirs(f"{BUILD_DIR}/bin", exist_ok=True)

# 1. AndroidManifest.xml
manifest_content = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="dooz.tapcell"
    android:versionCode="5"
    android:versionName="1.4">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name="dooz.tapcell.MainActivity"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:screenOrientation="portrait"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""

with open(f"{BUILD_DIR}/AndroidManifest.xml", "w") as f:
    f.write(manifest_content)

# 2. strings.xml
with open(f"{BUILD_DIR}/res/values/strings.xml", "w") as f:
    f.write("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">دوز اصیل ایرانی</string>
</resources>
""")

# 3. Copy launcher icon
shutil.copy(f"{APPLET_DIR}/public/pwa-192x192.png", f"{BUILD_DIR}/res/mipmap/ic_launcher.png")

# 4. Copy dist web assets to assets/www (excluding apk files to keep it light)
for item in os.listdir(f"{APPLET_DIR}/dist"):
    if item.endswith(".apk") or item.endswith(".idsig"):
        continue
    s = os.path.join(f"{APPLET_DIR}/dist", item)
    d = os.path.join(f"{BUILD_DIR}/assets/www", item)
    if os.path.isdir(s):
        shutil.copytree(s, d, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d)

# 5. Copy MainActivity.java
shutil.copy2(f"{APPLET_DIR}/android_src/MainActivity.java", f"{BUILD_DIR}/src/dooz/tapcell/MainActivity.java")

print("Step 1: Generating R.java with aapt...")
run(f"aapt package -f -m -J src -M AndroidManifest.xml -S res -I {ANDROID_JAR}", cwd=BUILD_DIR)

print("Step 2: Compiling Java source code with javac...")
run(f"javac -d obj -cp {ANDROID_JAR} -source 1.8 -target 1.8 src/dooz/tapcell/*.java", cwd=BUILD_DIR)

print("Step 3: Translating classes to Dalvik DEX with dalvik-exchange...")
run(f"/usr/bin/dalvik-exchange --dex --output=bin/classes.dex obj", cwd=BUILD_DIR)

print("Step 4: Creating base APK package with assets and resources...")
run(f"aapt package -f -M AndroidManifest.xml -S res -A assets -I {ANDROID_JAR} -F bin/unaligned.apk", cwd=BUILD_DIR)

print("Step 5: Adding classes.dex to unaligned APK...")
run(f"aapt add unaligned.apk classes.dex", cwd=f"{BUILD_DIR}/bin")

print("Step 6: Zipaligning APK...")
run(f"zipalign -v -p 4 bin/unaligned.apk bin/aligned.apk", cwd=BUILD_DIR)

print("Step 7: Generating signing keystore...")
KEYSTORE_PATH = f"{BUILD_DIR}/debug.keystore"
if not os.path.exists(KEYSTORE_PATH):
    run(f'keytool -genkey -v -keystore {KEYSTORE_PATH} -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Dooz,O=Iranian,C=IR"')

OUTPUT_APK = f"{APPLET_DIR}/public/dooz.apk"
print(f"Step 8: Signing APK to {OUTPUT_APK}...")
run(f"apksigner sign --ks {KEYSTORE_PATH} --ks-pass pass:android --key-pass pass:android --out {OUTPUT_APK} bin/aligned.apk", cwd=BUILD_DIR)

print("Step 9: Verifying signed APK...")
verify_output = run(f"apksigner verify -v {OUTPUT_APK}")
print(verify_output)

# Copy to dist/dooz.apk as well
shutil.copy2(OUTPUT_APK, f"{APPLET_DIR}/dist/dooz.apk")

apk_size_mb = os.path.getsize(OUTPUT_APK) / (1024 * 1024)
print(f"\nSUCCESS! Android APK built, signed, and deployed successfully at {OUTPUT_APK} ({apk_size_mb:.2f} MB)")
