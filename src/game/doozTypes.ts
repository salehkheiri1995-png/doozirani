export type Player = 'player1' | 'player2'; // player1: Turquoise (فیروزه‌ای), player2: Ruby/Amber (عقیقی/یاقوتی)

/** نتیجهٔ یک دست: برد یکی از طرفین یا تساوی */
export type Winner = Player | 'draw';

export type GameVariant = 'three_dooz' | 'twelve_dooz' | 'tictactoe';

export type GameMode = 'pass_and_play' | 'vs_ai' | 'bluetooth' | 'p2p_room';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GamePhase = 'placing' | 'moving' | 'flying' | 'gameover';

export interface MoveRecord {
  player: Player;
  from?: number; // for moving/flying phase
  to: number;
  removedStone?: number; // if a dooz was made and stone removed
  formedLines?: number[][];
  moveNumber: number;
  timestamp?: number;
}

export interface PlayerStats {
  player1: number;
  player2: number;
  draws: number;
}

/**
 * قواعد قابل تنظیم بازی. پیش‌فرض‌ها همان رفتار رسمی دوز ۱۲ تایی است.
 * این شیء در storage ذخیره می‌شود تا در نسخه‌های بعدی قابل شخصی‌سازی باشد.
 */
export interface GameRules {
  /** پرواز آزاد وقتی بازیکن دقیقاً ۳ مهره دارد */
  flying: boolean;
  /** تساوی با تکرار سه‌بارهٔ وضعیت تخته */
  repetitionDraw: boolean;
  /** تساوی بعد از این تعداد حرکت بدون دوز/سوزاندن (۰ = خاموش) */
  noProgressDrawLimit: number;
}

export const DEFAULT_GAME_RULES: GameRules = {
  flying: true,
  repetitionDraw: true,
  noProgressDrawLimit: 60,
};

/** حالت‌هایی که در آن‌ها دو دستگاه به هم وصل می‌شوند */
export function isNetworkMode(mode: GameMode): boolean {
  return mode === 'bluetooth' || mode === 'p2p_room';
}
