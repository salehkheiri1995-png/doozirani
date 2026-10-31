/**
 * Single source of truth for cosmetic items.
 *
 * Prices are design hypotheses for the MVP, not market data. Items are
 * cosmetic only: no item may change legal moves, luck, turn order or rules.
 * Only item ids travel over the network; render data is always resolved here.
 */

export type CosmeticType = 'stone_skin' | 'board_theme' | 'profile_frame' | 'bundle';

export type Rarity = 'standard' | 'special' | 'premium';

export interface StoneRenderConfig {
  p1: {
    from: string;
    via: string;
    to: string;
    border: string;
    glow: string;
    emblem: 'dot' | 'diamond' | 'star' | 'khatam';
  };
  p2: {
    from: string;
    via: string;
    to: string;
    border: string;
    glow: string;
    emblem: 'dot' | 'diamond' | 'star' | 'khatam';
  };
}

export interface BoardRenderConfig {
  surface: string;
  line: string;
  accent: string;
  frame: string;
  label: string;
}

export interface FrameRenderConfig {
  ring: string;
  background: string;
  label: string;
}

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  nameFa: string;
  descriptionFa: string;
  priceCoins: number;
  rarity: Rarity;
  /** Local preview only; never sent to another player. */
  preview: { gradient: string; label: string };
  renderConfig: StoneRenderConfig | BoardRenderConfig | FrameRenderConfig;
  availability: 'always' | 'disabled';
  ownershipType: 'permanent' | 'bundle';
  compatibility: {
    variants: Array<'three_dooz' | 'twelve_dooz'>;
    modes: Array<'pass_and_play' | 'vs_ai' | 'bluetooth' | 'p2p_room' | 'online'>;
  };
  /** Bundle contents; only present when type === 'bundle'. */
  contents?: string[];
  version: number;
}

const ALL_VARIANTS = ['three_dooz', 'twelve_dooz'] as const;
const ALL_MODES = ['pass_and_play', 'vs_ai', 'bluetooth', 'p2p_room', 'online'] as const;

export const STONE_SKINS: CosmeticItem[] = [
  {
    id: 'skin_classic',
    type: 'stone_skin',
    nameFa: 'فیروزه نیشابور و عقیق یمن',
    descriptionFa: 'پوسته پایه و رایگان بازی با دو مهره کلاسیک.',
    priceCoins: 0,
    rarity: 'standard',
    preview: { gradient: 'linear-gradient(135deg,#5eead4,#0f766e 55%,#7f1d1d)', label: 'پایه' },
    renderConfig: {
      p1: {
        from: '#5eead4',
        via: '#059669',
        to: '#164e63',
        border: '#6ee7b7',
        glow: 'rgba(20,184,166,0.55)',
        emblem: 'dot',
      },
      p2: {
        from: '#fda4af',
        via: '#dc2626',
        to: '#451a03',
        border: '#fcd34d',
        glow: 'rgba(239,68,68,0.55)',
        emblem: 'dot',
      },
    } satisfies StoneRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'skin_turquoise',
    type: 'stone_skin',
    nameFa: 'مهره فیروزه',
    descriptionFa: 'فیروزه عمیق با حاشیه مسی و نشان لوزی؛ مناسب بازی روزمره.',
    priceCoins: 200,
    rarity: 'standard',
    preview: { gradient: 'linear-gradient(135deg,#67e8f9,#0e7490 55%,#b45309)', label: 'فیروزه' },
    renderConfig: {
      p1: {
        from: '#a5f3fc',
        via: '#0891b2',
        to: '#083344',
        border: '#f0abfc',
        glow: 'rgba(34,211,238,0.6)',
        emblem: 'diamond',
      },
      p2: {
        from: '#fdba74',
        via: '#c2410c',
        to: '#431407',
        border: '#fde68a',
        glow: 'rgba(249,115,22,0.55)',
        emblem: 'diamond',
      },
    } satisfies StoneRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'skin_copper',
    type: 'stone_skin',
    nameFa: 'مهره مسی',
    descriptionFa: 'مس صیقلی در برابر لاجورد؛ کنتراست بالا برای صفحه‌های تیره.',
    priceCoins: 600,
    rarity: 'special',
    preview: { gradient: 'linear-gradient(135deg,#fbbf24,#b45309 55%,#1e3a8a)', label: 'مسی' },
    renderConfig: {
      p1: {
        from: '#fde68a',
        via: '#b45309',
        to: '#451a03',
        border: '#fef3c7',
        glow: 'rgba(245,158,11,0.6)',
        emblem: 'star',
      },
      p2: {
        from: '#93c5fd',
        via: '#1d4ed8',
        to: '#172554',
        border: '#bfdbfe',
        glow: 'rgba(59,130,246,0.6)',
        emblem: 'star',
      },
    } satisfies StoneRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'skin_lapis',
    type: 'stone_skin',
    nameFa: 'مهره لاجورد و خاتم',
    descriptionFa: 'لاجورد ایرانی با نشان خاتم و حاشیه طلایی؛ آیتم ویژه.',
    priceCoins: 1500,
    rarity: 'premium',
    preview: { gradient: 'linear-gradient(135deg,#818cf8,#1e3a8a 55%,#fbbf24)', label: 'لاجورد' },
    renderConfig: {
      p1: {
        from: '#c7d2fe',
        via: '#3730a3',
        to: '#1e1b4b',
        border: '#fbbf24',
        glow: 'rgba(129,140,248,0.65)',
        emblem: 'khatam',
      },
      p2: {
        from: '#fef3c7',
        via: '#b45309',
        to: '#3b0764',
        border: '#fde68a',
        glow: 'rgba(251,191,36,0.6)',
        emblem: 'khatam',
      },
    } satisfies StoneRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'skin_khatam',
    type: 'stone_skin',
    nameFa: 'مهره خاتم شیراز',
    descriptionFa: 'ترکیب چوب گردو و استخوان با نشان هشت‌پر؛ آیتم ممتاز.',
    priceCoins: 1500,
    rarity: 'premium',
    preview: { gradient: 'linear-gradient(135deg,#fde68a,#a16207 50%,#065f46)', label: 'خاتم' },
    renderConfig: {
      p1: {
        from: '#fef9c3',
        via: '#ca8a04',
        to: '#422006',
        border: '#fffbeb',
        glow: 'rgba(234,179,8,0.6)',
        emblem: 'khatam',
      },
      p2: {
        from: '#a7f3d0',
        via: '#047857',
        to: '#022c22',
        border: '#d1fae5',
        glow: 'rgba(16,185,129,0.6)',
        emblem: 'khatam',
      },
    } satisfies StoneRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
];

export const BOARD_THEMES: CosmeticItem[] = [
  {
    id: 'board_walnut',
    type: 'board_theme',
    nameFa: 'صفحه چوب گردو',
    descriptionFa: 'صفحه پایه با بافت چوب گرم و خطوط کهربایی.',
    priceCoins: 0,
    rarity: 'standard',
    preview: { gradient: 'linear-gradient(135deg,#8b5e34,#3f2412)', label: 'گردو' },
    renderConfig: {
      surface: 'linear-gradient(145deg,#3b2414 0%,#5b3a1f 45%,#2b1a0e 100%)',
      line: '#a67c52',
      accent: '#fbbf24',
      frame: '#7c4a21',
      label: 'چوب گردو',
    } satisfies BoardRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'board_kashi',
    type: 'board_theme',
    nameFa: 'صفحه کاشی آبی',
    descriptionFa: 'کاشی لعابی اصفهان با خطوط فیروزه‌ای و لاجوردی.',
    priceCoins: 600,
    rarity: 'special',
    preview: { gradient: 'linear-gradient(135deg,#38bdf8,#1e3a8a 55%,#0f766e)', label: 'کاشی' },
    renderConfig: {
      surface: 'linear-gradient(145deg,#0b2b4a 0%,#124e78 50%,#072033 100%)',
      line: '#7dd3fc',
      accent: '#fde68a',
      frame: '#0ea5e9',
      label: 'کاشی آبی',
    } satisfies BoardRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'board_qali',
    type: 'board_theme',
    nameFa: 'صفحه قالی ایرانی',
    descriptionFa: 'زمینه قالی با نقش‌های هندسی و حاشیه زعفرانی.',
    priceCoins: 1500,
    rarity: 'premium',
    preview: { gradient: 'linear-gradient(135deg,#b91c1c,#7f1d1d 50%,#f59e0b)', label: 'قالی' },
    renderConfig: {
      surface: 'linear-gradient(145deg,#4c0519 0%,#7f1d1d 45%,#3b0764 100%)',
      line: '#fcd34d',
      accent: '#fb923c',
      frame: '#b91c1c',
      label: 'قالی ایرانی',
    } satisfies BoardRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
];

export const PROFILE_FRAMES: CosmeticItem[] = [
  {
    id: 'frame_simple',
    type: 'profile_frame',
    nameFa: 'قاب ساده',
    descriptionFa: 'قاب پایه پروفایل با حاشیه کهربایی.',
    priceCoins: 0,
    rarity: 'standard',
    preview: { gradient: 'linear-gradient(135deg,#fbbf24,#78350f)', label: 'ساده' },
    renderConfig: {
      ring: '#f59e0b',
      background: 'rgba(120,53,15,0.35)',
      label: 'ساده',
    } satisfies FrameRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'frame_khatam',
    type: 'profile_frame',
    nameFa: 'قاب خاتم',
    descriptionFa: 'قاب هشت‌پر با رنگ‌های خاتم؛ مخصوص پروفایل.',
    priceCoins: 200,
    rarity: 'standard',
    preview: { gradient: 'linear-gradient(135deg,#fde68a,#065f46 60%,#0c4a6e)', label: 'خاتم' },
    renderConfig: {
      ring: '#fbbf24',
      background: 'rgba(6,95,70,0.4)',
      label: 'خاتم',
    } satisfies FrameRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
  {
    id: 'frame_royal',
    type: 'profile_frame',
    nameFa: 'قاب شاهانه',
    descriptionFa: 'قاب طلایی با نگین لاجورد؛ ویژه پروفایل.',
    priceCoins: 600,
    rarity: 'special',
    preview: { gradient: 'linear-gradient(135deg,#fef3c7,#f59e0b 45%,#1e3a8a)', label: 'شاهانه' },
    renderConfig: {
      ring: '#fcd34d',
      background: 'rgba(30,58,138,0.45)',
      label: 'شاهانه',
    } satisfies FrameRenderConfig,
    availability: 'always',
    ownershipType: 'permanent',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    version: 1,
  },
];

export const BUNDLES: CosmeticItem[] = [
  {
    id: 'bundle_royal',
    type: 'bundle',
    nameFa: 'بسته ظاهری شاهانه',
    descriptionFa: 'مهره مسی، صفحه کاشی آبی و قاب شاهانه با تخفیف مجموعه.',
    priceCoins: 2400,
    rarity: 'premium',
    preview: { gradient: 'linear-gradient(135deg,#fbbf24,#0ea5e9 55%,#7f1d1d)', label: 'بسته' },
    renderConfig: {
      surface: 'linear-gradient(145deg,#0b2b4a,#b45309)',
      line: '#fde68a',
      accent: '#7dd3fc',
      frame: '#f59e0b',
      label: 'بسته شاهانه',
    } satisfies BoardRenderConfig,
    availability: 'always',
    ownershipType: 'bundle',
    compatibility: { variants: [...ALL_VARIANTS], modes: [...ALL_MODES] },
    contents: ['skin_copper', 'board_kashi', 'frame_royal'],
    version: 1,
  },
];

export const CATALOG: CosmeticItem[] = [
  ...STONE_SKINS,
  ...BOARD_THEMES,
  ...PROFILE_FRAMES,
  ...BUNDLES,
];

export const DEFAULT_STONE_SKIN_ID = 'skin_classic';
export const DEFAULT_BOARD_THEME_ID = 'board_walnut';
export const DEFAULT_PROFILE_FRAME_ID = 'frame_simple';

export function getItemById(id: string): CosmeticItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

export function getItemsByType(type: CosmeticType): CosmeticItem[] {
  return CATALOG.filter((item) => item.type === type && item.availability === 'always');
}

export function isStoneSkin(item: CosmeticItem | undefined): item is CosmeticItem & {
  renderConfig: StoneRenderConfig;
} {
  return !!item && item.type === 'stone_skin';
}

export function isBoardTheme(item: CosmeticItem | undefined): item is CosmeticItem & {
  renderConfig: BoardRenderConfig;
} {
  return !!item && item.type === 'board_theme';
}

export function isProfileFrame(item: CosmeticItem | undefined): item is CosmeticItem & {
  renderConfig: FrameRenderConfig;
} {
  return !!item && item.type === 'profile_frame';
}

export function resolveStoneSkin(id: string | null | undefined): StoneRenderConfig {
  const item = getItemById(id || '');
  return (isStoneSkin(item) ? item.renderConfig : (getItemById(DEFAULT_STONE_SKIN_ID)!.renderConfig as StoneRenderConfig));
}

export function resolveBoardTheme(id: string | null | undefined): BoardRenderConfig {
  const item = getItemById(id || '');
  return (isBoardTheme(item) ? item.renderConfig : (getItemById(DEFAULT_BOARD_THEME_ID)!.renderConfig as BoardRenderConfig));
}

export function resolveProfileFrame(id: string | null | undefined): FrameRenderConfig {
  const item = getItemById(id || '');
  return (isProfileFrame(item) ? item.renderConfig : (getItemById(DEFAULT_PROFILE_FRAME_ID)!.renderConfig as FrameRenderConfig));
}
