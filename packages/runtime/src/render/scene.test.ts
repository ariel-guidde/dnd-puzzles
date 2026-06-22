import { describe, it, expect } from 'vitest';
import { createEngine } from '../declarative/interpreter.js';
import { mirrorsMechanism, mirrorsFixturePuzzle } from '../fixtures/mirrors.js';
import { renderScene } from './scene.js';

describe('P1 — render scene (Excalidraw shape alphabet)', () => {
  const { initialState } = createEngine(mirrorsMechanism);

  it('binds component kinds to shapes and positions them on the grid', () => {
    const scene = renderScene(mirrorsMechanism, initialState(mirrorsFixturePuzzle()));
    const cell = 72;
    expect(scene.width).toBe(5 * cell);
    expect(scene.height).toBe(5 * cell);

    const mirror = scene.nodes.find((n) => n.id === 'm1')!;
    expect(mirror.shape).toBe('diamond');
    expect(mirror.cx).toBe((2 + 0.5) * cell);
    expect(mirror.cy).toBe((2 + 0.5) * cell);
  });

  it('maps state fields to visual attributes (rotation, color)', () => {
    const init = initialState(mirrorsFixturePuzzle()); // m1 starts '\\'
    const mirror = renderScene(mirrorsMechanism, init).nodes.find((n) => n.id === 'm1')!;
    expect(mirror.rotation).toBe(-45); // '\\' → -45

    // The decoy is lit on the garden path → red; the sigil is unlit → dim.
    const decoy = renderScene(mirrorsMechanism, init).nodes.find((n) => n.id === 'd1')!;
    expect(decoy.fill).toBe('#ff6b6b');
    const sigil = renderScene(mirrorsMechanism, init).nodes.find((n) => n.id === 's1')!;
    expect(sigil.fill).toBe('#3a3a44');
  });

  it('attaches the click action to interactive parts only', () => {
    const scene = renderScene(mirrorsMechanism, initialState(mirrorsFixturePuzzle()));
    const mirror = scene.nodes.find((n) => n.id === 'm1')!;
    expect(mirror.action).toMatchObject({ type: 'rotateMirror', target: 'm1' });
    const sigil = scene.nodes.find((n) => n.id === 's1')!;
    expect(sigil.action).toBeUndefined();
  });

  it('draws the beam from the same trace the rules use', () => {
    const scene = renderScene(mirrorsMechanism, initialState(mirrorsFixturePuzzle()));
    expect(scene.beams.length).toBeGreaterThan(0);
    // Beam starts at the light source cell center.
    const first = scene.beams[0]!;
    expect(first.points[0]).toEqual({ x: (0 + 0.5) * 72, y: (2 + 0.5) * 72 });
  });
});
