import type { Player, GameVariant } from './doozTypes';
import {
  ThreeDoozState,
  createInitialThreeDoozState,
  placeStoneThreeDooz,
  moveStoneThreeDooz,
} from './threeDoozLogic';
import {
  TwelveDoozState,
  createInitialTwelveDoozState,
  placeStoneTwelveDooz,
  moveStoneTwelveDooz,
  removeOpponentStone,
} from './twelveDoozLogic';

/** Variants that can be played in a networked or local match. */
export type MatchVariant = Extract<GameVariant, 'three_dooz' | 'twelve_dooz'>;

/**
 * A transport-neutral command. The same command is produced by the UI, the
 * Bluetooth bridge and the online socket; only the executor differs.
 */
export type MatchCommand =
  | { type: 'PLACE'; index: number }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'REMOVE'; index: number }
  | { type: 'RESIGN' };

export type MatchEvent =
  | { type: 'stone_placed'; player: Player; index: number }
  | { type: 'stone_moved'; player: Player; from: number; to: number }
  | { type: 'stone_removed'; player: Player; index: number }
  | { type: 'mill_formed'; player: Player; lines: number[][] }
  | { type: 'turn_changed'; turn: Player }
  | { type: 'match_ended'; winner: Player | 'draw'; reason: string };

export interface MatchState {
  matchId: string;
  variant: MatchVariant;
  three: ThreeDoozState;
  twelve: TwelveDoozState;
  /** Monotonic counter; every accepted command increments it exactly once. */
  version: number;
  /** Board signatures used for the documented threefold-repetition draw rule. */
  repetition: Record<string, number>;
  winner: Player | 'draw' | null;
  endingReason: string | null;
}

export type CommandErrorCode =
  | 'match_finished'
  | 'not_your_turn'
  | 'invalid_actor'
  | 'invalid_index'
  | 'invalid_phase'
  | 'illegal_move'
  | 'nothing_to_remove'
  | 'unknown_command';

export type CommandResult =
  | { ok: true; state: MatchState; events: MatchEvent[] }
  | { ok: false; code: CommandErrorCode; messageFa: string };

export function createMatchId(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMatchState(
  variant: MatchVariant,
  matchId: string = createMatchId()
): MatchState {
  const state: MatchState = {
    matchId,
    variant,
    three: createInitialThreeDoozState(),
    twelve: createInitialTwelveDoozState(),
    version: 0,
    repetition: {},
    winner: null,
    endingReason: null,
  };
  state.repetition[boardSignature(state)] = 1;
  return state;
}

export function isMatchVariant(value: unknown): value is MatchVariant {
  return value === 'three_dooz' || value === 'twelve_dooz';
}

export function activeThree(state: MatchState): ThreeDoozState {
  return state.three;
}

export function activeTwelve(state: MatchState): TwelveDoozState {
  return state.twelve;
}

export function currentTurn(state: MatchState): Player {
  return state.variant === 'three_dooz' ? state.three.turn : state.twelve.turn;
}

export function boardSignature(state: MatchState): string {
  if (state.variant === 'three_dooz') {
    return `3:${state.three.board.map((cell) => (cell === null ? '-' : cell === 'player1' ? '1' : '2')).join('')}:${state.three.turn}:${state.three.phase}`;
  }
  const twelve = state.twelve;
  return `12:${twelve.board.map((cell) => (cell === null ? '-' : cell === 'player1' ? '1' : '2')).join('')}:${twelve.turn}:${twelve.phase}:${twelve.mustRemoveOpponentStone ? 'r' : 'n'}`;
}

function initialStateWinner(game: ThreeDoozState | TwelveDoozState): Player | 'draw' | null {
  return game.winner;
}

function endReason(state: MatchState): string {
  if (state.variant === 'three_dooz') {
    if (state.three.winner === 'draw') return 'تکرار سه‌باره وضعیت؛ مساوی';
    return 'سه مهره در یک راستا ردیف شد';
  }
  const twelve = state.twelve;
  if (twelve.winner === 'draw') return 'تکرار سه‌باره وضعیت؛ مساوی';
  return twelve.winningReason || 'مسابقه پایان یافت';
}

function isIntegerInRange(value: unknown, min: number, maxExclusive: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value < maxExclusive;
}

function validateCommandShape(command: MatchCommand): CommandErrorCode | null {
  if (!command || typeof command !== 'object') return 'unknown_command';
  switch (command.type) {
    case 'PLACE':
    case 'REMOVE':
      return typeof command.index === 'number' && Number.isInteger(command.index)
        ? null
        : 'invalid_index';
    case 'MOVE':
      return typeof command.from === 'number' &&
        Number.isInteger(command.from) &&
        typeof command.to === 'number' &&
        Number.isInteger(command.to)
        ? null
        : 'invalid_index';
    case 'RESIGN':
      return null;
    default:
      return 'unknown_command';
  }
}

/**
 * Applies one command to a match state. Pure: never mutates the input.
 * The actor (not the client payload) decides who is allowed to move.
 */
export function applyCommand(
  state: MatchState,
  command: MatchCommand,
  actor: Player
): CommandResult {
  if (state.winner !== null) {
    return { ok: false, code: 'match_finished', messageFa: 'این مسابقه تمام شده است.' };
  }
  const shapeError = validateCommandShape(command);
  if (shapeError) {
    return { ok: false, code: shapeError, messageFa: 'فرمان نامعتبر است.' };
  }
  if (actor !== 'player1' && actor !== 'player2') {
    return { ok: false, code: 'invalid_actor', messageFa: 'هویت بازیکن نامعتبر است.' };
  }
  if (command.type === 'RESIGN') {
    const winner: Player = actor === 'player1' ? 'player2' : 'player1';
    const next: MatchState = {
      ...state,
      version: state.version + 1,
      winner,
      endingReason: 'حریف استعفا داد',
    };
    return {
      ok: true,
      state: next,
      events: [{ type: 'match_ended', winner, reason: next.endingReason! }],
    };
  }
  if (actor !== currentTurn(state)) {
    return { ok: false, code: 'not_your_turn', messageFa: 'نوبت شما نیست.' };
  }

  const events: MatchEvent[] = [];
  let next: MatchState;

  if (state.variant === 'three_dooz') {
    const game = state.three;
    if (game.winner) {
      return { ok: false, code: 'match_finished', messageFa: 'این مسابقه تمام شده است.' };
    }
    if (command.type === 'PLACE') {
      if (!isIntegerInRange(command.index, 0, 9)) {
        return { ok: false, code: 'invalid_index', messageFa: 'خانه انتخاب‌شده معتبر نیست.' };
      }
      if (game.phase !== 'placing') {
        return { ok: false, code: 'invalid_phase', messageFa: 'اکنون مرحله چیدن مهره نیست.' };
      }
      if (game.board[command.index] !== null) {
        return { ok: false, code: 'illegal_move', messageFa: 'این خانه پر است.' };
      }
      const result = placeStoneThreeDooz(game, command.index);
      if (result === game) {
        return { ok: false, code: 'illegal_move', messageFa: 'این حرکت مجاز نیست.' };
      }
      events.push({ type: 'stone_placed', player: actor, index: command.index });
      next = { ...state, three: result };
    } else if (command.type === 'MOVE') {
      if (!isIntegerInRange(command.from, 0, 9) || !isIntegerInRange(command.to, 0, 9)) {
        return { ok: false, code: 'invalid_index', messageFa: 'خانه انتخاب‌شده معتبر نیست.' };
      }
      if (game.phase !== 'moving') {
        return { ok: false, code: 'invalid_phase', messageFa: 'اکنون مرحله جابه‌جایی مهره نیست.' };
      }
      if (game.board[command.from] !== actor) {
        return { ok: false, code: 'illegal_move', messageFa: 'فقط مهره خودتان را می‌توانید حرکت دهید.' };
      }
      if (game.board[command.to] !== null) {
        return { ok: false, code: 'illegal_move', messageFa: 'خانه مقصد خالی نیست.' };
      }
      const result = moveStoneThreeDooz(game, command.from, command.to);
      if (result === game) {
        return { ok: false, code: 'illegal_move', messageFa: 'این حرکت مجاز نیست.' };
      }
      events.push({ type: 'stone_moved', player: actor, from: command.from, to: command.to });
      next = { ...state, three: result };
    } else {
      return { ok: false, code: 'unknown_command', messageFa: 'این فرمان در این نوع دوز پشتیبانی نمی‌شود.' };
    }
  } else {
    const game = state.twelve;
    if (game.winner) {
      return { ok: false, code: 'match_finished', messageFa: 'این مسابقه تمام شده است.' };
    }
    if (game.mustRemoveOpponentStone) {
      if (command.type !== 'REMOVE') {
        return { ok: false, code: 'nothing_to_remove', messageFa: 'ابتدا باید یک مهره از حریف بگیرید.' };
      }
      if (!isIntegerInRange(command.index, 0, 24)) {
        return { ok: false, code: 'invalid_index', messageFa: 'خانه انتخاب‌شده معتبر نیست.' };
      }
      const result = removeOpponentStone(game, command.index);
      if (result === game) {
        return { ok: false, code: 'illegal_move', messageFa: 'این مهره قابل گرفتن نیست.' };
      }
      events.push({ type: 'stone_removed', player: actor, index: command.index });
      next = { ...state, twelve: result };
    } else if (command.type === 'PLACE') {
      if (!isIntegerInRange(command.index, 0, 24)) {
        return { ok: false, code: 'invalid_index', messageFa: 'خانه انتخاب‌شده معتبر نیست.' };
      }
      if (game.phase !== 'placing') {
        return { ok: false, code: 'invalid_phase', messageFa: 'اکنون مرحله چیدن مهره نیست.' };
      }
      if (game.board[command.index] !== null) {
        return { ok: false, code: 'illegal_move', messageFa: 'این خانه پر است.' };
      }
      const result = placeStoneTwelveDooz(game, command.index);
      if (result === game) {
        return { ok: false, code: 'illegal_move', messageFa: 'این حرکت مجاز نیست.' };
      }
      events.push({ type: 'stone_placed', player: actor, index: command.index });
      if (result.lastFormedLines.length > 0) {
        events.push({ type: 'mill_formed', player: actor, lines: result.lastFormedLines });
      }
      next = { ...state, twelve: result };
    } else if (command.type === 'MOVE') {
      if (!isIntegerInRange(command.from, 0, 24) || !isIntegerInRange(command.to, 0, 24)) {
        return { ok: false, code: 'invalid_index', messageFa: 'خانه انتخاب‌شده معتبر نیست.' };
      }
      if (game.phase !== 'moving' && game.phase !== 'flying') {
        return { ok: false, code: 'invalid_phase', messageFa: 'اکنون مرحله جابه‌جایی مهره نیست.' };
      }
      if (game.board[command.from] !== actor) {
        return { ok: false, code: 'illegal_move', messageFa: 'فقط مهره خودتان را می‌توانید حرکت دهید.' };
      }
      if (game.board[command.to] !== null) {
        return { ok: false, code: 'illegal_move', messageFa: 'خانه مقصد خالی نیست.' };
      }
      const result = moveStoneTwelveDooz(game, command.from, command.to);
      if (result === game) {
        return { ok: false, code: 'illegal_move', messageFa: 'این حرکت مجاز نیست.' };
      }
      events.push({ type: 'stone_moved', player: actor, from: command.from, to: command.to });
      if (result.lastFormedLines.length > 0) {
        events.push({ type: 'mill_formed', player: actor, lines: result.lastFormedLines });
      }
      next = { ...state, twelve: result };
    } else {
      return { ok: false, code: 'unknown_command', messageFa: 'این فرمان در این نوع دوز پشتیبانی نمی‌شود.' };
    }
  }

  const gameAfter = next.variant === 'three_dooz' ? next.three : next.twelve;
  const winner = initialStateWinner(gameAfter);
  let finalState: MatchState = next;

  if (winner) {
    finalState = {
      ...next,
      version: state.version + 1,
      winner,
      endingReason: endReason(next),
    };
    if (winner !== 'draw') {
      events.push({ type: 'match_ended', winner, reason: finalState.endingReason! });
    } else {
      events.push({ type: 'match_ended', winner: 'draw', reason: finalState.endingReason! });
    }
  } else {
    const signature = boardSignature(next);
    const count = (state.repetition[signature] || 0) + 1;
    const repetition = { ...state.repetition, [signature]: count };
    finalState = {
      ...next,
      version: state.version + 1,
      repetition,
    };
    if (count >= 3) {
      finalState = {
        ...finalState,
        winner: 'draw',
        endingReason: 'تکرار سه‌باره وضعیت؛ مساوی',
      };
      events.push({
        type: 'match_ended',
        winner: 'draw',
        reason: finalState.endingReason!,
      });
    } else {
      events.push({ type: 'turn_changed', turn: currentTurn(finalState) });
    }
  }

  return { ok: true, state: finalState, events };
}

/** Basic untrusted-input guard for snapshots received over a network. */
export function isMatchState(value: unknown): value is MatchState {
  if (!value || typeof value !== 'object') return false;
  const match = value as Partial<MatchState>;
  if (!isMatchVariant(match.variant)) return false;
  if (typeof match.matchId !== 'string' || match.matchId.length === 0 || match.matchId.length > 128) return false;
  if (typeof match.version !== 'number' || !Number.isInteger(match.version) || match.version < 0) return false;
  if (match.winner !== null && match.winner !== 'player1' && match.winner !== 'player2' && match.winner !== 'draw') {
    return false;
  }
  if (!match.three || !match.twelve) return false;
  if (!Array.isArray(match.three.board) || match.three.board.length !== 9) return false;
  if (!Array.isArray(match.twelve.board) || match.twelve.board.length !== 24) return false;
  if (typeof match.repetition !== 'object' || match.repetition === null) return false;
  return true;
}
