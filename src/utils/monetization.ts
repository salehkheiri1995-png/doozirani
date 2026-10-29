// Monetization and economy engine for Dooz mobile game
// Supports Rewarded Video Ads, Interstitial Ads, Coins, and Cosmetic Unlockables

export interface CosmeticSkin {
  id: string;
  name: string;
  p1Color: string;
  p2Color: string;
  cost: number;
  isUnlocked: boolean;
  previewClass: string;
}

export const INITIAL_SKINS: CosmeticSkin[] = [
  {
    id: 'classic_persian',
    name: 'فیروزه نیشابور و عقیق یمن',
    p1Color: 'bg-gradient-to-br from-teal-300 via-emerald-600 to-cyan-900 border-emerald-300',
    p2Color: 'bg-gradient-to-br from-rose-400 via-red-600 to-amber-950 border-amber-300',
    cost: 0,
    isUnlocked: true,
    previewClass: 'from-teal-400 to-rose-500',
  },
  {
    id: 'royal_gold',
    name: 'طلای سلطنتی و لاجورد باستان',
    p1Color: 'bg-gradient-to-br from-amber-200 via-amber-500 to-yellow-800 border-amber-200',
    p2Color: 'bg-gradient-to-br from-blue-300 via-indigo-600 to-blue-950 border-blue-300',
    cost: 150,
    isUnlocked: false,
    previewClass: 'from-amber-400 to-indigo-600',
  },
  {
    id: 'emerald_ruby',
    name: 'زمرد شاهانه و یاقوت اناری',
    p1Color: 'bg-gradient-to-br from-emerald-300 via-green-600 to-emerald-950 border-green-300',
    p2Color: 'bg-gradient-to-br from-fuchsia-400 via-purple-600 to-purple-950 border-fuchsia-300',
    cost: 300,
    isUnlocked: false,
    previewClass: 'from-emerald-400 to-purple-600',
  },
];

const COINS_KEY = 'dooz_player_coins';
const SKINS_KEY = 'dooz_unlocked_skins';
const ACTIVE_SKIN_KEY = 'dooz_active_skin';

export function getPlayerCoins(): number {
  if (typeof window === 'undefined') return 200;
  const saved = localStorage.getItem(COINS_KEY);
  if (saved !== null) {
    const num = parseInt(saved, 10);
    if (!isNaN(num)) return num;
  }
  return 100; // Starter coins
}

export function savePlayerCoins(coins: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COINS_KEY, coins.toString());
  }
}

export function addPlayerCoins(amount: number): number {
  const current = getPlayerCoins();
  const next = current + amount;
  savePlayerCoins(next);
  return next;
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
  return localStorage.getItem(ACTIVE_SKIN_KEY) || 'classic_persian';
}

export function setActiveSkinId(skinId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_SKIN_KEY, skinId);
  }
}
