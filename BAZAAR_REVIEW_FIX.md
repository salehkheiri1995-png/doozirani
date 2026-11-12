# رفع ایرادهای بازبینی کافه‌بازار (نسخه ۱۵)

این فایل خلاصهٔ کارهایی است که برای پاسخ به ایمیل بازبینی بازار انجام شده و
کارهایی که باید در «پیشخان» انجام شود.

## ۱) مجوز موقعیت مکانی

`android.permission.ACCESS_FINE_LOCATION` (و `ACCESS_COARSE_LOCATION`) به‌طور
کامل از `android/app/src/main/AndroidManifest.xml` حذف شد.

برای اینکه کتابخانهٔ تبلیغاتی (Tapsell) هم نتواند آن را دوباره در مانیفست
ادغام‌شده برگرداند، از `tools:node="remove"` استفاده شده است:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    tools:node="remove" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"
    tools:node="remove" />
```

هیچ‌جای کد (Java، Kotlin، WebView یا جاوااسکریپت) از GPS یا
`navigator.geolocation` استفاده نمی‌کند. بلوتوث برنامه فقط با گوشی‌های
«از قبل جفت‌شده» کار می‌کند (`getBondedDevices` و RFCOMM) و اسکن/Discovery
انجام نمی‌دهد؛ بنابراین مجوز موقعیت برای آن لازم نیست. `BLUETOOTH_SCAN` هم با
`android:usesPermissionFlags="neverForLocation"` اعلام شده است.

## ۲) یکسان‌سازی نام

| محل | مقدار |
|---|---|
| نام روی گوشی (فارسی) | `دوز اصیل ایرانی` |
| نام روی گوشی (انگلیسی) | `Dooz Asil Iranian` |
| نام فارسی در پیشخان | `دوز اصیل ایرانی` |
| نام انگلیسی در پیشخان | `Dooz Asil Iranian` |

- نام فارسی همان `android/app/src/main/res/values/strings.xml` است.
- نام انگلیسی در `android/app/src/main/res/values-en/strings.xml` اضافه شد تا
  روی گوشی‌های با زبان انگلیسی هم دقیقاً همان چیزی دیده شود که در فیلد
  «نام انگلیسی» پیشخان وارد می‌شود.

> **مهم:** اگر در پیشخان نام طولانی
> «بازی دوز اصیل ایرانی (بلوتوث و آفلاین)» ثبت شده، آن را به
> «دوز اصیل ایرانی» تغییر بده. نام طولانی روی آیکون گوشی بریده می‌شود و
> همین باعث عدم تطابق می‌شود. توضیح بلوتوث و آفلاین باید در «توضیحات» برنامه
> باشد، نه در نام.

## ۳) یکسان‌سازی آیکون

آیکون قبلی در پیشخان و آیکون لانچر، هر دو اسکرین‌شات صفحهٔ اصلی بازی بودند
(متن‌دار و در اندازهٔ ۴۸dp ناخوانا). اکنون یک آیکون واقعی از روی
`public/icon.svg` ساخته شده است:

- آیکون حداکثر ۵۱۲×۵۱۲ برای آپلود در پیشخان:
  `public/bazaar-icon-512.png`
- همان طرح در `public/bazaar_assets.zip` هم به‌روزرسانی شد
  (فایل `icon-512.png` داخل آرشیو).
- آیکون‌های لانچر: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- آیکون تطبیقی اندروید ۸+:
  `mipmap-anydpi-v26/ic_launcher.xml` + `drawable/ic_launcher_background.xml`
  + `mipmap-*/ic_launcher_foreground.png`

طرح آیکون در همهٔ حالت‌ها یکی است: زمینهٔ چوبی تیره + صفحهٔ لوزی طلایی دوز.
برای بازتولید آیکون‌ها:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generate-icons.ps1
```

## ۴) نسخه

- `versionCode` از `14` به `15` افزایش یافت.
- `versionName` از `1.5.7` به `1.5.8` تغییر کرد.

طبق `AGENTS.md`، قبل از آپلود باید بیلد و امضا با کلید ثابت
`android/keystore/dooz-release.jks` انجام شود و SHA-1 خروجی
`BE:09:01:79:7A:E7:B0:52:1B:C1:49:AE:34:F5:F2:D8:A5:B0:0E:BB` باشد.

## ۵) متن آمادهٔ پاسخ به بازار

> سلام و احترام،
>
> در خصوص موارد اعلام‌شده در بازبینی نسخهٔ ۱۴:
>
> **۱) دسترسی موقعیت مکانی:** مجوز `ACCESS_FINE_LOCATION` به‌طور کامل از
> مانیفست برنامه حذف شد. این برنامه هیچ‌گونه سرویس موقعیت مکانی (GPS یا
> شبکه) را فراخوانی نمی‌کند و بلوتوث آن فقط برای اتصال به گوشی‌های از قبل
> جفت‌شده استفاده می‌شود؛ بنابراین نیازی به این دسترسی وجود ندارد.
>
> **۲) نام و آیکون:** نام فارسی برنامه روی گوشی «دوز اصیل ایرانی» و نام
> انگلیسی آن «Dooz Asil Iranian» است و آیکون لانچر برنامه نیز با آیکون
> بارگذاری‌شده در پیشخان کاملاً یکسان شد. نام طولانی قبلی که شامل
> «(بلوتوث و آفلاین)» بود حذف شد تا با نام نمایش‌داده‌شده پس از نصب یکسان
> باشد.
>
> نسخهٔ جدید با `versionCode = 15` و `versionName = 1.5.8` آمادهٔ بارگذاری
> است.
>
> با تشکر

## ۶) وضعیت بیلد نهایی (تأییدشده)

| مورد | مقدار |
|---|---|
| فایل | `dooz-release.apk` (ریشهٔ پروژه) |
| حجم | ۵٬۹۹۳٬۹۰۷ بایت |
| SHA-256 فایل | `2767AFE46920EE873183B0002AA3199D08CB65019A577A2AF32F0A1609C5F59B` |
| package | `doozz.tapcell` |
| versionCode / versionName | `15` / `1.5.8` |
| امضا | `OK - signed with the Dooz release key` |
| مجوز موقعیت در APK نهایی | حذف شده (بررسی با `aapt2 dump badging`) |
| نام فارسی / انگلیسی روی گوشی | `دوز اصیل ایرانی` / `Dooz Asil Iranian` |
| آیکون | هر ۵ چگالی + آیکون تطبیقی `anydpi-v26` داخل APK |

## ۷) چک‌لیست قبل از ارسال

1. در پیشخان، نام فارسی/انگلیسی را مطابق جدول بالا اصلاح کن.
2. آیکون `public/bazaar-icon-512.png` را در پیشخان آپلود کن.
3. APK محلی و امضاشده را بساز (نه با AI Studio):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\release.ps1
   ```
4. قبل از آپلود، خروجی `scripts\verify-apk-signature.ps1` باید `OK` باشد.
