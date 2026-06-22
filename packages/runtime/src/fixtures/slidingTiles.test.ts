import { describe, it, expect } from 'vitest';
import { createEngine } from '../declarative/interpreter.js';
import { solve } from '../solver.js';
import { startAttempt, applyAction, nextHint } from '../attempt.js';
import { slidingTilesMechanism, slidingTilesFixturePuzzle } from './slidingTiles.js';

// The generality test: the SAME generic engine that runs Mirrors must run a structurally
// unrelated mechanism (movement, relational legality, positional goal) with zero new code.
const cfg = { maxDepth: 40, maxStates: 300_000 };

describe('Generality test — Sliding Tiles (data-only, new DSL primitives)', () => {
  const { runtime, initialState } = createEngine(slidingTilesMechanism);

  it('enumerates only tiles adjacent to the blank (relational legality)', () => {
    const init = initialState(slidingTilesFixturePuzzle());
    const actions = runtime.enumerateActions(init);
    // Blank starts at (0,0); its orthogonal neighbours are (1,0)=t1 and (0,1)=t4.
    const targets = actions.map((a) => a['target']).sort();
    expect(actions.every((a) => a.type === 'slide')).toBe(true);
    expect(targets).toEqual(['t1', 't4']);
  });

  it('sliding swaps the tile into the blank (movement effect)', () => {
    const init = initialState(slidingTilesFixturePuzzle());
    const after = runtime.step(init, { type: 'slide', target: 't1' });
    // t1 moves to the blank's old cell (0,0); blank takes t1's old cell (1,0).
    expect(after.components['t1']!.pos).toEqual({ x: 0, y: 0 });
    expect(after.components['blank']!.pos).toEqual({ x: 1, y: 0 });
  });

  it('starts unsolved and the solver finds a short solution (positional goal)', () => {
    const init = initialState(slidingTilesFixturePuzzle());
    expect(runtime.isSolved(init)).toBe(false);

    const res = solve(runtime, init, cfg);
    expect(res.solvable).toBe(true);
    expect(res.hitCeiling).toBe(false);
    expect(res.shortestPath!.length).toBeLessThanOrEqual(4); // 4-move scramble
    const end = res.shortestPath!.reduce((s, a) => runtime.step(s, a), init);
    expect(runtime.isSolved(end)).toBe(true);
  });

  it('hint walks the player to a win move-by-move', () => {
    let s = startAttempt(runtime, initialState(slidingTilesFixturePuzzle()));
    let guard = 0;
    while (!s.solved && guard++ < 20) {
      const h = nextHint(runtime, s, cfg);
      expect(h.kind).toBe('move');
      if (h.kind !== 'move') break;
      s = applyAction(runtime, s, h.action);
    }
    expect(s.solved).toBe(true);
  });

  it('hashState distinguishes arrangements by position', () => {
    const init = initialState(slidingTilesFixturePuzzle());
    const moved = runtime.step(init, { type: 'slide', target: 't1' });
    expect(runtime.hashState(moved)).not.toBe(runtime.hashState(init));
  });
});
