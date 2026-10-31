import { describe, expect, it } from 'vitest';
import {
  AD_COOLDOWN_MS,
  AD_DAILY_CAP,
  AD_REWARD_COINS,
  MATCH_REWARD_DAILY_CAP,
  STARTER_COINS,
  claimAdReward,
  createDefaultEconomy,
  equipItem,
  getAdAvailability,
  grantMatchReward,
  migrateLegacyEconomy,
  normalizeEconomy,
  purchaseItem,
  resetEquipped,
} from './economyStore';

const DAY = 24 * 60 * 60 * 1000;
const BASE_TIME = new Date('2026-10-31T12:00:00Z').getTime();

function rich(timestamp = BASE_TIME) {
  const state = createDefaultEconomy(timestamp);
  return { ...state, coins: 5000 };
}

describe('economy store', () => {
  it('starts with 100 coins and the free items owned and equipped', () => {
    const state = createDefaultEconomy(BASE_TIME);
    expect(state.coins).toBe(STARTER_COINS);
    expect(state.ownedItemIds).toContain('skin_classic');
    expect(state.ownedItemIds).toContain('board_walnut');
    expect(state.equipped.stone_skin).toBe('skin_classic');
    expect(state.ledger[0].reason).toBe('starter');
  });

  it('rejects purchases with insufficient coins without changing state', () => {
    const state = createDefaultEconomy(BASE_TIME);
    const result = purchaseItem(state, 'skin_khatam', 'buy-1', BASE_TIME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('insufficient_coins');
    expect(state.coins).toBe(STARTER_COINS);
  });

  it('deducts coins, records a ledger entry and equips a single item', () => {
    const state = rich();
    const result = purchaseItem(state, 'skin_turquoise', 'buy-2', BASE_TIME);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(5000 - 200);
    expect(result.state.ownedItemIds).toContain('skin_turquoise');
    expect(result.state.equipped.stone_skin).toBe('skin_turquoise');
    expect(result.state.ledger.at(-1)).toMatchObject({
      reason: 'purchase',
      amount: -200,
      sourceId: 'buy-2',
      balanceAfter: 4800,
    });
  });

  it('replays the same purchase request without charging twice', () => {
    const first = purchaseItem(rich(), 'skin_turquoise', 'buy-3', BASE_TIME);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = purchaseItem(first.state, 'skin_turquoise', 'buy-3', BASE_TIME);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(second.state.coins).toBe(first.state.coins);
  });

  it('refuses to buy the same permanent item twice', () => {
    const first = purchaseItem(rich(), 'skin_turquoise', 'buy-4', BASE_TIME);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = purchaseItem(first.state, 'skin_turquoise', 'buy-5', BASE_TIME);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('already_owned');
  });

  it('sells a bundle once and grants every contained item', () => {
    const first = purchaseItem(rich(), 'bundle_royal', 'bundle-1', BASE_TIME);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    for (const id of ['skin_copper', 'board_kashi', 'frame_royal']) {
      expect(first.state.ownedItemIds).toContain(id);
    }
    const second = purchaseItem(first.state, 'bundle_royal', 'bundle-2', BASE_TIME);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('already_owned');
  });

  it('equips only owned items and rejects bundles', () => {
    const state = createDefaultEconomy(BASE_TIME);
    const unowned = equipItem(state, 'skin_lapis');
    expect(unowned.ok).toBe(false);
    if (!unowned.ok) expect(unowned.code).toBe('not_owned');

    const bought = purchaseItem(rich(), 'board_kashi', 'buy-6', BASE_TIME);
    expect(bought.ok).toBe(true);

    const bundle = equipItem(rich(), 'bundle_royal');
    expect(bundle.ok).toBe(false);
    if (!bundle.ok) expect(bundle.code).toBe('wrong_type');
  });

  it('resets to the free appearance without losing owned items', () => {
    const bought = purchaseItem(rich(), 'board_kashi', 'buy-7', BASE_TIME);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    const reset = resetEquipped(bought.state);
    expect(reset.equipped.board_theme).toBe('board_walnut');
    expect(reset.ownedItemIds).toContain('board_kashi');
  });

  it('normalizes corrupt storage and drops unknown item ids', () => {
    const normalized = normalizeEconomy({
      coins: -50,
      ownedItemIds: ['skin_lapis', 'unknown_item', 42],
      equipped: { stone_skin: 'skin_lapis', board_theme: 'missing', profile_frame: null },
      ledger: 'not-an-array',
      daily: { dayKey: '2026-10-31', adCount: -3 },
    });
    expect(normalized.coins).toBe(0);
    expect(normalized.ownedItemIds).toContain('skin_lapis');
    expect(normalized.ownedItemIds).not.toContain('unknown_item');
    expect(normalized.equipped.board_theme).toBe('board_walnut');
    expect(normalized.daily.adCount).toBe(0);
    expect(normalizeEconomy(null)).toMatchObject({ coins: STARTER_COINS });
  });

  it('caps legacy coins and maps legacy skins', () => {
    const migrated = migrateLegacyEconomy(50000, ['royal_gold', 'classic_persian'], 'royal_gold', BASE_TIME);
    expect(migrated.coins).toBe(1000);
    expect(migrated.ownedItemIds).toContain('skin_turquoise');
    expect(migrated.equipped.stone_skin).toBe('skin_turquoise');
    expect(migrated.ledger.some((entry) => entry.reason === 'legacy_migration')).toBe(true);
  });

  it('enforces the ad cooldown and daily cap with a valid timestamp', () => {
    let state = createDefaultEconomy(BASE_TIME);
    const first = claimAdReward(state, BASE_TIME);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.coins).toBe(STARTER_COINS + AD_REWARD_COINS);

    const tooSoon = claimAdReward(first.state, BASE_TIME + 1000);
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.code).toBe('cooldown');

    state = first.state;
    for (let index = 1; index < AD_DAILY_CAP; index += 1) {
      const next = claimAdReward(state, BASE_TIME + index * (AD_COOLDOWN_MS + 1000));
      expect(next.ok).toBe(true);
      if (next.ok) state = next.state;
    }
    const capped = claimAdReward(state, BASE_TIME + 10 * (AD_COOLDOWN_MS + 1000));
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.code).toBe('daily_cap');
    expect(getAdAvailability(state, BASE_TIME).remainingDaily).toBe(0);

    const nextDay = claimAdReward(state, BASE_TIME + DAY + 10 * (AD_COOLDOWN_MS + 1000));
    expect(nextDay.ok).toBe(true);
  });

  it('grants a match reward once per match and caps daily farming', () => {
    let state = createDefaultEconomy(BASE_TIME);
    const first = grantMatchReward(state, 'match-a', 'three_dooz', BASE_TIME);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.coins).toBe(STARTER_COINS + 20);
    const duplicate = grantMatchReward(first.state, 'match-a', 'three_dooz', BASE_TIME + 1000);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe('duplicate');

    state = first.state;
    for (let index = 1; index < MATCH_REWARD_DAILY_CAP; index += 1) {
      const next = grantMatchReward(state, `match-${index}`, 'twelve_dooz', BASE_TIME + index * 1000);
      expect(next.ok).toBe(true);
      if (next.ok) state = next.state;
    }
    const capped = grantMatchReward(state, 'match-final', 'twelve_dooz', BASE_TIME + 60_000);
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.code).toBe('daily_cap');
  });
});
