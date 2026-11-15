import { AIDifficulty, GameMode, GameRules, GameVariant, DEFAULT_GAME_RULES } from '../game/doozTypes';
import { ThreeDoozState, createInitialThreeDoozState } from '../game/threeDoozLogic';
import { TwelveDoozState, createInitialTwelveDoozState } from '../game/twelveDoozLogic';

/**
 * لایهٔ ذخیره‌سازی نسخه‌دار بازی دوز.
 *
 * همهٔ کلیدهای جدید با پیشوند `dooz:v2:` ذخیره می‌شوند تا با داده‌های نسخه‌های
 * قبلی (کلیدهای monetization) قاطی نشوند. خواندن/نوشتن هرگز خطا پرتاب نمی‌کند؛
 * اگر داده خراب بود، مقدار پیش‌فرض برمی‌گردد و دادهٔ خراب پاک می‌شود.
 */

const PREFIX = 'dooz:v2:';

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  session: `${PREFIX}session`,
  stats: `${PREFIX}stats`,
  ads: `${PREFIX}ads`,
  daily: `${PREFIX}daily`,
  tutorial: `${PREFIX}tutorial`,
  migrated: `${PREFIX}migrated`,
  noAds: `${PREFIX}no_ads`,
} as const;

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // حافظه پر است یا حالت ناشناس؛ بازی باید بدون ذخیره‌سازی هم کار کند
  }
}

export function removeStored(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readString(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// تنظیمات
// ---------------------------------------------------------------------------

export interface AppSettings {
  sound: boolean;
  haptics: boolean;
  variant: GameVariant;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  rules: GameRules;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  haptics: true,
  variant: 'twelve_dooz',
  mode: 'pass_and_play',
  aiDifficulty: 'medium',
  rules: DEFAULT_GAME_RULES,
};

export function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings> | null>(STORAGE_KEYS.settings, null);
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    sound: typeof stored.sound === 'boolean' ? stored.sound : DEFAULT_SETTINGS.sound,
    haptics: typeof stored.haptics === 'boolean' ? stored.haptics : DEFAULT_SETTINGS.haptics,
    variant: stored.variant === 'three_dooz' || stored.variant === 'twelve_dooz'
      ? stored.variant
      : DEFAULT_SETTINGS.variant,
    mode:
      stored.mode === 'pass_and_play' ||
      stored.mode === 'vs_ai' ||
      stored.mode === 'bluetooth' ||
      stored.mode === 'p2p_room'
        ? stored.mode
        : DEFAULT_SETTINGS.mode,
    aiDifficulty:
      stored.aiDifficulty === 'easy' || stored.aiDifficulty === 'medium' || stored.aiDifficulty === 'hard'
        ? stored.aiDifficulty
        : DEFAULT_SETTINGS.aiDifficulty,
    rules: { ...DEFAULT_GAME_RULES, ...(stored.rules ?? {}) },
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

// ---------------------------------------------------------------------------
// دست ذخیره‌شده (ادامهٔ بازی)
// ---------------------------------------------------------------------------

export interface SavedSession {
  version: 2;
  variant: GameVariant;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  three: ThreeDoozState;
  twelve: TwelveDoozState;
  savedAt: number;
}

export function saveSession(session: Omit<SavedSession, 'version' | 'savedAt'>): void {
  writeJson(STORAGE_KEYS.session, {
    version: 2,
    ...session,
    savedAt: Date.now(),
  } satisfies SavedSession);
}

export function loadSession(): SavedSession | null {
  const stored = readJson<Partial<SavedSession> | null>(STORAGE_KEYS.session, null);
  if (!stored || stored.version !== 2) return null;
  if (!stored.three || !stored.twelve) return null;
  const three = stored.three;
  const twelve = stored.twelve;
  if (!Array.isArray(three.board) || three.board.length !== 9) return null;
  if (!Array.isArray(twelve.board) || twelve.board.length !== 24) return null;
  if (!three.turn || !twelve.turn) return null;
  return {
    ...(stored as SavedSession),
    three: { ...createInitialThreeDoozState(), ...three, selectedFromIndex: null },
    twelve: { ...createInitialTwelveDoozState(), ...twelve, selectedFromIndex: null },
  };
}

export function clearSession(): void {
  removeStored(STORAGE_KEYS.session);
}

/** آیا دست نیمه‌کاره‌ای وجود دارد که ارزش «ادامه» داشته باشد؟ */
export function hasResumableSession(): boolean {
  const session = loadSession();
  if (!session) return false;
  const active = session.variant === 'three_dooz' ? session.three : session.twelve;
  if (!active || active.winner) return false;
  return active.moveCount > 0;
}

// ---------------------------------------------------------------------------
// آمار
// ---------------------------------------------------------------------------

export interface VariantStats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  totalMills: number;
  totalCaptures: number;
  fastestWinMoves: number | null;
  totalPlaySeconds: number;
}

export interface StatsState {
  three_dooz: VariantStats;
  twelve_dooz: VariantStats;
  updatedAt: number;
}

const emptyVariantStats = (): VariantStats => ({
  games: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalMills: 0,
  totalCaptures: 0,
  fastestWinMoves: null,
  totalPlaySeconds: 0,
});

export function loadStats(): StatsState {
  const stored = readJson<Partial<StatsState> | null>(STORAGE_KEYS.stats, null);
  return {
    three_dooz: { ...emptyVariantStats(), ...(stored?.three_dooz ?? {}) },
    twelve_dooz: { ...emptyVariantStats(), ...(stored?.twelve_dooz ?? {}) },
    updatedAt: stored?.updatedAt ?? 0,
  };
}

export type GameResult = 'win' | 'loss' | 'draw';

export function recordResult(
  variant: GameVariant,
  result: GameResult,
  moveCount: number,
  extra: { mills?: number; captures?: number } = {}
): StatsState {
  const stats = loadStats();
  const key = variant === 'three_dooz' ? 'three_dooz' : 'twelve_dooz';
  const current = stats[key];

  const next: VariantStats = {
    ...current,
    games: current.games + 1,
    wins: current.wins + (result === 'win' ? 1 : 0),
    losses: current.losses + (result === 'loss' ? 1 : 0),
    draws: current.draws + (result === 'draw' ? 1 : 0),
    currentStreak: result === 'win' ? current.currentStreak + 1 : 0,
    bestStreak: Math.max(current.bestStreak, result === 'win' ? current.currentStreak + 1 : current.currentStreak),
    totalMills: current.totalMills + (extra.mills ?? 0),
    totalCaptures: current.totalCaptures + (extra.captures ?? 0),
    fastestWinMoves:
      result === 'win'
        ? current.fastestWinMoves === null
          ? moveCount
          : Math.min(current.fastestWinMoves, moveCount)
        : current.fastestWinMoves,
  };

  const updated: StatsState = { ...stats, [key]: next, updatedAt: Date.now() };
  writeJson(STORAGE_KEYS.stats, updated);
  return updated;
}

export function resetAllProgress(): void {
  Object.values(STORAGE_KEYS).forEach((key) => removeStored(key));
}

/**
 * پاک‌کردن آمار/تنظیمات/دست ذخیره‌شده، بدون از دست دادن خریدها.
 * سکه‌ها، اسکین‌ها، تم‌ها و «حذف تبلیغات» دست‌نخورده می‌مانند.
 */
export function resetProgressData(): void {
  removeStored(STORAGE_KEYS.session);
  removeStored(STORAGE_KEYS.stats);
  removeStored(STORAGE_KEYS.settings);
  removeStored(STORAGE_KEYS.daily);
  removeStored(STORAGE_KEYS.ads);
  removeStored(STORAGE_KEYS.tutorial);
}
