import { Player, AIDifficulty } from './doozTypes';
import {
  ThreeDoozState,
  getLegalPlacements,
  getLegalMoveDestinations,
  THREE_DOOZ_WINNING_LINES,
  placeStoneThreeDooz,
  moveStoneThreeDooz,
} from './threeDoozLogic';
import {
  TwelveDoozState,
  countStonesOnBoard,
  getNewMillsFormedAt,
  getRemovableOpponentStones,
  getLegalTwelveDoozMoves,
  placeStoneTwelveDooz,
  moveStoneTwelveDooz,
  removeOpponentStone,
  TWELVE_DOOZ_LINES,
  TWELVE_DOOZ_ADJACENCY,
} from './twelveDoozLogic';

/**
 * هوش مصنوعی دوز.
 *
 * سه سطح واقعی:
 * - easy: تصادفی با کمی دقت (دوز/بلاک فوری را می‌بیند اما همیشه اجرا نمی‌کند)
 * - medium: حریص یک‌لایه + ارزیابی ساده موقعیت
 * - hard: جست‌وجوی آلفا-بتا با بودجهٔ زمانی محدود
 *
 * همهٔ محاسبات خالص و بدون side-effect هستند تا در تست قابل بازتولید باشند.
 */

export type AIMove =
  | { action: 'place'; to: number }
  | { action: 'move'; from: number; to: number }
  | { action: 'remove'; removeIndex: number };

const other = (p: Player): Player => (p === 'player1' ? 'player2' : 'player1');

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ---------------------------------------------------------------------------
// ارزیابی و جست‌وجوی دوز ۳ تایی
// ---------------------------------------------------------------------------

function evaluateThree(board: (Player | null)[], me: Player): number {
  const opp = other(me);
  let score = 0;

  for (const line of THREE_DOOZ_WINNING_LINES) {
    let mine = 0;
    let theirs = 0;
    for (const idx of line) {
      if (board[idx] === me) mine++;
      else if (board[idx] === opp) theirs++;
    }
    if (mine === 3) score += 1000;
    else if (theirs === 3) score -= 1000;
    else if (mine === 2 && theirs === 0) score += 18;
    else if (theirs === 2 && mine === 0) score -= 22;
  }

  // مرکز و گوشه‌ها ارزش بیشتری دارند
  if (board[4] === me) score += 8;
  if (board[4] === opp) score -= 8;
  for (const corner of [0, 2, 6, 8]) {
    if (board[corner] === me) score += 3;
    if (board[corner] === opp) score -= 3;
  }

  // تحرک
  let myMoves = 0;
  let oppMoves = 0;
  for (let i = 0; i < 9; i++) {
    if (board[i] === me) myMoves += getLegalMoveDestinations(board, i).length;
    else if (board[i] === opp) oppMoves += getLegalMoveDestinations(board, i).length;
  }
  score += (myMoves - oppMoves) * 0.6;

  return score;
}

function threeCandidates(state: ThreeDoozState): AIMove[] {
  const me = state.turn;
  if (state.phase === 'placing') {
    return getLegalPlacements(state.board).map((to) => ({ action: 'place', to }) as AIMove);
  }
  if (state.phase === 'moving') {
    const moves: AIMove[] = [];
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === me) {
        for (const to of getLegalMoveDestinations(state.board, i)) {
          moves.push({ action: 'move', from: i, to });
        }
      }
    }
    return moves;
  }
  return [];
}

function applyThreeMove(state: ThreeDoozState, move: AIMove): ThreeDoozState {
  if (move.action === 'place') return placeStoneThreeDooz(state, move.to);
  if (move.action === 'move') return moveStoneThreeDooz(state, move.from, move.to);
  return state;
}

function minimaxThree(
  state: ThreeDoozState,
  me: Player,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number
): number {
  if (state.winner === me) return 100000 - (10 - depth);
  if (state.winner === 'draw') return 0;
  if (state.winner) return -100000 + (10 - depth);
  if (depth <= 0 || Date.now() > deadline) return evaluateThree(state.board, me);

  const maximizing = state.turn === me;
  const candidates = threeCandidates(state);
  if (candidates.length === 0) return evaluateThree(state.board, me);

  // مرتب‌سازی سریع: برد فوری اول
  if (maximizing) {
    let best = -Infinity;
    for (const move of candidates) {
      const next = applyThreeMove(state, move);
      const value = minimaxThree(next, me, depth - 1, alpha, beta, deadline);
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  let worst = Infinity;
  for (const move of candidates) {
    const next = applyThreeMove(state, move);
    const value = minimaxThree(next, me, depth - 1, alpha, beta, deadline);
    worst = Math.min(worst, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return worst;
}

export function getThreeDoozAIMove(
  state: ThreeDoozState,
  difficulty: AIDifficulty = 'hard'
): AIMove | null {
  if (state.winner) return null;
  const me = state.turn;
  const candidates = threeCandidates(state);
  if (candidates.length === 0) return null;

  // easy: بیشتر تصادفی، اما برد فوری را نمی‌بازد
  if (difficulty === 'easy') {
    if (Math.random() < 0.55) return pickRandom(candidates);
    return pickBestThree(state, me, candidates, 1, 40);
  }

  if (difficulty === 'medium') {
    if (Math.random() < 0.18) return pickRandom(candidates);
    return pickBestThree(state, me, candidates, 3, 90);
  }

  return pickBestThree(state, me, candidates, 9, 220);
}

function pickBestThree(
  state: ThreeDoozState,
  me: Player,
  candidates: AIMove[],
  depth: number,
  budgetMs: number
): AIMove {
  const deadline = Date.now() + budgetMs;
  let bestScore = -Infinity;
  let bestMoves: AIMove[] = [];

  for (const move of candidates) {
    const next = applyThreeMove(state, move);
    const score = minimaxThree(next, me, depth - 1, -Infinity, Infinity, deadline);
    if (score > bestScore + 0.0001) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) <= 0.0001) {
      bestMoves.push(move);
    }
  }

  return bestMoves.length > 0 ? pickRandom(bestMoves) : candidates[0];
}

// ---------------------------------------------------------------------------
// ارزیابی و جست‌وجوی دوز ۱۲ تایی
// ---------------------------------------------------------------------------

function evaluateTwelve(state: TwelveDoozState, me: Player): number {
  if (state.winner === me) return 100000;
  if (state.winner === 'draw') return 0;
  if (state.winner) return -100000;

  const opp = other(me);
  const myStones = countStonesOnBoard(state.board, me);
  const oppStones = countStonesOnBoard(state.board, opp);

  let score = (myStones - oppStones) * 14;
  score += (state.unplacedCount[me] - state.unplacedCount[opp]) * 8;

  let myLines = 0;
  let oppLines = 0;
  let myTwo = 0;
  let oppTwo = 0;

  for (const line of TWELVE_DOOZ_LINES) {
    let mine = 0;
    let theirs = 0;
    let empty = 0;
    for (const idx of line) {
      if (state.board[idx] === me) mine++;
      else if (state.board[idx] === opp) theirs++;
      else empty++;
    }
    if (mine === 3) myLines++;
    else if (theirs === 3) oppLines++;
    else if (mine === 2 && empty === 1) myTwo++;
    else if (theirs === 2 && empty === 1) oppTwo++;
  }

  score += myLines * 45 - oppLines * 55;
  score += myTwo * 9 - oppTwo * 12;

  // تحرک: مهره‌های مسدود بی‌ارزش‌ترند
  let myMobility = 0;
  let oppMobility = 0;
  const canFlyMine = myStones === 3;
  const canFlyOpp = oppStones === 3;

  for (let i = 0; i < 24; i++) {
    const cell = state.board[i];
    if (!cell) continue;
    const isMine = cell === me;
    const neighbors = TWELVE_DOOZ_ADJACENCY[i] ?? [];
    const openNeighbors = neighbors.filter((n) => state.board[n] === null).length;
    if (isMine) {
      myMobility += canFlyMine ? 3 : openNeighbors;
      if (openNeighbors === 0 && !canFlyMine) score -= 4;
    } else {
      oppMobility += canFlyOpp ? 3 : openNeighbors;
      if (openNeighbors === 0 && !canFlyOpp) score += 4;
    }
  }

  score += (myMobility - oppMobility) * 0.8;

  if (myStones === 3) score += 14;
  if (oppStones === 3) score -= 14;

  return score;
}

function twelveCandidates(state: TwelveDoozState): AIMove[] {
  const me = state.turn;
  const opp = other(me);

  if (state.mustRemoveOpponentStone) {
    return getRemovableOpponentStones(state.board, opp).map(
      (removeIndex) => ({ action: 'remove', removeIndex }) as AIMove
    );
  }

  if (state.phase === 'placing') {
    const moves: AIMove[] = [];
    for (let i = 0; i < 24; i++) {
      if (state.board[i] === null) moves.push({ action: 'place', to: i });
    }
    return moves;
  }

  if (state.phase === 'moving' || state.phase === 'flying') {
    const canFly = countStonesOnBoard(state.board, me) === 3;
    const moves: AIMove[] = [];
    for (let i = 0; i < 24; i++) {
      if (state.board[i] === me) {
        for (const to of getLegalTwelveDoozMoves(state.board, i, canFly)) {
          moves.push({ action: 'move', from: i, to });
        }
      }
    }
    return moves;
  }

  return [];
}

function applyTwelveMove(state: TwelveDoozState, move: AIMove): TwelveDoozState {
  if (move.action === 'place') return placeStoneTwelveDooz(state, move.to);
  if (move.action === 'move') return moveStoneTwelveDooz(state, move.from, move.to);
  if (move.action === 'remove') return removeOpponentStone(state, move.removeIndex);
  return state;
}

function minimaxTwelve(
  state: TwelveDoozState,
  me: Player,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number
): number {
  if (state.winner) return evaluateTwelve(state, me);
  if (depth <= 0 || Date.now() > deadline) return evaluateTwelve(state, me);

  const candidates = twelveCandidates(state);
  if (candidates.length === 0) return evaluateTwelve(state, me);

  const maximizing = state.turn === me;
  if (maximizing) {
    let best = -Infinity;
    for (const move of candidates) {
      const next = applyTwelveMove(state, move);
      const value = minimaxTwelve(next, me, depth - 1, alpha, beta, deadline);
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  let worst = Infinity;
  for (const move of candidates) {
    const next = applyTwelveMove(state, move);
    const value = minimaxTwelve(next, me, depth - 1, alpha, beta, deadline);
    worst = Math.min(worst, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return worst;
}

/** گشایش‌های خوب: نقاط مرکزی و پرتحرک */
const OPENING_PRIORITY = [9, 11, 12, 14, 1, 3, 4, 6, 17, 19, 20, 22];

export function getTwelveDoozAIMove(
  state: TwelveDoozState,
  difficulty: AIDifficulty = 'hard'
): AIMove | null {
  if (state.winner) return null;
  const me = state.turn;
  const candidates = twelveCandidates(state);
  if (candidates.length === 0) return null;

  if (difficulty === 'easy') {
    // آسان: اگر دوز فوری دارد انجام می‌دهد، وگرنه بیشتر تصادفی
    if (!state.mustRemoveOpponentStone) {
      const mill = findImmediateMill(state, me, candidates);
      if (mill && Math.random() < 0.8) return mill;
    } else {
      // سوزاندن تصادفی، اما مهرهٔ در آستانهٔ دوز را نیمه‌وقت هدف می‌گیرد
      if (Math.random() < 0.5) return pickRandom(candidates);
    }
    return pickRandom(candidates);
  }

  if (difficulty === 'medium') {
    if (!state.mustRemoveOpponentStone) {
      const mill = findImmediateMill(state, me, candidates);
      if (mill) return mill;
      const block = findBlockingPlacement(state, me, candidates);
      if (block) return block;
    } else {
      const best = bestRemoval(state, me, candidates);
      if (best) return best;
    }
    if (Math.random() < 0.15) return pickRandom(candidates);
    return pickBestTwelve(state, me, candidates, 2, 90);
  }

  // hard: جست‌وجوی واقعی
  return pickBestTwelve(state, me, candidates, 3, 320);
}

function findImmediateMill(
  state: TwelveDoozState,
  me: Player,
  candidates: AIMove[]
): AIMove | null {
  for (const move of candidates) {
    if (move.action === 'remove') continue;
    const next = applyTwelveMove(state, move);
    if (next.mustRemoveOpponentStone) return move;
  }
  return null;
}

function findBlockingPlacement(
  state: TwelveDoozState,
  me: Player,
  candidates: AIMove[]
): AIMove | null {
  const opp = other(me);
  for (const move of candidates) {
    if (move.action !== 'place') continue;
    const board = [...state.board];
    board[move.to] = opp;
    if (getNewMillsFormedAt(board, move.to, opp).length > 0) return move;
  }
  // اگر بلاک مستقیم نبود، نقطهٔ گشایش خوب
  const opening = candidates.find(
    (m) => m.action === 'place' && OPENING_PRIORITY.includes(m.to)
  );
  return opening ?? null;
}

function bestRemoval(
  state: TwelveDoozState,
  me: Player,
  candidates: AIMove[]
): AIMove | null {
  const opp = other(me);
  let best: AIMove | null = null;
  let bestThreat = -1;

  for (const move of candidates) {
    if (move.action !== 'remove') continue;
    let threat = 0;
    for (const line of TWELVE_DOOZ_LINES) {
      if (!line.includes(move.removeIndex)) continue;
      const oppCount = line.filter((idx) => state.board[idx] === opp).length;
      if (oppCount === 3) threat += 25; // مهره‌ای که در دوز است
      else if (oppCount === 2) threat += 12; // در آستانهٔ دوز
      else if (oppCount === 1) threat += 3;
    }
    // مهرهٔ پرتحرک حریف ارزش سوزاندن بیشتری دارد
    threat += (TWELVE_DOOZ_ADJACENCY[move.removeIndex] ?? []).filter(
      (n) => state.board[n] === null
    ).length;
    if (threat > bestThreat) {
      bestThreat = threat;
      best = move;
    }
  }
  return best;
}

function pickBestTwelve(
  state: TwelveDoozState,
  me: Player,
  candidates: AIMove[],
  depth: number,
  budgetMs: number
): AIMove {
  const deadline = Date.now() + budgetMs;

  // مرتب‌سازی: دوز فوری، بلاک، سوزاندن مهم، بقیه
  const ordered = [...candidates].sort((a, b) => moveHeuristic(state, me, b) - moveHeuristic(state, me, a));

  let bestScore = -Infinity;
  let bestMoves: AIMove[] = [];

  for (const move of ordered) {
    const next = applyTwelveMove(state, move);
    const score = minimaxTwelve(next, me, depth - 1, -Infinity, Infinity, deadline);
    if (score > bestScore + 0.0001) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) <= 0.0001) {
      bestMoves.push(move);
    }
    if (Date.now() > deadline) break;
  }

  return bestMoves.length > 0 ? pickRandom(bestMoves) : ordered[0];
}

function moveHeuristic(state: TwelveDoozState, me: Player, move: AIMove): number {
  if (move.action === 'remove') return 50 + state.lastFormedLines.length * 10;
  const next = applyTwelveMove(state, move);
  let score = 0;
  if (next.mustRemoveOpponentStone) score += 1000;
  if (move.action === 'place' && OPENING_PRIORITY.includes(move.to)) score += 6;
  if (move.action === 'move') score += 2;
  return score;
}

/** حرکت پیشنهادی برای دکمهٔ راهنما */
export function getHintMove(
  variant: 'three_dooz' | 'twelve_dooz',
  state: ThreeDoozState | TwelveDoozState,
  difficulty: AIDifficulty = 'hard'
): AIMove | null {
  if (variant === 'three_dooz') {
    return getThreeDoozAIMove(state as ThreeDoozState, difficulty);
  }
  return getTwelveDoozAIMove(state as TwelveDoozState, difficulty);
}
