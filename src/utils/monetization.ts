// Monetization and economy engine for Dooz mobile game
// Supports Rewarded Video Ads, Interstitial Ads, Coins, Daily Bonus, Win Streaks, and Cosmetic Unlockables

export interface CosmeticSkin {
  id: string;
  name: string;
  category: 'classic' | 'royal' | 'legendary' | 'mythic';
  p1Color: string;
  p2Color: string;
  cost: number;
  isUnlocked: boolean;
  previewClass: string;
}

// Skin categories for shop filtering
export const SKIN_CATEGORIES: { id: CosmeticSkin['category']; label: string }[] = [
  { id: 'classic', label: 'کلاسیک' },
  { id: 'royal', label: 'سلطنتی' },
  { id: 'legendary', label: 'افسانه‌ای' },
  { id: 'mythic', label: 'اساطیری' },
];

export const INITIAL_SKINS: CosmeticSkin[] = [
  {
    id: 'classic_persian',
    name: 'فیروزه نیشابور و عقیق یمن',
    category: 'classic',
    p1Color: 'bg-gradient-to-br from-teal-300 via-emerald-600 to-cyan-900 border-emerald-300',
    p2Color: 'bg-gradient-to-br from-rose-400 via-red-600 to-amber-950 border-amber-300',
    cost: 0,
    isUnlocked: true,
    previewClass: 'from-teal-400 to-rose-500',
  },
  {
    id: 'royal_gold',
    name: 'طلای سلطنتی و لاجورد باستان',
    category: 'royal',
    p1Color: 'bg-gradient-to-br from-amber-200 via-amber-500 to-yellow-800 border-amber-200',
    p2Color: 'bg-gradient-to-br from-blue-300 via-indigo-600 to-blue-950 border-blue-300',
    cost: 150,
    isUnlocked: false,
    previewClass: 'from-amber-400 to-indigo-600',
  },
  {
    id: 'emerald_ruby',
    name: 'زمرد شاهانه و یاقوت اناری',
    category: 'royal',
    p1Color: 'bg-gradient-to-br from-emerald-300 via-green-600 to-emerald-950 border-green-300',
    p2Color: 'bg-gradient-to-br from-fuchsia-400 via-purple-600 to-purple-950 border-fuchsia-300',
    cost: 300,
    isUnlocked: false,
    previewClass: 'from-emerald-400 to-purple-600',
  },
  {
    id: 'midnight_fire',
    name: 'نیمه‌شب و آتش سرخ',
    category: 'royal',
    p1Color: 'bg-gradient-to-br from-indigo-400 via-blue-700 to-slate-950 border-indigo-300',
    p2Color: 'bg-gradient-to-br from-orange-400 via-red-600 to-red-950 border-orange-300',
    cost: 220,
    isUnlocked: false,
    previewClass: 'from-indigo-500 to-orange-500',
  },
  {
    id: 'ocean_abyss',
    name: 'اقیانوس و ژرفای دریا',
    category: 'royal',
    p1Color: 'bg-gradient-to-br from-cyan-300 via-sky-600 to-blue-950 border-cyan-300',
    p2Color: 'bg-gradient-to-br from-slate-300 via-slate-500 to-slate-900 border-slate-300',
    cost: 350,
    isUnlocked: false,
    previewClass: 'from-cyan-400 to-slate-600',
  },
  {
    id: 'sunset_rose',
    name: 'غروب سرخ و گل رز',
    category: 'royal',
    p1Color: 'bg-gradient-to-br from-rose-300 via-pink-600 to-pink-950 border-rose-300',
    p2Color: 'bg-gradient-to-br from-violet-300 via-purple-600 to-purple-950 border-violet-300',
    cost: 280,
    isUnlocked: false,
    previewClass: 'from-rose-400 to-violet-500',
  },
  {
    id: 'jade_silver',
    name: 'یشم سبز و نقره سرد',
    category: 'legendary',
    p1Color: 'bg-gradient-to-br from-lime-300 via-green-500 to-emerald-950 border-lime-300',
    p2Color: 'bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 border-zinc-200',
    cost: 450,
    isUnlocked: false,
    previewClass: 'from-lime-400 to-zinc-400',
  },
  {
    id: 'royal_violet',
    name: 'بنفش شاهی و طلای خالص',
    category: 'legendary',
    p1Color: 'bg-gradient-to-br from-purple-300 via-purple-600 to-purple-950 border-purple-300',
    p2Color: 'bg-gradient-to-br from-yellow-200 via-amber-500 to-amber-800 border-yellow-200',
    cost: 500,
    isUnlocked: false,
    previewClass: 'from-purple-500 to-amber-400',
  },
  {
    id: 'phoenix_blaze',
    name: 'ققنوس و زبانه‌های آتش',
    category: 'legendary',
    p1Color: 'bg-gradient-to-br from-orange-300 via-orange-600 to-red-950 border-orange-300',
    p2Color: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-600 to-fuchsia-950 border-fuchsia-300',
    cost: 650,
    isUnlocked: false,
    previewClass: 'from-orange-500 to-fuchsia-500',
  },
  {
    id: 'glacier_aurora',
    name: 'یخچال و شفق قطبی',
    category: 'legendary',
    p1Color: 'bg-gradient-to-br from-blue-200 via-cyan-400 to-blue-900 border-blue-200',
    p2Color: 'bg-gradient-to-br from-emerald-300 via-teal-500 to-teal-900 border-emerald-300',
    cost: 550,
    isUnlocked: false,
    previewClass: 'from-blue-300 to-teal-500',
  },
  {
    id: 'obsidian_gold',
    name: 'ابسیدین سیاه و طلای ناب',
    category: 'mythic',
    p1Color: 'bg-gradient-to-br from-zinc-500 via-zinc-800 to-black border-zinc-400',
    p2Color: 'bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 border-yellow-200',
    cost: 800,
    isUnlocked: false,
    previewClass: 'from-zinc-600 to-yellow-400',
  },
  {
    id: 'crown_of_kyan',
    name: 'تاج کیانی (مخصوص قهرمان‌ها)',
    category: 'mythic',
    p1Color: 'bg-gradient-to-br from-teal-200 via-cyan-500 to-cyan-900 border-teal-200',
    p2Color: 'bg-gradient-to-br from-rose-200 via-rose-500 to-rose-900 border-rose-200',
    cost: 1000,
    isUnlocked: false,
    previewClass: 'from-teal-300 to-rose-400',
  },
];

const COINS_KEY = 'dooz_player_coins';
const SKINS_KEY = 'dooz_unlocked_skins';
const ACTIVE_SKIN_KEY = 'dooz_active_skin';
const WIN_STREAK_KEY = 'dooz_win_streak';

/** سکهٔ شروع برای نصب تازه (یک مقدار واحد در همهٔ مسیرها) */
export const STARTER_COINS = 150;

export function getPlayerCoins(): number {
  if (typeof window === 'undefined') return STARTER_COINS;
  const saved = localStorage.getItem(COINS_KEY);
  if (saved !== null) {
    const num = parseInt(saved, 10);
    if (!isNaN(num)) return Math.max(0, num);
  }
  return STARTER_COINS;
}

export function savePlayerCoins(coins: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COINS_KEY, coins.toString());
  }
}

export function addPlayerCoins(amount: number): number {
  const current = getPlayerCoins();
  const next = Math.max(0, current + amount);
  savePlayerCoins(next);
  return next;
}

export function getSkinById(id: string): CosmeticSkin {
  return INITIAL_SKINS.find((s) => s.id === id) || INITIAL_SKINS[0];
}

export function getUnlockedSkinIds(): string[] {
  if (typeof window === 'undefined') return ['classic_persian'];
  try {
    const saved = localStorage.getItem(SKINS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['classic_persian'];
}

export function unlockSkin(skinId: string): boolean {
  const skins = getUnlockedSkinIds();
  if (!skins.includes(skinId)) {
    skins.push(skinId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SKINS_KEY, JSON.stringify(skins));
    }
    return true;
  }
  return false;
}

export function getActiveSkinId(): string {
  if (typeof window === 'undefined') return 'classic_persian';
  const saved = localStorage.getItem(ACTIVE_SKIN_KEY);
  return saved && INITIAL_SKINS.some((s) => s.id === saved) ? saved : 'classic_persian';
}

export function setActiveSkinId(skinId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_SKIN_KEY, skinId);
  }
}

// ---- Daily login bonus: چرخهٔ ۷ روزه با پاداش پله‌ای ----

import { readJson, writeJson, STORAGE_KEYS } from './storage';

export const DAILY_REWARDS = [50, 60, 70, 80, 100, 120, 150];

interface DailyState {
  /** آخرین روزی که جایزه گرفته شده (YYYY-MM-DD محلی) */
  lastClaimDay: string;
  /** شمارهٔ روز در چرخهٔ ۷ روزه (۱ تا ۷) */
  streak: number;
  /** آخرین زمانی که برنامه باز شده — برای تشخیص عقب‌بردن ساعت */
  lastSeenAt: number;
}

function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function getDailyState(): DailyState {
  return readJson<DailyState>(STORAGE_KEYS.daily, {
    lastClaimDay: '',
    streak: 0,
    lastSeenAt: 0,
  });
}

export function getDailyStreak(): number {
  return getDailyState().streak;
}

/** روز بعدی چرخه و پاداشش */
export function getNextDailyReward(): { day: number; amount: number } {
  const state = getDailyState();
  const claimedToday = state.lastClaimDay === dayKey();
  const nextDay = claimedToday ? state.streak : (state.streak % DAILY_REWARDS.length) + 1;
  return { day: nextDay, amount: DAILY_REWARDS[nextDay - 1] };
}

export function isDailyBonusAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const state = getDailyState();
  const today = dayKey();

  // اگر ساعت دستگاه عقب برده شده باشد، جایزه نمی‌دهیم و تاریخ را جلو نمی‌بریم
  if (state.lastSeenAt > Date.now() + 60_000) return false;

  if (state.lastSeenAt !== 0 && state.lastSeenAt < Date.now()) {
    writeJson(STORAGE_KEYS.daily, { ...state, lastSeenAt: Date.now() });
  }

  return state.lastClaimDay !== today;
}

export function claimDailyBonus(): { granted: number; available: boolean; day: number } {
  if (!isDailyBonusAvailable()) {
    const { day } = getNextDailyReward();
    return { granted: 0, available: false, day };
  }

  const state = getDailyState();
  const today = dayKey();
  // اگر دیروز گرفته، زنجیره ادامه می‌یابد؛ وگرنه از روز ۱ شروع می‌شود
  const continues = state.lastClaimDay === yesterdayKey();
  const day = continues ? (state.streak % DAILY_REWARDS.length) + 1 : 1;
  const granted = DAILY_REWARDS[day - 1];

  writeJson(STORAGE_KEYS.daily, {
    lastClaimDay: today,
    streak: day,
    lastSeenAt: Date.now(),
  });

  addPlayerCoins(granted);
  return { granted, available: true, day };
}

// ---- سیاست تبلیغات: سقف روزانه، فاصلهٔ زمانی و میان‌صفحه‌ای سالم ----

export const REWARDED_AMOUNT = 100;
export const REWARDED_DAILY_LIMIT = 8;
export const REWARDED_DEMO_DAILY_LIMIT = 3;
export const REWARDED_COOLDOWN_MS = 60_000;
export const INTERSTITIAL_MIN_GAMES = 3;
export const INTERSTITIAL_COOLDOWN_MS = 120_000;
export const INTERSTITIAL_SESSION_GRACE_MS = 180_000;
export const NO_ADS_COST = 1500;

export interface AdPolicyState {
  day: string;
  rewardedCount: number;
  demoCount: number;
  lastRewardedAt: number;
  interstitialCount: number;
  lastInterstitialAt: number;
  gamesFinished: number;
  sessionStartedAt: number;
}

const defaultAdState = (): AdPolicyState => ({
  day: dayKey(),
  rewardedCount: 0,
  demoCount: 0,
  lastRewardedAt: 0,
  interstitialCount: 0,
  lastInterstitialAt: 0,
  gamesFinished: 0,
  sessionStartedAt: Date.now(),
});

export function getAdPolicy(): AdPolicyState {
  const stored = readJson<Partial<AdPolicyState> | null>(STORAGE_KEYS.ads, null);
  const base = defaultAdState();
  if (!stored) return base;
  // شروع روز جدید: شمارنده‌ها صفر می‌شوند ولی زمان‌ها برای فاصله‌گذاری می‌مانند
  if (stored.day !== base.day) {
    return {
      ...base,
      ...stored,
      day: base.day,
      rewardedCount: 0,
      demoCount: 0,
      interstitialCount: 0,
    };
  }
  return { ...base, ...stored };
}

function saveAdPolicy(state: AdPolicyState): void {
  writeJson(STORAGE_KEYS.ads, state);
}

export function rewardedAdsLeft(isDemo: boolean): number {
  const state = getAdPolicy();
  const limit = isDemo ? REWARDED_DEMO_DAILY_LIMIT : REWARDED_DAILY_LIMIT;
  const used = isDemo ? state.demoCount : state.rewardedCount;
  return Math.max(0, limit - used);
}

export function rewardedCooldownLeftMs(): number {
  const state = getAdPolicy();
  if (!state.lastRewardedAt) return 0;
  return Math.max(0, state.lastRewardedAt + REWARDED_COOLDOWN_MS - Date.now());
}

export function canWatchRewarded(isDemo: boolean): { allowed: boolean; reason?: string; left: number; cooldownMs: number } {
  const left = rewardedAdsLeft(isDemo);
  const cooldownMs = rewardedCooldownLeftMs();
  if (left <= 0) {
    return {
      allowed: false,
      reason: isDemo
        ? 'در نسخهٔ پیش‌نمایش فقط ۳ تبلیغ در روز مجاز است. فردا دوباره امتحان کنید.'
        : 'سقف تبلیغ امروز تمام شد. فردا دوباره امتحان کنید.',
      left,
      cooldownMs,
    };
  }
  if (cooldownMs > 0) {
    return {
      allowed: false,
      reason: `برای تبلیغ بعدی ${Math.ceil(cooldownMs / 1000)} ثانیه صبر کنید.`,
      left,
      cooldownMs,
    };
  }
  return { allowed: true, left, cooldownMs };
}

export function registerRewarded(isDemo: boolean): void {
  const state = getAdPolicy();
  saveAdPolicy({
    ...state,
    rewardedCount: isDemo ? state.rewardedCount : state.rewardedCount + 1,
    demoCount: isDemo ? state.demoCount + 1 : state.demoCount,
    lastRewardedAt: Date.now(),
  });
}

export function registerGameFinished(): AdPolicyState {
  const state = getAdPolicy();
  const next: AdPolicyState = { ...state, gamesFinished: state.gamesFinished + 1 };
  saveAdPolicy(next);
  return next;
}

export function canShowInterstitial(hasZone: boolean, noAds: boolean): boolean {
  if (!hasZone || noAds) return false;
  const state = getAdPolicy();
  const sessionAge = Date.now() - state.sessionStartedAt;
  if (sessionAge < INTERSTITIAL_SESSION_GRACE_MS) return false;
  if (state.gamesFinished < INTERSTITIAL_MIN_GAMES) return false;
  if (state.interstitialCount > 0 && Date.now() - state.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) {
    return false;
  }
  return true;
}

export function registerInterstitial(): void {
  const state = getAdPolicy();
  saveAdPolicy({
    ...state,
    interstitialCount: state.interstitialCount + 1,
    lastInterstitialAt: Date.now(),
    gamesFinished: 0,
  });
}

// ---- حذف تبلیغات (خرید با سکه) ----

export function hasNoAds(): boolean {
  return readJson<boolean>(STORAGE_KEYS.noAds, false) === true;
}

export function buyNoAds(): boolean {
  if (hasNoAds()) return false;
  const coins = getPlayerCoins();
  if (coins < NO_ADS_COST) return false;
  savePlayerCoins(coins - NO_ADS_COST);
  writeJson(STORAGE_KEYS.noAds, true);
  return true;
}


// ---- Win streak tracking ----

export function recordWinStreak(notch: boolean): number {
  const current = typeof window !== 'undefined' ? parseInt(localStorage.getItem(WIN_STREAK_KEY) || '0', 10) : 0;
  const next = notch ? current + 1 : 0;
  if (typeof window !== 'undefined') {
    localStorage.setItem(WIN_STREAK_KEY, next.toString());
  }
  return next;
}

export function getWinStreak(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(WIN_STREAK_KEY) || '0', 10);
}

// ---- Board themes (purchasable board skins) ----

export interface BoardTheme {
  id: string;
  name: string;
  category: 'royal' | 'legendary' | 'mythic';
  cost: number;
  isUnlocked: boolean;
  previewClass: string;
  boardClass: string; // replaces `persian-wood` on the tray (empty = keep default wood)
  lineColor: string;  // SVG grid line color
  lineOpacity: number;
}

export const INITIAL_BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic_wood',
    name: 'چوب گردوی کلاسیک',
    category: 'royal',
    boardClass: '',
    lineColor: '#a67c52',
    lineOpacity: 0.85,
    cost: 0,
    isUnlocked: true,
    previewClass: 'from-[#6b4a2b] to-[#2a1d10]',
  },
  {
    id: 'royal_walnut',
    name: 'چوب گردوی سلطنتی',
    category: 'royal',
    boardClass: 'bg-gradient-to-br from-[#3b2417] via-[#241610] to-[#120b06]',
    lineColor: '#d9a066',
    lineOpacity: 0.9,
    cost: 200,
    isUnlocked: false,
    previewClass: 'from-[#6b3f23] to-[#1a0f08]',
  },
  {
    id: 'emerald_marble',
    name: 'سنگ مرمر زمردی',
    category: 'royal',
    boardClass: 'bg-gradient-to-br from-[#06251f] via-[#0b3b30] to-[#0a1f18]',
    lineColor: '#34d399',
    lineOpacity: 0.85,
    cost: 320,
    isUnlocked: false,
    previewClass: 'from-[#0e5c48] to-[#041f18]',
  },
  {
    id: 'obsidian_dark',
    name: 'ابسیدین شب',
    category: 'legendary',
    boardClass: 'bg-gradient-to-br from-[#1a1a24] via-[#0d0d14] to-black',
    lineColor: '#8b8bb0',
    lineOpacity: 0.9,
    cost: 420,
    isUnlocked: false,
    previewClass: 'from-[#33334a] to-black',
  },
  {
    id: 'golden_sand',
    name: 'گنج شن‌های طلایی',
    category: 'legendary',
    boardClass: 'bg-gradient-to-br from-[#3a2c12] via-[#5c471c] to-[#2a1f0c]',
    lineColor: '#fbbf24',
    lineOpacity: 0.9,
    cost: 520,
    isUnlocked: false,
    previewClass: 'from-[#7a5c20] to-[#2a1f0c]',
  },
  {
    id: 'mythic_glow',
    name: 'شب اساطیری درخشان',
    category: 'mythic',
    boardClass: 'bg-gradient-to-br from-[#2a0f3f] via-[#17081f] to-[#0b0512]',
    lineColor: '#e879f9',
    lineOpacity: 0.95,
    cost: 820,
    isUnlocked: false,
    previewClass: 'from-[#4a1a6e] to-[#12061c]',
  },
];

const BOARD_THEMES_KEY = 'dooz_unlocked_board_themes';
const ACTIVE_BOARD_THEME_KEY = 'dooz_active_board_theme';

export function getBoardThemeById(id: string): BoardTheme {
  return INITIAL_BOARD_THEMES.find((t) => t.id === id) || INITIAL_BOARD_THEMES[0];
}

export function getUnlockedBoardThemeIds(): string[] {
  if (typeof window === 'undefined') return ['classic_wood'];
  try {
    const saved = localStorage.getItem(BOARD_THEMES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['classic_wood'];
}

export function unlockBoardTheme(themeId: string): boolean {
  const themes = getUnlockedBoardThemeIds();
  if (!themes.includes(themeId)) {
    themes.push(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOARD_THEMES_KEY, JSON.stringify(themes));
    }
    return true;
  }
  return false;
}

export function getActiveBoardThemeId(): string {
  if (typeof window === 'undefined') return 'classic_wood';
  const saved = localStorage.getItem(ACTIVE_BOARD_THEME_KEY);
  return saved && INITIAL_BOARD_THEMES.some((t) => t.id === saved) ? saved : 'classic_wood';
}

export function setActiveBoardThemeId(themeId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_BOARD_THEME_KEY, themeId);
  }
}
