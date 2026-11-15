import { Player, Winner, GamePhase, MoveRecord, DEFAULT_GAME_RULES } from './doozTypes';

export interface ThreeDoozState {
  board: (Player | null)[]; // 9 cells
  unplacedCount: { player1: number; player2: number };
  turn: Player;
  phase: GamePhase;
  winner: Winner | null;
  winningLine: number[] | null;
  winningReason: string | null;
  selectedFromIndex: number | null;
  moveCount: number;
  lastFormedLines: number[][];
  positionCounts: Record<string, number>;
  movesSinceProgress: number;
  lastMove: MoveRecord | null;
}

export const THREE_DOOZ_WINNING_LINES = [
  // Horizontal
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Vertical
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonal
  [0, 4, 8],
  [2, 4, 6],
];

// Neighbors in traditional Iranian 3-Dooz
export const THREE_DOOZ_ADJACENCY: Record<number, number[]> = {
  0: [1, 3, 4],
  1: [0, 2, 4],
  2: [1, 5, 4],
  3: [0, 4, 6],
  4: [0, 1, 2, 3, 5, 6, 7, 8],
  5: [2, 4, 8],
  6: [3, 4, 7],
  7: [6, 4, 8],
  8: [5, 4, 7],
};

export function createInitialThreeDoozState(): ThreeDoozState {
  return {
    board: Array(9).fill(null),
    unplacedCount: { player1: 3, player2: 3 },
    turn: 'player1',
    phase: 'placing',
    winner: null,
    winningLine: null,
    winningReason: null,
    selectedFromIndex: null,
    moveCount: 0,
    lastFormedLines: [],
    positionCounts: {},
    movesSinceProgress: 0,
    lastMove: null,
  };
}

/** کلید یکتای وضعیت برای تشخیص تکرار (تساوی) */
export function threeDoozPositionKey(state: ThreeDoozState): string {
  const cells = state.board.map((c) => (c === 'player1' ? '1' : c === 'player2' ? '2' : '0')).join('');
  return `${cells}|${state.turn}|${state.phase}|${state.unplacedCount.player1}${state.unplacedCount.player2}`;
}

/**
 * ثبت وضعیت در نقشهٔ تکرار و تشخیص تساوی.
 * سه بار تکرار یک وضعیت (با نوبت یکسان) = تساوی.
 */
function registerPosition(state: ThreeDoozState): ThreeDoozState {
  if (!DEFAULT_GAME_RULES.repetitionDraw) return state;
  const key = threeDoozPositionKey(state);
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
    };
  }
  return { ...state, positionCounts };
}

function withNoProgressDraw(state: ThreeDoozState): ThreeDoozState {
  const limit = DEFAULT_GAME_RULES.noProgressDrawLimit;
  if (!limit || state.movesSinceProgress < limit) return state;
  return {
    ...state,
    winner: 'draw',
    winningReason: `بازی بدون پیشرفت (${limit} حرکت) متوقف شد؛ نتیجه تساوی است`,
    phase: 'gameover',
    selectedFromIndex: null,
  };
}

export function checkThreeDoozWinner(board: (Player | null)[]): { winner: Player | null; line: number[] | null } {
  for (const line of THREE_DOOZ_WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export function getLegalPlacements(board: (Player | null)[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      result.push(i);
    }
  }
  return result;
}

export function getLegalMoveDestinations(
  board: (Player | null)[],
  fromIndex: number,
  allowFreeMove = false
): number[] {
  if (fromIndex < 0 || fromIndex > 8 || board[fromIndex] === null) return [];
  if (allowFreeMove) {
    return getLegalPlacements(board);
  }
  const neighbors = THREE_DOOZ_ADJACENCY[fromIndex] || [];
  return neighbors.filter((idx) => board[idx] === null);
}

export function hasAnyLegalMoves(
  board: (Player | null)[],
  player: Player,
  allowFreeMove = false
): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[i] === player) {
      const dests = getLegalMoveDestinations(board, i, allowFreeMove);
      if (dests.length > 0) return true;
    }
  }
  return false;
}

export function placeStoneThreeDooz(state: ThreeDoozState, index: number): ThreeDoozState {
  if (state.phase !== 'placing' || state.winner || state.board[index] !== null) {
    return state;
  }
  const current = state.turn;
  if (state.unplacedCount[current] <= 0) return state;

  const nextBoard = [...state.board];
  nextBoard[index] = current;

  const nextUnplaced = {
    ...state.unplacedCount,
    [current]: state.unplacedCount[current] - 1,
  };

  const record: MoveRecord = {
    player: current,
    to: index,
    moveNumber: state.moveCount + 1,
    formedLines: [],
  };

  // Check if this placement forms a win
  const { winner, line } = checkThreeDoozWinner(nextBoard);
  if (winner) {
    return {
      ...state,
      board: nextBoard,
      unplacedCount: nextUnplaced,
      winner,
      winningLine: line,
      winningReason: 'سه مهره در یک راستا ردیف شد!',
      lastFormedLines: line ? [line] : [],
      phase: 'gameover',
      moveCount: state.moveCount + 1,
      lastMove: record,
    };
  }

  // Next player's turn
  const nextPlayer: Player = current === 'player1' ? 'player2' : 'player1';

  // Check if placing phase is done
  const nextPhase: GamePhase =
    nextUnplaced.player1 === 0 && nextUnplaced.player2 === 0 ? 'moving' : 'placing';

  // If entering moving phase, check if next player is trapped
  let trappedWinner: Winner | null = null;
  if (nextPhase === 'moving') {
    if (!hasAnyLegalMoves(nextBoard, nextPlayer)) {
      // trapped player loses
      trappedWinner = current;
    }
  }

  const candidate: ThreeDoozState = {
    ...state,
    board: nextBoard,
    unplacedCount: nextUnplaced,
    turn: nextPlayer,
    phase: trappedWinner ? 'gameover' : nextPhase,
    winner: trappedWinner,
    winningReason: trappedWinner ? 'حریف هیچ راه قانونی برای حرکت نداشت' : null,
    winningLine: null,
    lastFormedLines: [],
    selectedFromIndex: null,
    moveCount: state.moveCount + 1,
    movesSinceProgress: state.movesSinceProgress + 1,
    lastMove: record,
  };

  if (trappedWinner) return candidate;
  return withNoProgressDraw(registerPosition(candidate));
}

export function moveStoneThreeDooz(
  state: ThreeDoozState,
  fromIndex: number,
  toIndex: number,
  allowFreeMove = false
): ThreeDoozState {
  if (state.phase !== 'moving' || state.winner) return state;
  if (state.board[fromIndex] !== state.turn) return state;
  if (state.board[toIndex] !== null) return state;

  const validDests = getLegalMoveDestinations(state.board, fromIndex, allowFreeMove);
  if (!validDests.includes(toIndex)) return state;

  const nextBoard = [...state.board];
  nextBoard[fromIndex] = null;
  nextBoard[toIndex] = state.turn;

  const record: MoveRecord = {
    player: state.turn,
    from: fromIndex,
    to: toIndex,
    moveNumber: state.moveCount + 1,
    formedLines: [],
  };

  const { winner, line } = checkThreeDoozWinner(nextBoard);
  if (winner) {
    return {
      ...state,
      board: nextBoard,
      winner,
      winningLine: line,
      winningReason: 'سه مهره در یک راستا ردیف شد!',
      lastFormedLines: line ? [line] : [],
      phase: 'gameover',
      selectedFromIndex: null,
      moveCount: state.moveCount + 1,
      lastMove: record,
    };
  }

  const nextPlayer: Player = state.turn === 'player1' ? 'player2' : 'player1';

  // Check if next player is trapped
  let trappedWinner: Winner | null = null;
  if (!hasAnyLegalMoves(nextBoard, nextPlayer, allowFreeMove)) {
    trappedWinner = state.turn; // opponent has no moves and loses
  }

  const candidate: ThreeDoozState = {
    ...state,
    board: nextBoard,
    turn: nextPlayer,
    winner: trappedWinner,
    winningReason: trappedWinner ? 'حریف هیچ راه قانونی برای حرکت نداشت' : null,
    winningLine: null,
    lastFormedLines: [],
    phase: trappedWinner ? 'gameover' : 'moving',
    selectedFromIndex: null,
    moveCount: state.moveCount + 1,
    movesSinceProgress: state.movesSinceProgress + 1,
    lastMove: record,
  };

  if (trappedWinner) return candidate;
  return withNoProgressDraw(registerPosition(candidate));
}

/** انتخاب/لغو انتخاب مهره — عملیات UI و بدون تغییر نوبت */
export function selectThreeDoozStone(state: ThreeDoozState, index: number | null): ThreeDoozState {
  if (state.winner) return state;
  if (index !== null && state.board[index] !== state.turn) return state;
  const next = state.selectedFromIndex === index ? null : index;
  return { ...state, selectedFromIndex: next };
}
