import { describe, it, expect } from 'vitest';
import { solve } from '../solver.js';
import { createEngine } from './interpreter.js';
import { mirrorsMechanism, mirrorsFixturePuzzle } from '../fixtures/mirrors.js';

// P0b acceptance: Mirrors-as-DATA must verify and play identically to the P0a probe.
const cfg = { maxDepth: 20, maxStates: 100_000 };

describe('P0b — declarative interpreter (Mirrors as data)', () => {
  it('starts unsolved on the garden path, with the decoy lit', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const init = initialState(mirrorsFixturePuzzle());

    expect(runtime.isSolved(init)).toBe(false);
    expect(init.components['d1']!['lit']).toBe(true);
    expect(init.components['s1']!['lit']).toBe(false);
  });

  it('solver finds the known one-move solution via the interpreter', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const init = initialState(mirrorsFixturePuzzle());

    const res = solve(runtime, init, cfg);

    expect(res.solvable).toBe(true);
    expect(res.hitCeiling).toBe(false);
    expect(res.shortestPath).toHaveLength(1);
    expect(res.shortestPath?.[0]).toMatchObject({ type: 'rotateMirror', target: 'm1' });

    const end = res.shortestPath!.reduce((s, a) => runtime.step(s, a), init);
    expect(runtime.isSolved(end)).toBe(true);
    expect(end.components['s1']!['lit']).toBe(true);
    expect(end.components['d1']!['lit']).toBe(false);
  });

  it('cycle effect advances the enum (toggle for a 2-value field)', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const init = initialState(mirrorsFixturePuzzle());

    const once = runtime.step(init, { type: 'rotateMirror', target: 'm1' });
    expect(once.components['m1']!['orientation']).toBe('/');
    const twice = runtime.step(once, { type: 'rotateMirror', target: 'm1' });
    expect(twice.components['m1']!['orientation']).toBe('\\');
  });

  it('step is deterministic and does not mutate its input', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const init = initialState(mirrorsFixturePuzzle());
    const before = runtime.hashState(init);
    const action = { type: 'rotateMirror', target: 'm1' } as const;

    const a = runtime.step(init, action);
    const b = runtime.step(init, action);

    expect(runtime.hashState(a)).toBe(runtime.hashState(b));
    expect(runtime.hashState(init)).toBe(before); // input untouched
  });

  it('hashState keys on primary fields only (derived lit excluded)', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const withDerived = initialState(mirrorsFixturePuzzle());
    // Hand-build the same primary state but with lit flags flipped — hash must match.
    const flipped = {
      components: Object.fromEntries(
        Object.entries(withDerived.components).map(([id, c]) => [id, { ...c, lit: !c['lit'] }]),
      ),
    };
    expect(runtime.hashState(flipped)).toBe(runtime.hashState(withDerived));
  });

  it('only movable mirrors are enumerable (legality gate)', () => {
    const { runtime, initialState } = createEngine(mirrorsMechanism);
    const init = initialState([
      { id: 'ls', kind: 'lightSource', pos: { x: 0, y: 0 }, dir: 'E' },
      { id: 'fixed', kind: 'mirror', pos: { x: 1, y: 0 }, orientation: '/', movable: false },
      { id: 'free', kind: 'mirror', pos: { x: 2, y: 0 }, orientation: '/', movable: true },
      { id: 's1', kind: 'sigil', pos: { x: 4, y: 4 }, facing: 'S' },
    ]);
    const actions = runtime.enumerateActions(init);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: 'rotateMirror', target: 'free' });
  });
});
