# پرامپ رفع باگ: اسکین مهره در بازی دوز اعمال نمی‌شود

## زمینه پروژه
یک بازی وب React + TypeScript (ساخته‌شده با Vite) که به‌صورت اپ اندروید هم بسته‌بندی می‌شود.
مسیر ریشه: `C:\Users\Administrator\Documents\GitHub\doozirani`
ساختار مهم:
- `src/App.tsx` — کامپوننت اصلی، وضعیت بازی و مودال‌ها
- `src/components/StonePiece.tsx` — کامپوننت مهره (دکمه گرد)
- `src/components/ThreeDoozBoard.tsx` و `src/components/TwelveDoozBoard.tsx` — تخته‌ها
- `src/utils/monetization.ts` — موتور اقتصادی، اسکین‌ها و تِم‌های تخته

## مشکل گزارش‌شده (بگ)
خرید و «استفاده» از اسکین‌های رنگی در فروشگاه، ظاهر مهره‌های بازی را عوض نمی‌کند.
مهره‌ها همیشه با رنگ پیش‌فرض (کلاسیک) ظاهر می‌شوند:
- بازیکن ۱ → `from-teal-300` (فیروزه‌ای)
- بازیکن ۲ → `from-rose-400` (عقیقی)

حتی وقتی مقدار `localStorage` برای کلید `dooz_active_skin` روی مثلاً `phoenix_blaze` (نارنجی) تنظیم شده باشد،
مهره‌ها همچنان فیروزه‌ای/عقیقی می‌مانند.

## آنچه درست کار می‌کند (برای مقایسه)
- تِم‌های تخته (مثلاً `royal_walnut`) کامل اعمال می‌شوند: پس‌زمینه و رنگ خطوط SVG عوض می‌شود.
- خرید در فروشگاه کار می‌کند: سکه کم می‌شود، آیتم آنلاک می‌شود و در `localStorage` ثبت می‌شود.
- رنگ بازیکن ۱ و ۲ از هم متمایز است (باگ قبلیِ «یکی‌شدن رنگ‌ها» رفع شده).
- `npm run lint` (tsc --noEmit) بدون خطا رد می‌شود.

## ساختار جریان فعلی
1. `App.tsx` اسکین فعال را می‌خواند:
   - `const [activeSkinId, setActiveSkinIdState] = useState<string>(getActiveSkinId);`
   - `const activeSkin = getSkinById(activeSkinId);`
2. `App.tsx` آن را به هر دو تخته پاس می‌دهد:
   - `<TwelveDoozBoard ... skin={activeSkin} theme={activeTheme} ... />`
3. تخته در `StonePiece` پاس می‌دهد:
   - `<StonePiece player={stone} skin={skin} ... />`
4. `StonePiece.tsx`:
   - `const resolvedSkin = skin || getSkinById(getActiveSkinId());`
   - `const pieceClass = isP1 ? resolvedSkin.p1Color : resolvedSkin.p2Color;`

## کاری که قبلاً انجام شده ولی مشکل را حل نکرده
- رفع معکوس‌بودن شرطی در StonePiece (که باعث «یکی‌شدن رنگ‌ها» می‌شد).
- اضافه‌کردن prop «بskin» به هر دو تخته و پاس‌دادن به StonePiece.
- تغییر fallback در StonePiece از `getSkinById('classic_persian')` به `getSkinById(getActiveSkinId())`
  تا حتی اگر prop نرسد، خودش اسکین فعال را بخواند.
- ری‌استارت تمیز سرور توسعه (Vite) برای ازبین‌بردن HMR کهنه.

با وجود این‌ها، در مرورگر هنوز مهره‌ها کلاسیک دیده می‌شوند.

## از تو خواسته می‌شود
1. ریشه مشکل را دقیق پیدا کن: چرا `resolvedSkin` در `StonePiece` به شیء کلاسیک (فیروزه‌ای/عقیقی)
   می‌رسد یا از `getActiveSkinId()` مقدار اشتباه برمی‌گردد.
2. موارد زیر را بررسی کن:
   - آیا `getActiveSkinId()` در `monetization.ts` درست پیاده شده و کلید
     `ACTIVE_SKIN_KEY` با کلیدی که فروشگاه می‌نویسد یکی است؟
     (فروشگاه از `setActiveSkinId` استفاده می‌کند)
   - آیا مقدار `activeSkinId` در `App.tsx` بعد از بسته‌شدن فروشگاه به‌روز می‌شود
     (useEffect روی `isShopOpen`)?
   - آیا کامپوننت `StonePiece` واقعاً prop `skin` را دریافت می‌کند
     (می‌توانی با خواندن `memoizedProps` از فایبر React چک کنی).
   - آیا در مسیر رندر، جای دیگری `StonePiece` بدون prop `skin` رندر می‌شود؟
3. باگ را درست کن طوری که:
   - انتخاب اسکین فعال، رنگ مهره‌های هر دو تخته (۳ تایی و ۱۲ تایی) را عوض کند.
   - اگر `skin` prop نرسید، `getActiveSkinId()` مقدار درست بدهد.
   - هیچ هاردکد (فیروزه‌ای/عقیقی) در StonePiece باقی نماند.
4. بعد از اصلاح، در `npm run lint` بدون خطا بگذرد و در مرورگر (localhost:3000)
   با تنظیم `localStorage:dooz_active_skin` روی `phoenix_blaze` تأیید کن که
   مهره بازیکن ۱ `from-orange-300` می‌شود.

## فایل‌های درگیر
- `src/components/StonePiece.tsx`
- `src/utils/monetization.ts`
- `src/App.tsx`
- `src/components/ThreeDoozBoard.tsx`
- `src/components/TwelveDoozBoard.tsx`
