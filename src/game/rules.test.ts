import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialThreeDoozState,
  placeStoneThreeDooz,
  moveStoneThreeDooz,
  checkThreeDoozWinner,
  getLegalPlacements,
} from './threeDoozLogic';
import {
  createInitialTwelveDoozState,
  placeStoneTwelveDooz,
  removeOpponentStone,
  getNewMillsFormedAt,
  getRemovableOpponentStones,
  countStonesOnBoard,
} from './twelveDoozLogic';
import { getThreeDoozAIMove, getTwelveDoozAIMove } from './aiPlayer';

test('Three-Dooz: Initial state has 3 unplaced stones each and placing phase', () => {
  const s0 = createInitialThreeDoozState();
  assert.equal(s0.turn, 'player1');
  assert.equal(s0.phase, 'placing');
  assert.equal(s0.unplacedCount.player1, 3);
  assert.equal(s0.unplacedCount.player2, 3);
  assert.equal(s0.winner, null);
  assert.equal(getLegalPlacements(s0.board).length, 9);
});

test('Three-Dooz: Win by placing 3 in a row triggers gameover', () => {
  let state = createInitialThreeDoozState();
  // P1 places at 0
  state = placeStoneThreeDooz(state, 0);
  assert.equal(state.turn, 'player2');
  // P2 places at 3
  state = placeStoneThreeDooz(state, 3);
  assert.equal(state.turn, 'player1');
  // P1 places at 1
  state = placeStoneThreeDooz(state, 1);
  // P2 places at 4
  state = placeStoneThreeDooz(state, 4);
  // P1 places at 2 -> Line [0, 1, 2] completed!
  state = placeStoneThreeDooz(state, 2);

  assert.equal(state.winner, 'player1');
  assert.equal(state.phase, 'gameover');
  assert.deepEqual(state.winningLine, [0, 1, 2]);
});

test('Three-Dooz: Transition to moving phase when all 6 stones are placed', () => {
  let state = createInitialThreeDoozState();
  state = placeStoneThreeDooz(state, 0); // P1
  state = placeStoneThreeDooz(state, 1); // P2
  state = placeStoneThreeDooz(state, 2); // P1
  state = placeStoneThreeDooz(state, 3); // P2
  state = placeStoneThreeDooz(state, 5); // P1
  state = placeStoneThreeDooz(state, 7); // P2

  assert.equal(state.unplacedCount.player1, 0);
  assert.equal(state.unplacedCount.player2, 0);
  assert.equal(state.phase, 'moving');
  assert.equal(state.turn, 'player1');

  // P1 moves from 2 to 4 (center)
  const afterMove = moveStoneThreeDooz(state, 2, 4);
  assert.equal(afterMove.board[2], null);
  assert.equal(afterMove.board[4], 'player1');
  assert.equal(afterMove.turn, 'player2');
});

test('Twelve-Dooz: Initial state has 12 stones each and 24 empty spots', () => {
  const s0 = createInitialTwelveDoozState();
  assert.equal(s0.unplacedCount.player1, 12);
  assert.equal(s0.unplacedCount.player2, 12);
  assert.equal(s0.phase, 'placing');
  assert.equal(s0.board.length, 24);
  assert.equal(s0.board.every(cell => cell === null), true);
});

test('Twelve-Dooz: Mill formation triggers mustRemoveOpponentStone', () => {
  let state = createInitialTwelveDoozState();
  // P1 at 0
  state = placeStoneTwelveDooz(state, 0);
  // P2 at 8
  state = placeStoneTwelveDooz(state, 8);
  // P1 at 1
  state = placeStoneTwelveDooz(state, 1);
  // P2 at 16
  state = placeStoneTwelveDooz(state, 16);
  // P1 at 2 -> Forms mill [0, 1, 2]!
  state = placeStoneTwelveDooz(state, 2);

  assert.equal(state.mustRemoveOpponentStone, true);
  assert.equal(state.turn, 'player1'); // Turn stays on player1 until they remove opponent stone

  // Removable stones for opponent (P2)
  const removable = getRemovableOpponentStones(state.board, 'player2');
  assert.ok(removable.includes(8));
  assert.ok(removable.includes(16));

  // P1 removes P2's stone at 8
  const afterRemoval = removeOpponentStone(state, 8);
  assert.equal(afterRemoval.board[8], null);
  assert.equal(afterRemoval.mustRemoveOpponentStone, false);
  assert.equal(afterRemoval.turn, 'player2'); // Now passes to P2
});

test('AI Player: Finds winning placement in Three-Dooz', () => {
  let state = createInitialThreeDoozState();
  state = placeStoneThreeDooz(state, 0); // P1 at 0
  state = placeStoneThreeDooz(state, 3); // P2 at 3
  state = placeStoneThreeDooz(state, 1); // P1 at 1
  state = placeStoneThreeDooz(state, 4); // P2 at 4
  // Now it's P1's turn, with stones at 0 and 1. Placing at 2 wins!
  assert.equal(state.turn, 'player1');

  const aiMove = getThreeDoozAIMove(state, 'hard');
  assert.ok(aiMove);
  assert.equal(aiMove.action, 'place');
  assert.equal(aiMove.to, 2); // 0, 1 -> 2 wins!
});
