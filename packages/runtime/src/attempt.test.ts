import { describe, it, expect } from 'vitest';
import { createEngine } from './declarative/interpreter.js';
import { mirrorsMechanism, mirrorsFixturePuzzle } from './fixtures/mirrors.js';
import { applyAction, nextHint, resetAttempt, startAttempt, undo } from './attempt.js';

const cfg = { maxDepth: 20, maxStates: 100_000 };

describe('P2 — attempt mode + hint', () => {
  const { runtime, initialState } = createEngine(mirrorsMechanism);
  const fresh = () => startAttempt(runtime, initialState(mirrorsFixturePuzzle()));

  it('starts unsolved and applying the right move wins', () => {
    let s = fresh();
    expect(s.solved).toBe(false);
    s = applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' });
    expect(s.solved).toBe(true);
    expect(s.history).toHaveLength(1);
  });

  it('hint returns the next correct move from the current state', () => {
    const s = fresh();
    const hint = nextHint(runtime, s, cfg);
    expect(hint).toMatchObject({ kind: 'move', action: { type: 'rotateMirror', target: 'm1' } });
  });

  it('hint recovers the player after an off-path move', () => {
    let s = fresh();
    // Rotating to the solution then away again — hint must route back, not give up.
    s = applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' }); // now solved
    expect(s.solved).toBe(true);
    s = applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' }); // back to wrong
    expect(s.solved).toBe(false);
    const hint = nextHint(runtime, s, cfg);
    expect(hint.kind).toBe('move');
  });

  it('hint reports "solved" once the goal is reached', () => {
    let s = fresh();
    s = applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' });
    expect(nextHint(runtime, s, cfg)).toEqual({ kind: 'solved' });
  });

  it('undo and reset return to prior / initial state', () => {
    let s = fresh();
    const h0 = runtime.hashState(s.state);
    s = applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' });
    expect(runtime.hashState(s.state)).not.toBe(h0);

    const undone = undo(runtime, s);
    expect(runtime.hashState(undone.state)).toBe(h0);
    expect(undone.history).toHaveLength(0);

    const reset = resetAttempt(runtime, applyAction(runtime, s, { type: 'rotateMirror', target: 'm1' }));
    expect(runtime.hashState(reset.state)).toBe(h0);
  });

  it('reports a dead end when no solution exists from here', () => {
    // A puzzle with no movable mirror and the sigil unreachable: unsolvable, not inconclusive.
    const init = initialState([
      { id: 'ls', kind: 'lightSource', pos: { x: 0, y: 0 }, dir: 'E' },
      { id: 'wall', kind: 'obstacle', pos: { x: 1, y: 0 } },
      { id: 's1', kind: 'sigil', pos: { x: 4, y: 4 }, facing: 'S' },
    ]);
    const s = startAttempt(runtime, init);
    expect(nextHint(runtime, s, cfg).kind).toBe('deadEnd');
  });
});
