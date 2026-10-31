import { Player, GamePhase } from './doozTypes';

export interface ThreeDoozState {
  board: (Player | null)[]; // 9 cells
  unplacedCount: { player1: number; player2: number };
  turn: Player;
  phase: GamePhase;
  winner: Player | 'draw' | null;
  winningLine: number[] | null;
  moveCount: number;
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
    moveCount: 0,
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
  return neighbors.filter(idx => board[idx] === null);
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

  // Check if this placement forms a win
  const { winner, line } = checkThreeDoozWinner(nextBoard);
  if (winner) {
    return {
      ...state,
      board: nextBoard,
      unplacedCount: nextUnplaced,
      winner,
      winningLine: line,
      phase: 'gameover',
      moveCount: state.moveCount + 1,
    };
  }

  // Next player's turn
  const nextPlayer: Player = current === 'player1' ? 'player2' : 'player1';

  // Check if placing phase is done
  const nextPhase: GamePhase =
    nextUnplaced.player1 === 0 && nextUnplaced.player2 === 0 ? 'moving' : 'placing';

  // If entering moving phase, check if next player is trapped
  let trappedWinner: Player | null = null;
  if (nextPhase === 'moving') {
    if (!hasAnyLegalMoves(nextBoard, nextPlayer)) {
      // trapped player loses
      trappedWinner = current;
    }
  }

  return {
    ...state,
    board: nextBoard,
    unplacedCount: nextUnplaced,
    turn: nextPlayer,
    phase: trappedWinner ? 'gameover' : nextPhase,
    winner: trappedWinner,
    winningLine: null,
    moveCount: state.moveCount + 1,
  };
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

  const { winner, line } = checkThreeDoozWinner(nextBoard);
  if (winner) {
    return {
      ...state,
      board: nextBoard,
      winner,
      winningLine: line,
      phase: 'gameover',
      moveCount: state.moveCount + 1,
    };
  }

  const nextPlayer: Player = state.turn === 'player1' ? 'player2' : 'player1';

  // Check if next player is trapped
  let trappedWinner: Player | null = null;
  if (!hasAnyLegalMoves(nextBoard, nextPlayer, allowFreeMove)) {
    trappedWinner = state.turn; // opponent has no moves and loses
  }

  return {
    ...state,
    board: nextBoard,
    turn: nextPlayer,
    winner: trappedWinner,
    phase: trappedWinner ? 'gameover' : 'moving',
    moveCount: state.moveCount + 1,
  };
}
