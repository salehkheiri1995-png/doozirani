import { Player, GamePhase } from './doozTypes';

export interface TwelveDoozState {
  board: (Player | null)[]; // 24 spots
  unplacedCount: { player1: number; player2: number };
  turn: Player;
  phase: GamePhase;
  mustRemoveOpponentStone: boolean;
  selectedFromIndex: number | null;
  winner: Player | null;
  winningReason: string | null;
  lastFormedLines: number[][];
  moveCount: number;
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
    lastFormedLines: [],
    moveCount: 0,
  };
}

export function countStonesOnBoard(board: (Player | null)[], player: Player): number {
  let count = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === player) count++;
  }
  return count;
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
  return neighbors.filter(idx => board[idx] === null);
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

  if (mills.length > 0) {
    // Player made a Dooz! They must remove an opponent stone
    const removable = getRemovableOpponentStones(nextBoard, opponent);
    if (removable.length > 0) {
      return {
        ...state,
        board: nextBoard,
        unplacedCount: nextUnplaced,
        mustRemoveOpponentStone: true,
        lastFormedLines: mills,
        moveCount: state.moveCount + 1,
      };
    }
  }

  // Normal turn pass
  return advanceTurnAfterAction(state, nextBoard, nextUnplaced, opponent);
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

  if (opponentUnplaced === 0 && opponentOnBoard < 3) {
    // Opponent lost!
    return {
      ...state,
      board: nextBoard,
      mustRemoveOpponentStone: false,
      winner: state.turn,
      winningReason: 'مهره‌های حریف به کمتر از ۳ عدد رسید!',
      phase: 'gameover',
      lastFormedLines: [],
    };
  }

  return advanceTurnAfterAction(
    { ...state, mustRemoveOpponentStone: false, lastFormedLines: [] },
    nextBoard,
    state.unplacedCount,
    opponent
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
  const canFly = currentStones === 3;

  const validDests = getLegalTwelveDoozMoves(state.board, fromIndex, canFly);
  if (!validDests.includes(toIndex)) return state;

  const nextBoard = [...state.board];
  nextBoard[fromIndex] = null;
  nextBoard[toIndex] = state.turn;

  const opponent: Player = state.turn === 'player1' ? 'player2' : 'player1';
  const mills = getNewMillsFormedAt(nextBoard, toIndex, state.turn);

  if (mills.length > 0) {
    const removable = getRemovableOpponentStones(nextBoard, opponent);
    if (removable.length > 0) {
      return {
        ...state,
        board: nextBoard,
        selectedFromIndex: null,
        mustRemoveOpponentStone: true,
        lastFormedLines: mills,
        moveCount: state.moveCount + 1,
      };
    }
  }

  return advanceTurnAfterAction(
    { ...state, selectedFromIndex: null },
    nextBoard,
    state.unplacedCount,
    opponent
  );
}

function advanceTurnAfterAction(
  prevState: TwelveDoozState,
  nextBoard: (Player | null)[],
  nextUnplaced: { player1: number; player2: number },
  nextTurn: Player
): TwelveDoozState {
  const isPlacingDone = nextUnplaced.player1 === 0 && nextUnplaced.player2 === 0;
  const nextStones = countStonesOnBoard(nextBoard, nextTurn);
  const nextCanFly = isPlacingDone && nextStones === 3;

  let nextPhase: GamePhase = 'placing';
  if (isPlacingDone) {
    nextPhase = nextCanFly ? 'flying' : 'moving';
  }

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
        selectedFromIndex: null,
        mustRemoveOpponentStone: false,
        moveCount: prevState.moveCount + 1,
      };
    }
  }

  return {
    ...prevState,
    board: nextBoard,
    unplacedCount: nextUnplaced,
    turn: nextTurn,
    phase: nextPhase,
    selectedFromIndex: null,
    mustRemoveOpponentStone: false,
    moveCount: prevState.moveCount + 1,
  };
}
