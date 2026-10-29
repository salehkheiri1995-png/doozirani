export type Player = 'player1' | 'player2'; // player1: Turquoise (فیروزه‌ای), player2: Ruby/Amber (عقیقی/یاقوتی)

export type GameVariant = 'three_dooz' | 'twelve_dooz' | 'tictactoe';

export type GameMode = 'pass_and_play' | 'vs_ai' | 'bluetooth' | 'p2p_room';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GamePhase = 'placing' | 'moving' | 'flying' | 'gameover';

export interface MoveRecord {
  player: Player;
  from?: number; // for moving/flying phase
  to: number;
  removedStone?: number; // if a dooz was made and stone removed
  timestamp: number;
}

export interface PlayerStats {
  player1: number;
  player2: number;
  draws: number;
}
