import { Player, AIDifficulty } from './doozTypes';
import {
  ThreeDoozState,
  getLegalPlacements,
  getLegalMoveDestinations,
  checkThreeDoozWinner,
} from './threeDoozLogic';
import {
  TwelveDoozState,
  countStonesOnBoard,
  getNewMillsFormedAt,
  getRemovableOpponentStones,
  getLegalTwelveDoozMoves,
  TWELVE_DOOZ_LINES,
} from './twelveDoozLogic';

// AI for Three-Dooz
export function getThreeDoozAIMove(
  state: ThreeDoozState,
  difficulty: AIDifficulty = 'hard'
): { action: 'place' | 'move'; from?: number; to: number } | null {
  const ai = state.turn;
  const human: Player = ai === 'player1' ? 'player2' : 'player1';

  if (state.phase === 'placing') {
    const legal = getLegalPlacements(state.board);
    if (legal.length === 0) return null;

    if (difficulty === 'easy' && Math.random() < 0.45) {
      const idx = legal[Math.floor(Math.random() * legal.length)];
      return { action: 'place', to: idx };
    }

    // 1. Can AI win immediately?
    for (const spot of legal) {
      const testBoard = [...state.board];
      testBoard[spot] = ai;
      if (checkThreeDoozWinner(testBoard).winner === ai) {
        return { action: 'place', to: spot };
      }
    }

    // 2. Can human win next? Block them!
    for (const spot of legal) {
      const testBoard = [...state.board];
      testBoard[spot] = human;
      if (checkThreeDoozWinner(testBoard).winner === human) {
        return { action: 'place', to: spot };
      }
    }

    // 3. Center (spot 4) is strategically superior
    if (legal.includes(4)) {
      return { action: 'place', to: 4 };
    }

    // 4. Corners (0, 2, 6, 8)
    const corners = [0, 2, 6, 8].filter(c => legal.includes(c));
    if (corners.length > 0) {
      return { action: 'place', to: corners[Math.floor(Math.random() * corners.length)] };
    }

    return { action: 'place', to: legal[0] };
  }

  if (state.phase === 'moving') {
    // Generate all legal moves: { from, to }
    const allMoves: { from: number; to: number }[] = [];
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === ai) {
        const dests = getLegalMoveDestinations(state.board, i, false);
        for (const dest of dests) {
          allMoves.push({ from: i, to: dest });
        }
      }
    }

    if (allMoves.length === 0) return null;

    if (difficulty === 'easy' && Math.random() < 0.5) {
      return { action: 'move', ...allMoves[Math.floor(Math.random() * allMoves.length)] };
    }

    // 1. Immediate win
    for (const m of allMoves) {
      const testBoard = [...state.board];
      testBoard[m.from] = null;
      testBoard[m.to] = ai;
      if (checkThreeDoozWinner(testBoard).winner === ai) {
        return { action: 'move', from: m.from, to: m.to };
      }
    }

    // 2. Block immediate human win
    // Check if human has a winning move
    const humanWinningDest: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === human) {
        const hDests = getLegalMoveDestinations(state.board, i, false);
        for (const dest of hDests) {
          const testBoard = [...state.board];
          testBoard[i] = null;
          testBoard[dest] = human;
          if (checkThreeDoozWinner(testBoard).winner === human) {
            humanWinningDest.push(dest);
          }
        }
      }
    }

    if (humanWinningDest.length > 0) {
      // Pick a move that blocks the destination
      const blockingMove = allMoves.find(m => humanWinningDest.includes(m.to));
      if (blockingMove) {
        return { action: 'move', ...blockingMove };
      }
    }

    // 3. Move towards center if available
    const centerMove = allMoves.find(m => m.to === 4);
    if (centerMove) return { action: 'move', ...centerMove };

    return { action: 'move', ...allMoves[Math.floor(Math.random() * allMoves.length)] };
  }

  return null;
}

// AI for Twelve-Dooz
export function getTwelveDoozAIMove(
  state: TwelveDoozState,
  difficulty: AIDifficulty = 'hard'
): { action: 'place' | 'move' | 'remove'; from?: number; to?: number; removeIndex?: number } | null {
  const ai = state.turn;
  const human: Player = ai === 'player1' ? 'player2' : 'player1';

  // If AI must remove an opponent stone
  if (state.mustRemoveOpponentStone) {
    const removable = getRemovableOpponentStones(state.board, human);
    if (removable.length === 0) return null;

    if (difficulty === 'easy') {
      return { action: 'remove', removeIndex: removable[Math.floor(Math.random() * removable.length)] };
    }

    // Pick stone that has highest mobility or close to forming a mill
    let bestStone = removable[0];
    let maxThreat = -1;

    for (const r of removable) {
      // see how many 2-in-a-row lines human has involving r
      let threat = 0;
      for (const line of TWELVE_DOOZ_LINES) {
        if (line.includes(r)) {
          const humanCount = line.filter((idx: number) => state.board[idx] === human).length;
          if (humanCount === 2) threat += 3;
        }
      }
      if (threat > maxThreat) {
        maxThreat = threat;
        bestStone = r;
      }
    }

    return { action: 'remove', removeIndex: bestStone };
  }

  if (state.phase === 'placing') {
    const empties: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (state.board[i] === null) empties.push(i);
    }
    if (empties.length === 0) return null;

    if (difficulty === 'easy' && Math.random() < 0.4) {
      return { action: 'place', to: empties[Math.floor(Math.random() * empties.length)] };
    }

    // 1. Can AI form a mill?
    for (const spot of empties) {
      const testBoard = [...state.board];
      testBoard[spot] = ai;
      if (getNewMillsFormedAt(testBoard, spot, ai).length > 0) {
        return { action: 'place', to: spot };
      }
    }

    // 2. Can human form a mill? Block them!
    for (const spot of empties) {
      const testBoard = [...state.board];
      testBoard[spot] = human;
      if (getNewMillsFormedAt(testBoard, spot, human).length > 0) {
        return { action: 'place', to: spot };
      }
    }

    // 3. Prefer spots with high connectivity (e.g. midpoints 9, 11, 12, 14, or corners)
    const prioritized = [9, 11, 12, 14, 1, 3, 4, 6, 17, 19, 20, 22].filter(s => empties.includes(s));
    if (prioritized.length > 0) {
      return { action: 'place', to: prioritized[Math.floor(Math.random() * prioritized.length)] };
    }

    return { action: 'place', to: empties[Math.floor(Math.random() * empties.length)] };
  }

  if (state.phase === 'moving' || state.phase === 'flying') {
    const canFly = countStonesOnBoard(state.board, ai) === 3;
    const allMoves: { from: number; to: number }[] = [];

    for (let i = 0; i < 24; i++) {
      if (state.board[i] === ai) {
        const dests = getLegalTwelveDoozMoves(state.board, i, canFly);
        for (const dest of dests) {
          allMoves.push({ from: i, to: dest });
        }
      }
    }

    if (allMoves.length === 0) return null;

    if (difficulty === 'easy' && Math.random() < 0.5) {
      const m = allMoves[Math.floor(Math.random() * allMoves.length)];
      return { action: 'move', from: m.from, to: m.to };
    }

    // 1. Move that completes a mill
    for (const m of allMoves) {
      const testBoard = [...state.board];
      testBoard[m.from] = null;
      testBoard[m.to] = ai;
      if (getNewMillsFormedAt(testBoard, m.to, ai).length > 0) {
        return { action: 'move', from: m.from, to: m.to };
      }
    }

    // 2. Move that blocks human from making a mill
    const humanCanFly = countStonesOnBoard(state.board, human) === 3;
    const humanThreats: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (state.board[i] === human) {
        const dests = getLegalTwelveDoozMoves(state.board, i, humanCanFly);
        for (const dest of dests) {
          const testBoard = [...state.board];
          testBoard[i] = null;
          testBoard[dest] = human;
          if (getNewMillsFormedAt(testBoard, dest, human).length > 0) {
            humanThreats.push(dest);
          }
        }
      }
    }

    if (humanThreats.length > 0) {
      const block = allMoves.find(m => humanThreats.includes(m.to));
      if (block) {
        return { action: 'move', from: block.from, to: block.to };
      }
    }

    return { action: 'move', ...allMoves[Math.floor(Math.random() * allMoves.length)] };
  }

  return null;
}
