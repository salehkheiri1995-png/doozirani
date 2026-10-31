import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createMatchState,
  currentTurn,
  isMatchState,
  type MatchCommand,
  type MatchState,
} from './match';
import { placeStoneThreeDooz } from './threeDoozLogic';
import { placeStoneTwelveDooz } from './twelveDoozLogic';

function play(state: MatchState, command: MatchCommand, actor: 'player1' | 'player2') {
  const result = applyCommand(state, command, actor);
  if (!result.ok) throw new Error(`${result.code}: ${result.messageFa}`);
  return result;
}

function setupThreeMoving(): MatchState {
  let match = createMatchState('three_dooz', 'test-three');
  const placements: Array<[number, 'player1' | 'player2']> = [
    [0, 'player1'],
    [1, 'player2'],
    [2, 'player1'],
    [3, 'player2'],
    [5, 'player1'],
    [7, 'player2'],
  ];
  for (const [index, actor] of placements) {
    match = play(match, { type: 'PLACE', index }, actor).state;
  }
  expect(match.three.phase).toBe('moving');
  expect(currentTurn(match)).toBe('player1');
  return match;
}

describe('match command layer', () => {
  it('creates a clean match with an empty board and version 0', () => {
    const match = createMatchState('three_dooz', 'm1');
    expect(match.version).toBe(0);
    expect(match.winner).toBeNull();
    expect(match.three.board.every((cell) => cell === null)).toBe(true);
    expect(match.twelve.board).toHaveLength(24);
    expect(currentTurn(match)).toBe('player1');
  });

  it('applies one placement once and increments version exactly once', () => {
    const match = createMatchState('three_dooz', 'm1');
    const result = play(match, { type: 'PLACE', index: 4 }, 'player1');
    expect(result.state.version).toBe(1);
    expect(result.state.three.board[4]).toBe('player1');
    expect(result.state.three.moveCount).toBe(1);
    expect(currentTurn(result.state)).toBe('player2');
    expect(result.events.map((event) => event.type)).toContain('stone_placed');
  });

  it('rejects a move made out of turn without changing state or version', () => {
    const match = createMatchState('three_dooz', 'm1');
    const result = applyCommand(match, { type: 'PLACE', index: 4 }, 'player2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_your_turn');
    expect(match.version).toBe(0);
    expect(match.three.board[4]).toBeNull();
  });

  it('rejects non-integer, negative and out-of-range indices', () => {
    const match = createMatchState('three_dooz', 'm1');
    for (const index of [-1, 9, 1.5, NaN, Infinity]) {
      const result = applyCommand(match, { type: 'PLACE', index }, 'player1');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('invalid_index');
    }
  });

  it('rejects malformed commands without crashing', () => {
    const match = createMatchState('three_dooz', 'm1');
    const result = applyCommand(match, { type: 'NOPE' } as unknown as MatchCommand, 'player1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unknown_command');
    expect(match.version).toBe(0);
  });

  it('treats a move as one atomic command, not two clicks', () => {
    const match = setupThreeMoving();
    const result = play(match, { type: 'MOVE', from: 2, to: 4 }, 'player1');
    expect(result.state.version).toBe(match.version + 1);
    expect(result.state.three.board[2]).toBeNull();
    expect(result.state.three.board[4]).toBe('player1');
    expect(result.state.three.moveCount).toBe(7);
    expect(result.events).toContainEqual({
      type: 'stone_moved',
      player: 'player1',
      from: 2,
      to: 4,
    });
  });

  it('rejects moving an opponent stone or into an occupied cell', () => {
    const match = setupThreeMoving();
    const opponent = applyCommand(match, { type: 'MOVE', from: 1, to: 4 }, 'player1');
    expect(opponent.ok).toBe(false);
    if (!opponent.ok) expect(opponent.code).toBe('illegal_move');
    const occupied = applyCommand(match, { type: 'MOVE', from: 2, to: 0 }, 'player1');
    expect(occupied.ok).toBe(false);
    if (!occupied.ok) expect(occupied.code).toBe('illegal_move');
    expect(match.version).toBe(6);
  });

  it('ends a match once and refuses further commands', () => {
    const match = createMatchState('three_dooz', 'm1');
    const result = play(match, { type: 'PLACE', index: 0 }, 'player1');
    void result;
    // Directly construct the winning sequence through commands:
    let state = match;
    const sequence: Array<[number, 'player1' | 'player2']> = [
      [0, 'player1'],
      [3, 'player2'],
      [1, 'player1'],
      [4, 'player2'],
      [2, 'player1'],
    ];
    let ended = 0;
    for (const [index, actor] of sequence) {
      const step = play(state, { type: 'PLACE', index }, actor);
      ended += step.events.filter((event) => event.type === 'match_ended').length;
      state = step.state;
    }
    expect(state.winner).toBe('player1');
    expect(ended).toBe(1);
    const after = applyCommand(state, { type: 'PLACE', index: 8 }, 'player2');
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.code).toBe('match_finished');
    expect(state.version).toBe(5);
  });

  it('supports resign as an explicit ending command', () => {
    const match = createMatchState('twelve_dooz', 'm2');
    const result = play(match, { type: 'RESIGN' }, 'player2');
    expect(result.state.winner).toBe('player1');
    expect(result.state.endingReason).toContain('استعفا');
    expect(result.events).toContainEqual({
      type: 'match_ended',
      winner: 'player1',
      reason: result.state.endingReason,
    });
  });

  it('removal is a separate, validated command in twelve-dooz', () => {
    let match = createMatchState('twelve_dooz', 'm3');
    const sequence: Array<[number, 'player1' | 'player2']> = [
      [0, 'player1'],
      [8, 'player2'],
      [1, 'player1'],
      [16, 'player2'],
      [2, 'player1'],
    ];
    for (const [index, actor] of sequence) {
      match = play(match, { type: 'PLACE', index }, actor).state;
    }
    expect(match.twelve.mustRemoveOpponentStone).toBe(true);
    const wrong = applyCommand(match, { type: 'PLACE', index: 3 }, 'player1');
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.code).toBe('nothing_to_remove');
    const remove = play(match, { type: 'REMOVE', index: 8 }, 'player1');
    expect(remove.state.twelve.board[8]).toBeNull();
    expect(remove.state.twelve.mustRemoveOpponentStone).toBe(false);
    expect(currentTurn(remove.state)).toBe('player2');
  });

  it('declares a draw after the same position repeats three times', () => {
    let match = setupThreeMoving();
    const cycle: Array<[MatchCommand, 'player1' | 'player2']> = [
      [{ type: 'MOVE', from: 2, to: 4 }, 'player1'],
      [{ type: 'MOVE', from: 7, to: 8 }, 'player2'],
      [{ type: 'MOVE', from: 4, to: 2 }, 'player1'],
      [{ type: 'MOVE', from: 8, to: 7 }, 'player2'],
    ];
    // The initial position is occurrence 1; two full cycles make it occurrence 3.
    for (let round = 0; round < 2; round += 1) {
      for (const [command, actor] of cycle) {
        const result = applyCommand(match, command, actor);
        expect(result.ok).toBe(true);
        if (result.ok) match = result.state;
      }
    }
    expect(match.winner).toBe('draw');
    expect(match.endingReason).toContain('تکرار سه‌باره');
  });

  it('keeps the legacy logic helpers in sync with command validation', () => {
    const initial = createMatchState('three_dooz', 'm4');
    const direct = placeStoneThreeDooz(initial.three, 4);
    expect(direct.board[4]).toBe('player1');

    const twelve = createMatchState('twelve_dooz', 'm5');
    const directTwelve = placeStoneTwelveDooz(twelve.twelve, 0);
    expect(directTwelve.board[0]).toBe('player1');
  });

  it('validates untrusted snapshots before use', () => {
    const match = createMatchState('twelve_dooz', 'm6');
    expect(isMatchState(match)).toBe(true);
    expect(isMatchState({ ...match, three: { board: [1, 2, 3] } })).toBe(false);
    expect(isMatchState({ ...match, version: -1 })).toBe(false);
    expect(isMatchState(null)).toBe(false);
    expect(isMatchState('snapshot')).toBe(false);
  });
});
