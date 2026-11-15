import { Player, Winner, GamePhase, MoveRecord, DEFAULT_GAME_RULES } from './doozTypes';

export interface TwelveDoozState {
  board: (Player | null)[]; // 24 spots
  unplacedCount: { player1: number; player2: number };
  turn: Player;
  phase: GamePhase;
  mustRemoveOpponentStone: boolean;
  selectedFromIndex: number | null;
  winner: Winner | null;
  winningReason: string | null;
  winningLine: number[] | null;
  lastFormedLines: number[][];
  moveCount: number;
  positionCounts: Record<string, number>;
  movesSinceProgress: number;
  lastMove: MoveRecord | null;
}

export const TWELVE_DOOZ_LINES: number[][] = [
  // Outer square
  [0, 1, 2],
  [2, 4, 7],
  [5, 6, 7],
  [0, 3, 5],
  // Middle square
  [8, 9, 10],
  [10, 12, 15],
  [13, 14, 15],
  [8, 11, 13],
  // Inner square
  [16, 17, 18],
  [18, 20, 23],
  [21, 22, 23],
  [16, 19, 21],
  // Midpoint cross lines
  [1, 9, 17],
  [3, 11, 19],
  [4, 12, 20],
  [6, 14, 22],
  // 12-Dooz Corner diagonals
  [0, 8, 16],
  [2, 10, 18],
  [5, 13, 21],
  [7, 15, 23],
];

export const TWELVE_DOOZ_ADJACENCY: Record<number, number[]> = {
  // Outer
  0: [1, 3, 8],
  1: [0, 2, 9],
  2: [1, 4, 10],
  3: [0, 5, 11],
  4: [2, 7, 12],
  5: [3, 6, 13],
  6: [5, 7, 14],
  7: [4, 6, 15],

  // Middle
  8: [9, 11, 0, 16],
  9: [8, 10, 1, 17],
  10: [9, 12, 2, 18],
  11: [8, 13, 3, 19],
  12: [10, 15, 4, 20],
  13: [11, 14, 5, 21],
  14: [13, 15, 6, 22],
  15: [12, 14, 7, 23],

  // Inner
  16: [17, 19, 8],
  17: [16, 18, 9],
  18: [17, 20, 10],
  19: [16, 21, 11],
  20: [18, 23, 12],
  21: [19, 22, 13],
  22: [21, 23, 14],
  23: [20, 22, 15],
};

export function createInitialTwelveDoozState(): TwelveDoozState {
  return {
    board: Array(24).fill(null),
    unplacedCount: { player1: 12, player2: 12 },
    turn: 'player1',
    phase: 'placing',
    mustRemoveOpponentStone: false,
    selectedFromIndex: null,
    winner: null,
    winningReason: null,
    winningLine: null,
    lastFormedLines: [],
    moveCount: 0,
    positionCounts: {},
    movesSinceProgress: 0,
    lastMove: null,
  };
}

export function countStonesOnBoard(board: (Player | null)[], player: Player): number {
  let count = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

/** کلید یکتای وضعیت برای تشخیص تکرار (تساوی) */
export function twelveDoozPositionKey(state: TwelveDoozState): string {
  const cells = state.board.map((c) => (c === 'player1' ? '1' : c === 'player2' ? '2' : '0')).join('');
  return `${cells}|${state.turn}|${state.phase}|${state.unplacedCount.player1}${state.unplacedCount.player2}|${
    state.mustRemoveOpponentStone ? 'r' : '-'
  }`;
}

function registerPosition(state: TwelveDoozState): TwelveDoozState {
  if (!DEFAULT_GAME_RULES.repetitionDraw) return state;
  const key = twelveDoozPositionKey(state);
  const count = (state.positionCounts[key] ?? 0) + 1;
  const positionCounts = { ...state.positionCounts, [key]: count };
  if (count >= 3) {
    return {
      ...state,
      positionCounts,
      winner: 'draw',
      winningReason: 'وضعیت بازی سه بار تکرار شد؛ نتیجه تساوی است',
      phase: 'gameover',
      selectedFromIndex: null,
      mustRemoveOpponentStone: false,
    };
  }
  return { ...state, positionCounts };
}

function withNoProgressDraw(state: TwelveDoozState): TwelveDoozState {
  const limit = DEFAULT_GAME_RULES.noProgressDrawLimit;
  if (!limit || state.movesSinceProgress < limit) return state;
  return {
    ...state,
    winner: 'draw',
    winningReason: `بازی بدون پیشرفت (${limit} حرکت) متوقف شد؛ نتیجه تساوی است`,
    phase: 'gameover',
    selectedFromIndex: null,
    mustRemoveOpponentStone: false,
  };
}

// Checks if a given position is part of a mill/dooz for that player
export function isPositionInMill(board: (Player | null)[], position: number): boolean {
  const player = board[position];
  if (!player) return false;

  for (const line of TWELVE_DOOZ_LINES) {
    if (line.includes(position)) {
      const [a, b, c] = line;
      if (board[a] === player && board[b] === player && board[c] === player) {
        return true;
      }
    }
  }
  return false;
}

// Check if moving to newPos completed a new mill
export function getNewMillsFormedAt(
  board: (Player | null)[],
  position: number,
  player: Player
): number[][] {
  const newlyFormed: number[][] = [];
  for (const line of TWELVE_DOOZ_LINES) {
    if (line.includes(position)) {
      const [a, b, c] = line;
      if (board[a] === player && board[b] === player && board[c] === player) {
        newlyFormed.push(line);
      }
    }
  }
  return newlyFormed;
}

// Returns list of removable opponent indices
export function getRemovableOpponentStones(
  board: (Player | null)[],
  opponent: Player
): number[] {
  const allOpponentIndices: number[] = [];
  const nonMillOpponentIndices: number[] = [];

  for (let i = 0; i < board.length; i++) {
    if (board[i] === opponent) {
      allOpponentIndices.push(i);
      if (!isPositionInMill(board, i)) {
        nonMillOpponentIndices.push(i);
      }
    }
  }

  // If all opponent pieces are in a mill, any of them can be removed
  return nonMillOpponentIndices.length > 0 ? nonMillOpponentIndices : allOpponentIndices;
}

export function getLegalTwelveDoozMoves(
  board: (Player | null)[],
  fromIndex: number,
  canFly: boolean
): number[] {
  if (fromIndex < 0 || fromIndex >= 24 || board[fromIndex] === null) return [];
  if (canFly) {
    const free: number[] = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) free.push(i);
    }
    return free;
  }
  const neighbors = TWELVE_DOOZ_ADJACENCY[fromIndex] || [];
  return neighbors.filter((idx) => board[idx] === null);
}

export function hasAnyLegalTwelveDoozMoves(
  board: (Player | null)[],
  player: Player,
  canFly: boolean
): boolean {
  for (let i = 0; i < 24; i++) {
    if (board[i] === player) {
      const valid = getLegalTwelveDoozMoves(board, i, canFly);
      if (valid.length > 0) return true;
    }
  }
  return false;
}

export function placeStoneTwelveDooz(state: TwelveDoozState, index: number): TwelveDoozState {
  if (state.phase !== 'placing' || state.winner || state.mustRemoveOpponentStone) {
    return state;
  }
  if (state.board[index] !== null) return state;

  const current = state.turn;
  if (state.unplacedCount[current] <= 0) return state;

  const nextBoard = [...state.board];
  nextBoard[index] = current;

  const nextUnplaced = {
    ...state.unplacedCount,
    [current]: state.unplacedCount[current] - 1,
  };

  const opponent: Player = current === 'player1' ? 'player2' : 'player1';
  const mills = getNewMillsFormedAt(nextBoard, index, current);

  const record: MoveRecord = {
    player: current,
    to: index,
    moveNumber: state.moveCount + 1,
    formedLines: mills,
  };

  if (mills.length > 0) {
    // Player made a Dooz! They must remove an opponent stone
    const removable = getRemovableOpponentStones(nextBoard, opponent);
    if (removable.length > 0) {
      return registerPosition({
        ...state,
        board: nextBoard,
        unplacedCount: nextUnplaced,
        mustRemoveOpponentStone: true,
        lastFormedLines: mills,
        moveCount: state.moveCount + 1,
        movesSinceProgress: 0,
        lastMove: record,
      });
    }
  }

  // Normal turn pass
  return advanceTurnAfterAction(
    { ...state, lastMove: record },
    nextBoard,
    nextUnplaced,
    opponent
  );
}

export function removeOpponentStone(state: TwelveDoozState, index: number): TwelveDoozState {
  if (!state.mustRemoveOpponentStone || state.winner) return state;
  const opponent: Player = state.turn === 'player1' ? 'player2' : 'player1';
  if (state.board[index] !== opponent) return state;

  const validRemovals = getRemovableOpponentStones(state.board, opponent);
  if (!validRemovals.includes(index)) return state;

  const nextBoard = [...state.board];
  nextBoard[index] = null;

  // Check if opponent is reduced to less than 3 pieces after placing phase
  const opponentUnplaced = state.unplacedCount[opponent];
  const opponentOnBoard = countStonesOnBoard(nextBoard, opponent);

  const record: MoveRecord = {
    player: state.turn,
    to: index,
    removedStone: index,
    moveNumber: state.moveCount + 1,
    formedLines: state.lastFormedLines,
  };

  if (opponentUnplaced === 0 && opponentOnBoard < 3) {
    // Opponent lost!
    return {
      ...state,
      board: nextBoard,
      mustRemoveOpponentStone: false,
      winner: state.turn,
      winningReason: 'مهره‌های حریف به کمتر از ۳ عدد رسید!',
      winningLine: state.lastFormedLines[0] ?? null,
      phase: 'gameover',
      lastFormedLines: [],
      moveCount: state.moveCount + 1,
      movesSinceProgress: 0,
      lastMove: record,
    };
  }

  return advanceTurnAfterAction(
    { ...state, mustRemoveOpponentStone: false, lastFormedLines: [], lastMove: record },
    nextBoard,
    state.unplacedCount,
    opponent,
    true
  );
}

export function moveStoneTwelveDooz(
  state: TwelveDoozState,
  fromIndex: number,
  toIndex: number
): TwelveDoozState {
  if ((state.phase !== 'moving' && state.phase !== 'flying') || state.winner || state.mustRemoveOpponentStone) {
    return state;
  }
  if (state.board[fromIndex] !== state.turn) return state;
  if (state.board[toIndex] !== null) return state;

  const currentStones = countStonesOnBoard(state.board, state.turn);
  const canFly = DEFAULT_GAME_RULES.flying && currentStones === 3;

  const validDests = getLegalTwelveDoozMoves(state.board, fromIndex, canFly);
  if (!validDests.includes(toIndex)) return state;

  const nextBoard = [...state.board];
  nextBoard[fromIndex] = null;
  nextBoard[toIndex] = state.turn;

  const opponent: Player = state.turn === 'player1' ? 'player2' : 'player1';
  const mills = getNewMillsFormedAt(nextBoard, toIndex, state.turn);

  const record: MoveRecord = {
    player: state.turn,
    from: fromIndex,
    to: toIndex,
    moveNumber: state.moveCount + 1,
    formedLines: mills,
  };

  if (mills.length > 0) {
    const removable = getRemovableOpponentStones(nextBoard, opponent);
    if (removable.length > 0) {
      return registerPosition({
        ...state,
        board: nextBoard,
        selectedFromIndex: null,
        mustRemoveOpponentStone: true,
        lastFormedLines: mills,
        moveCount: state.moveCount + 1,
        movesSinceProgress: 0,
        lastMove: record,
      });
    }
  }

  return advanceTurnAfterAction(
    { ...state, selectedFromIndex: null, lastMove: record },
    nextBoard,
    state.unplacedCount,
    opponent
  );
}

function advanceTurnAfterAction(
  prevState: TwelveDoozState,
  nextBoard: (Player | null)[],
  nextUnplaced: { player1: number; player2: number },
  nextTurn: Player,
  progressed = false
): TwelveDoozState {
  const isPlacingDone = nextUnplaced.player1 === 0 && nextUnplaced.player2 === 0;
  const nextStones = countStonesOnBoard(nextBoard, nextTurn);
  const nextCanFly = isPlacingDone && DEFAULT_GAME_RULES.flying && nextStones === 3;

  let nextPhase: GamePhase = 'placing';
  if (isPlacingDone) {
    nextPhase = nextCanFly ? 'flying' : 'moving';
  }

  const movesSinceProgress = progressed ? 0 : prevState.movesSinceProgress + 1;

  // Check if next player is trapped (has no legal moves) in moving/flying phase
  if (isPlacingDone) {
    const canMove = hasAnyLegalTwelveDoozMoves(nextBoard, nextTurn, nextCanFly);
    if (!canMove) {
      const winner: Player = nextTurn === 'player1' ? 'player2' : 'player1';
      return {
        ...prevState,
        board: nextBoard,
        unplacedCount: nextUnplaced,
        turn: nextTurn,
        phase: 'gameover',
        winner,
        winningReason: 'تمام راه‌های حرکت بازیکن بسته شد!',
        winningLine: null,
        selectedFromIndex: null,
        mustRemoveOpponentStone: false,
        moveCount: prevState.moveCount + 1,
        movesSinceProgress,
      };
    }
  }

  return withNoProgressDraw(
    registerPosition({
      ...prevState,
      board: nextBoard,
      unplacedCount: nextUnplaced,
      turn: nextTurn,
      phase: nextPhase,
      selectedFromIndex: null,
      mustRemoveOpponentStone: false,
      moveCount: prevState.moveCount + 1,
      movesSinceProgress,
    })
  );
}

/** انتخاب/لغو انتخاب مهره — عملیات UI و بدون تغییر نوبت */
export function selectTwelveDoozStone(state: TwelveDoozState, index: number | null): TwelveDoozState {
  if (state.winner || state.mustRemoveOpponentStone) return state;
  if (index !== null && state.board[index] !== state.turn) return state;
  const next = state.selectedFromIndex === index ? null : index;
  return { ...state, selectedFromIndex: next };
}
