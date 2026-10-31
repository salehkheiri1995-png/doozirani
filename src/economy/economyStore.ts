import {
  BOARD_THEMES,
  DEFAULT_BOARD_THEME_ID,
  DEFAULT_PROFILE_FRAME_ID,
  DEFAULT_STONE_SKIN_ID,
  getItemById,
  type CosmeticItem,
} from './catalog';

export const ECONOMY_STORAGE_KEY = 'dooz.economy.v2';
export const ECONOMY_SCHEMA_VERSION = 2 as const;

export const AD_REWARD_COINS = 50;
export const AD_DAILY_CAP = 5;
export const AD_COOLDOWN_MS = 90_000;

export const MATCH_REWARD_THREE = 20;
export const MATCH_REWARD_TWELVE = 30;
export const MATCH_REWARD_DAILY_CAP = 10;
export const STARTER_COINS = 100;

export type LedgerReason =
  | 'purchase'
  | 'ad_reward'
  | 'match_reward'
  | 'starter'
  | 'legacy_migration'
  | 'admin_reset';

export interface LedgerEntry {
  id: string;
  reason: LedgerReason;
  amount: number;
  sourceId: string;
  createdAt: number;
  balanceAfter: number;
}

export interface EquippedItems {
  stone_skin: string;
  board_theme: string;
  profile_frame: string;
}

export interface EconomyState {
  schemaVersion: typeof ECONOMY_SCHEMA_VERSION;
  coins: number;
  ownedItemIds: string[];
  equipped: EquippedItems;
  ledger: LedgerEntry[];
  daily: {
    dayKey: string;
    adCount: number;
    matchRewardCount: number;
    lastAdClaimAt: number | null;
  };
}

export type EconomyErrorCode =
  | 'not_found'
  | 'not_available'
  | 'already_owned'
  | 'insufficient_coins'
  | 'not_owned'
  | 'wrong_type'
  | 'daily_cap'
  | 'cooldown'
  | 'invalid_amount'
  | 'duplicate';

export type EconomyResult =
  | { ok: true; state: EconomyState; duplicate?: boolean; item?: CosmeticItem }
  | { ok: false; code: EconomyErrorCode; messageFa: string };

function nowId(prefix: string): string {
  const api = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (api && typeof api.randomUUID === 'function') return `${prefix}-${api.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dayKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDefaultEconomy(timestamp = Date.now()): EconomyState {
  return {
    schemaVersion: ECONOMY_SCHEMA_VERSION,
    coins: STARTER_COINS,
    ownedItemIds: [
      DEFAULT_STONE_SKIN_ID,
      DEFAULT_BOARD_THEME_ID,
      DEFAULT_PROFILE_FRAME_ID,
    ],
    equipped: {
      stone_skin: DEFAULT_STONE_SKIN_ID,
      board_theme: DEFAULT_BOARD_THEME_ID,
      profile_frame: DEFAULT_PROFILE_FRAME_ID,
    },
    ledger: [
      {
        id: nowId('starter'),
        reason: 'starter',
        amount: STARTER_COINS,
        sourceId: 'starter',
        createdAt: timestamp,
        balanceAfter: STARTER_COINS,
      },
    ],
    daily: {
      dayKey: dayKey(timestamp),
      adCount: 0,
      matchRewardCount: 0,
      lastAdClaimAt: null,
    },
  };
}

function clampCoins(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return STARTER_COINS;
  return Math.max(0, Math.min(1_000_000_000, Math.floor(value)));
}

function uniqueKnownIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const known = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && getItemById(id)) known.add(id);
  }
  return [...known];
}

function normalizeEquipped(
  value: unknown,
  owned: string[]
): EquippedItems {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<EquippedItems>;
  const pick = (type: 'stone_skin' | 'board_theme' | 'profile_frame', fallback: string) => {
    const candidate = raw[type];
    const item = typeof candidate === 'string' ? getItemById(candidate) : undefined;
    return item && item.type === type && owned.includes(item.id) ? item.id : fallback;
  };
  return {
    stone_skin: pick('stone_skin', DEFAULT_STONE_SKIN_ID),
    board_theme: pick('board_theme', DEFAULT_BOARD_THEME_ID),
    profile_frame: pick('profile_frame', DEFAULT_PROFILE_FRAME_ID),
  };
}

function normalizeLedger(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: LedgerEntry[] = [];
  for (const raw of value.slice(-200)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<LedgerEntry>;
    if (typeof entry.id !== 'string') continue;
    if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount)) continue;
    if (typeof entry.balanceAfter !== 'number') continue;
    if (typeof entry.reason !== 'string') continue;
    if (typeof entry.sourceId !== 'string') continue;
    if (typeof entry.createdAt !== 'number') continue;
    entries.push({
      id: entry.id,
      reason: entry.reason as LedgerReason,
      amount: Math.floor(entry.amount),
      sourceId: entry.sourceId,
      createdAt: entry.createdAt,
      balanceAfter: Math.max(0, Math.floor(entry.balanceAfter)),
    });
  }
  return entries;
}

/** Validates a persisted blob. Unknown items are dropped, never trusted blindly. */
export function normalizeEconomy(raw: unknown, timestamp = Date.now()): EconomyState {
  if (!raw || typeof raw !== 'object') return createDefaultEconomy(timestamp);
  const value = raw as Partial<EconomyState>;
  const fallback = createDefaultEconomy(timestamp);
  const ownedItemIds = uniqueKnownIds(value.ownedItemIds);
  for (const required of [DEFAULT_STONE_SKIN_ID, DEFAULT_BOARD_THEME_ID, DEFAULT_PROFILE_FRAME_ID]) {
    if (!ownedItemIds.includes(required)) ownedItemIds.push(required);
  }
  const dailyRaw = (value.daily && typeof value.daily === 'object' ? value.daily : {}) as Partial<EconomyState['daily']>;
  const legacyDay = typeof dailyRaw.dayKey === 'string' ? dailyRaw.dayKey : fallback.daily.dayKey;
  return {
    schemaVersion: ECONOMY_SCHEMA_VERSION,
    coins: clampCoins(value.coins),
    ownedItemIds,
    equipped: normalizeEquipped(value.equipped, ownedItemIds),
    ledger: normalizeLedger(value.ledger),
    daily: {
      dayKey: legacyDay,
      adCount: Number.isInteger(dailyRaw.adCount) ? Math.max(0, Math.min(1000, dailyRaw.adCount!)) : 0,
      matchRewardCount: Number.isInteger(dailyRaw.matchRewardCount)
        ? Math.max(0, Math.min(1000, dailyRaw.matchRewardCount!))
        : 0,
      lastAdClaimAt:
        typeof dailyRaw.lastAdClaimAt === 'number' && dailyRaw.lastAdClaimAt > 0
          ? dailyRaw.lastAdClaimAt
          : null,
    },
  };
}

const LEGACY_COINS_CAP = 1000;
const LEGACY_SKIN_MAP: Record<string, string> = {
  classic_persian: 'skin_classic',
  royal_gold: 'skin_turquoise',
  emerald_ruby: 'skin_copper',
};

/**
 * One-time migration from the old local keys.
 *
 * Old localStorage balances are forgeable, so the value is capped and this is
 * explicitly a local-only grant. Real purchases are never restored from here.
 */
export function migrateLegacyEconomy(
  legacyCoins: number | null,
  legacySkinIds: string[] | null,
  legacyActiveSkin: string | null,
  timestamp = Date.now()
): EconomyState {
  const state = createDefaultEconomy(timestamp);
  const coins = typeof legacyCoins === 'number' && Number.isFinite(legacyCoins)
    ? Math.max(0, Math.min(LEGACY_COINS_CAP, Math.floor(legacyCoins)))
    : null;
  if (coins !== null && coins > STARTER_COINS) {
    const delta = coins - STARTER_COINS;
    state.coins = coins;
    state.ledger.push({
      id: nowId('legacy'),
      reason: 'legacy_migration',
      amount: delta,
      sourceId: 'legacy-local-coins',
      createdAt: timestamp,
      balanceAfter: state.coins,
    });
  }
  for (const legacyId of legacySkinIds || []) {
    const mapped = LEGACY_SKIN_MAP[legacyId];
    if (mapped && !state.ownedItemIds.includes(mapped)) state.ownedItemIds.push(mapped);
  }
  const activeMapped = legacyActiveSkin ? LEGACY_SKIN_MAP[legacyActiveSkin] : undefined;
  if (activeMapped && state.ownedItemIds.includes(activeMapped)) {
    state.equipped.stone_skin = activeMapped;
  }
  return state;
}

export function purchaseItem(
  state: EconomyState,
  itemId: string,
  requestId: string = nowId('buy'),
  timestamp = Date.now()
): EconomyResult {
  const existing = state.ledger.find(
    (entry) => entry.reason === 'purchase' && entry.sourceId === requestId
  );
  if (existing) return { ok: true, state, duplicate: true };
  const item = getItemById(itemId);
  if (!item) return { ok: false, code: 'not_found', messageFa: 'این آیتم در فروشگاه وجود ندارد.' };
  if (item.availability !== 'always') {
    return { ok: false, code: 'not_available', messageFa: 'این آیتم فعلاً در دسترس نیست.' };
  }
  const granted = item.type === 'bundle' ? item.contents || [] : [item.id];
  const missing = granted.filter((id) => !state.ownedItemIds.includes(id));
  if (missing.length === 0) {
    return { ok: false, code: 'already_owned', messageFa: 'همه محتوای این بسته را دارید.' };
  }
  if (state.coins < item.priceCoins) {
    return {
      ok: false,
      code: 'insufficient_coins',
      messageFa: `برای این خرید ${item.priceCoins - state.coins} سکه دیگر نیاز دارید.`,
    };
  }

  const equipped = { ...state.equipped };
  if (item.type === 'stone_skin' || item.type === 'board_theme' || item.type === 'profile_frame') {
    equipped[item.type] = item.id;
  }
  const next: EconomyState = {
    ...state,
    coins: state.coins - item.priceCoins,
    ownedItemIds: [...state.ownedItemIds, ...missing],
    equipped,
    ledger: [
      ...state.ledger.slice(-199),
      {
        id: nowId('ledger'),
        reason: 'purchase',
        amount: -item.priceCoins,
        sourceId: requestId,
        createdAt: timestamp,
        balanceAfter: state.coins - item.priceCoins,
      },
    ],
  };
  return { ok: true, state: next, item };
}

export function equipItem(state: EconomyState, itemId: string): EconomyResult {
  const item = getItemById(itemId);
  if (!item) return { ok: false, code: 'not_found', messageFa: 'این آیتم وجود ندارد.' };
  if (item.type === 'bundle') {
    return { ok: false, code: 'wrong_type', messageFa: 'بسته ظاهری خودش قابل استفاده نیست؛ آیتم‌های داخل آن را انتخاب کنید.' };
  }
  if (!state.ownedItemIds.includes(itemId)) {
    return { ok: false, code: 'not_owned', messageFa: 'این آیتم را نخریده‌اید.' };
  }
  return {
    ok: true,
    state: { ...state, equipped: { ...state.equipped, [item.type]: itemId } },
    item,
  };
}

export function resetEquipped(state: EconomyState): EconomyState {
  return {
    ...state,
    equipped: {
      stone_skin: DEFAULT_STONE_SKIN_ID,
      board_theme: DEFAULT_BOARD_THEME_ID,
      profile_frame: DEFAULT_PROFILE_FRAME_ID,
    },
  };
}

function withDay(state: EconomyState, timestamp: number): EconomyState {
  const key = dayKey(timestamp);
  if (state.daily.dayKey === key) return state;
  return {
    ...state,
    daily: {
      dayKey: key,
      adCount: 0,
      matchRewardCount: 0,
      lastAdClaimAt: state.daily.lastAdClaimAt,
    },
  };
}

/**
 * Only call this after the ad SDK's official reward callback. Device-side caps
 * reduce abuse; they are not a substitute for server-side verification.
 */
export function claimAdReward(
  state: EconomyState,
  timestamp = Date.now()
): EconomyResult {
  const current = withDay(state, timestamp);
  if (current.daily.adCount >= AD_DAILY_CAP) {
    return { ok: false, code: 'daily_cap', messageFa: 'سقف پاداش تبلیغ برای امروز پر شده است.' };
  }
  if (
    current.daily.lastAdClaimAt !== null &&
    timestamp - current.daily.lastAdClaimAt < AD_COOLDOWN_MS
  ) {
    const remaining = Math.ceil(
      (AD_COOLDOWN_MS - (timestamp - current.daily.lastAdClaimAt)) / 1000
    );
    return {
      ok: false,
      code: 'cooldown',
      messageFa: `برای تبلیغ بعدی ${remaining} ثانیه صبر کنید.`,
    };
  }
  const coins = current.coins + AD_REWARD_COINS;
  const next: EconomyState = {
    ...current,
    coins,
    daily: {
      ...current.daily,
      adCount: current.daily.adCount + 1,
      lastAdClaimAt: timestamp,
    },
    ledger: [
      ...current.ledger.slice(-199),
      {
        id: nowId('ad'),
        reason: 'ad_reward',
        amount: AD_REWARD_COINS,
        sourceId: `ad-${timestamp}`,
        createdAt: timestamp,
        balanceAfter: coins,
      },
    ],
  };
  return { ok: true, state: next };
}

export function grantMatchReward(
  state: EconomyState,
  matchId: string,
  variant: 'three_dooz' | 'twelve_dooz',
  timestamp = Date.now()
): EconomyResult {
  const amount = variant === 'three_dooz' ? MATCH_REWARD_THREE : MATCH_REWARD_TWELVE;
  const current = withDay(state, timestamp);
  if (current.ledger.some((entry) => entry.reason === 'match_reward' && entry.sourceId === matchId)) {
    return { ok: false, code: 'duplicate', messageFa: 'پاداش این مسابقه قبلاً ثبت شده است.' };
  }
  if (current.daily.matchRewardCount >= MATCH_REWARD_DAILY_CAP) {
    return { ok: false, code: 'daily_cap', messageFa: 'سقف پاداش مسابقه‌های امروز پر شده است.' };
  }
  const coins = current.coins + amount;
  return {
    ok: true,
    state: {
      ...current,
      coins,
      daily: { ...current.daily, matchRewardCount: current.daily.matchRewardCount + 1 },
      ledger: [
        ...current.ledger.slice(-199),
        {
          id: nowId('match'),
          reason: 'match_reward',
          amount,
          sourceId: matchId,
          createdAt: timestamp,
          balanceAfter: coins,
        },
      ],
    },
  };
}

export function getAdAvailability(state: EconomyState, timestamp = Date.now()): {
  canClaim: boolean;
  remainingDaily: number;
  cooldownRemainingMs: number;
} {
  const current = withDay(state, timestamp);
  const cooldown =
    current.daily.lastAdClaimAt === null
      ? 0
      : Math.max(0, AD_COOLDOWN_MS - (timestamp - current.daily.lastAdClaimAt));
  return {
    canClaim: current.daily.adCount < AD_DAILY_CAP && cooldown === 0,
    remainingDaily: Math.max(0, AD_DAILY_CAP - current.daily.adCount),
    cooldownRemainingMs: cooldown,
  };
}

export function resolveEquippedItem(
  state: EconomyState,
  type: 'stone_skin' | 'board_theme' | 'profile_frame'
): CosmeticItem {
  const item = getItemById(state.equipped[type]);
  if (item && item.type === type) return item;
  const fallbackId =
    type === 'stone_skin'
      ? DEFAULT_STONE_SKIN_ID
      : type === 'board_theme'
        ? DEFAULT_BOARD_THEME_ID
        : DEFAULT_PROFILE_FRAME_ID;
  return getItemById(fallbackId) || BOARD_THEMES[0];
}
