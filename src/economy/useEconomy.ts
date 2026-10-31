import { useSyncExternalStore } from 'react';
import {
  ECONOMY_STORAGE_KEY,
  claimAdReward as claimAdRewardPure,
  createDefaultEconomy,
  equipItem as equipItemPure,
  grantMatchReward as grantMatchRewardPure,
  migrateLegacyEconomy,
  normalizeEconomy,
  purchaseItem as purchaseItemPure,
  resetEquipped as resetEquippedPure,
  type EconomyResult,
  type EconomyState,
} from './economyStore';

const listeners = new Set<() => void>();
let cached: EconomyState | null = null;

function readLegacyCoins(): number | null {
  const raw = window.localStorage.getItem('dooz_player_coins');
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function readLegacySkins(): string[] | null {
  const raw = window.localStorage.getItem('dooz_unlocked_skins');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null;
  } catch {
    return null;
  }
}

function load(): EconomyState {
  if (typeof window === 'undefined') return createDefaultEconomy();
  try {
    const stored = window.localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (stored) return normalizeEconomy(JSON.parse(stored));
  } catch {
    // Corrupt storage falls through to a clean, validated state.
  }
  try {
    const migrated = migrateLegacyEconomy(
      readLegacyCoins(),
      readLegacySkins(),
      window.localStorage.getItem('dooz_active_skin')
    );
    persist(migrated);
    return migrated;
  } catch {
    return createDefaultEconomy();
  }
}

function persist(state: EconomyState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota must not crash gameplay.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function getEconomyState(): EconomyState {
  if (!cached) cached = load();
  return cached;
}

export function subscribeEconomy(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: EconomyState) {
  cached = next;
  persist(next);
  emit();
}

function apply(result: EconomyResult): EconomyResult {
  if (result.ok) commit(result.state);
  return result;
}

export const economyActions = {
  purchase(itemId: string, requestId?: string) {
    return apply(purchaseItemPure(getEconomyState(), itemId, requestId));
  },
  equip(itemId: string) {
    return apply(equipItemPure(getEconomyState(), itemId));
  },
  resetEquipped() {
    commit(resetEquippedPure(getEconomyState()));
  },
  claimAdReward(timestamp = Date.now()) {
    return apply(claimAdRewardPure(getEconomyState(), timestamp));
  },
  grantMatchReward(matchId: string, variant: 'three_dooz' | 'twelve_dooz', timestamp = Date.now()) {
    return apply(grantMatchRewardPure(getEconomyState(), matchId, variant, timestamp));
  },
  reloadFromStorage() {
    cached = load();
    emit();
  },
};

export function useEconomy(): EconomyState {
  return useSyncExternalStore(subscribeEconomy, getEconomyState, getEconomyState);
}

/** Test-only: forget the module cache so each test starts from storage. */
export function __resetEconomyCacheForTests() {
  cached = null;
  listeners.clear();
}
