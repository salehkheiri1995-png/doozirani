import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEngineState,
  reduceEngine,
  serializeForSync,
  applySyncSnapshot,
  activeWinner,
} from './gameEngine';
import type { EngineState } from './gameEngine';

/** اعمال یک حرکت و برگرداندن engine جدید؛ اگر رد شد، تست شکست می‌خورد. */
function apply(engine: EngineState, action: Parameters<typeof reduceEngine>[1], variant: 'three_dooz' | 'twelve_dooz'): EngineState {
  const outcome = reduceEngine(engine, action, variant);
  assert.equal(outcome.applied, true, `حرکت باید اعمال شود: ${outcome.reason ?? ''}`);
  return outcome.state;
}

test('Engine: applying the same placement twice is rejected and does not mutate', () => {
  const engine = createEngineState();
  const first = reduceEngine(engine, { type: 'PLACE', index: 4 }, 'three_dooz');

  assert.equal(first.applied, true);
  assert.equal(first.state.three.board[4], 'player1');

  // تختهٔ اصلی نباید تغییر کرده باشد (state خالص است)
  assert.equal(engine.three.board[4], null);

  const second = reduceEngine(first.state, { type: 'PLACE', index: 4 }, 'three_dooz');
  assert.equal(second.applied, false);
  assert.ok(second.reason && second.reason.length > 0);
  assert.equal(second.state, first.state, 'حالت ردشده باید همان ارجاع قبلی باشد');
});

test('Engine: invalid move is rejected with a Persian reason', () => {
  const engine = createEngineState();
  // در فاز چیدن، MOVE معنا ندارد
  const outcome = reduceEngine(engine, { type: 'MOVE', from: 0, to: 1 }, 'three_dooz');
  assert.equal(outcome.applied, false);
  assert.match(outcome.reason ?? '', /[\u0600-\u06FF]/);
  assert.equal(outcome.state, engine);
});

test('Engine: Twelve-Dooz mill then REMOVE through the reducer', () => {
  let engine = createEngineState();
  // P1: 0، P2: 8، P1: 1، P2: 16، P1: 2 → دوز [0,1,2]
  for (const index of [0, 8, 1, 16, 2]) {
    engine = apply(engine, { type: 'PLACE', index }, 'twelve_dooz');
  }

  assert.equal(engine.twelve.mustRemoveOpponentStone, true);
  assert.equal(engine.twelve.turn, 'player1');

  const removed = reduceEngine(engine, { type: 'REMOVE', index: 8 }, 'twelve_dooz');
  assert.equal(removed.applied, true);
  assert.equal(removed.state.twelve.board[8], null);
  assert.equal(removed.state.twelve.mustRemoveOpponentStone, false);
  assert.equal(removed.state.twelve.turn, 'player2');
});

test('Engine: REMOVE is rejected in Three-Dooz', () => {
  const engine = createEngineState();
  const outcome = reduceEngine(engine, { type: 'REMOVE', index: 0 }, 'three_dooz');
  assert.equal(outcome.applied, false);
  assert.equal(outcome.state, engine);
});

test('Engine: serializeForSync / applySyncSnapshot round-trips the board', () => {
  let engine = createEngineState();
  for (const index of [0, 1, 2, 3, 5, 7]) {
    engine = apply(engine, { type: 'PLACE', index }, 'three_dooz');
  }
  engine = apply(engine, { type: 'MOVE', from: 2, to: 4 }, 'three_dooz');

  const snapshot = serializeForSync(engine, 'three_dooz');
  const restored = applySyncSnapshot(createEngineState(), 'three_dooz', snapshot);

  assert.ok(restored, 'اسنپ‌شات باید بازسازی شود');
  assert.deepEqual(restored!.three.board, engine.three.board);
  assert.equal(restored!.three.turn, engine.three.turn);
  assert.equal(restored!.three.phase, engine.three.phase);
  assert.equal(restored!.three.moveCount, engine.three.moveCount);
  assert.equal(restored!.three.selectedFromIndex, null);
  assert.deepEqual(restored!.three.positionCounts, engine.three.positionCounts);
});

test('Engine: applySyncSnapshot rejects a board with the wrong size', () => {
  const bad = JSON.stringify({ board: Array(7).fill(null), turn: 'player1' });
  assert.equal(applySyncSnapshot(createEngineState(), 'three_dooz', bad), null);
  assert.equal(applySyncSnapshot(createEngineState(), 'twelve_dooz', bad), null);
  assert.equal(applySyncSnapshot(createEngineState(), 'three_dooz', 'not json'), null);
});

test('Engine: Three-Dooz repetition of a position ends the hand in a draw', () => {
  let engine = createEngineState();
  // شش مهره بدون تشکیل دوز
  for (const index of [0, 1, 2, 3, 5, 7]) {
    engine = apply(engine, { type: 'PLACE', index }, 'three_dooz');
  }
  assert.equal(engine.three.phase, 'moving');
  assert.equal(engine.three.winner, null);

  // 2→4، 7→8، 4→2، 8→7 یک چرخهٔ کامل است که وضعیت را تکرار می‌کند
  const cycle: Parameters<typeof reduceEngine>[1][] = [
    { type: 'MOVE', from: 2, to: 4 },
    { type: 'MOVE', from: 7, to: 8 },
    { type: 'MOVE', from: 4, to: 2 },
    { type: 'MOVE', from: 8, to: 7 },
  ];

  let guard = 0;
  while (activeWinner(engine, 'three_dooz') === null && guard < 24) {
    engine = apply(engine, cycle[guard % cycle.length], 'three_dooz');
    guard += 1;
  }

  assert.equal(activeWinner(engine, 'three_dooz'), 'draw');
  assert.equal(engine.three.phase, 'gameover');
  assert.match(engine.three.winningReason ?? '', /تکرار/);
});
