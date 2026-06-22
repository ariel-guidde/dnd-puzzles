// Pure: (mechanism + state) → Scene. No DOM. The derived visuals (beams) come from the
// SAME trace the rules use (state.derived.rays), so what you see is what the solver sees.

import type { Component, PuzzleState } from '../types.js';
import type { DeclarativeMechanism } from '../declarative/types.js';
import type { RenderSpec, Scene, SceneBeam, SceneNode, ShapeBinding } from './types.js';

function resolveLabel(binding: ShapeBinding, c: Component): string | undefined {
  if (binding.label === undefined) return undefined;
  if (typeof binding.label === 'string') return binding.label;
  return String(c[binding.label.field] ?? '');
}

export function renderScene(def: DeclarativeMechanism, state: PuzzleState): Scene {
  const spec: RenderSpec | undefined = def.render;
  if (!spec) throw new Error(`Mechanism "${def.id}" has no render spec`);
  const cell = spec.layout.cell;

  const bindingByKind = new Map(spec.bindings.map((b) => [b.kind, b]));
  const interactionByKind = new Map((spec.interactions ?? []).map((i) => [i.kind, i]));

  const nodes: SceneNode[] = [];
  for (const c of Object.values(state.components)) {
    const b = bindingByKind.get(c.kind);
    if (!b) continue; // unbound kinds simply aren't drawn
    const sizeFrac = b.size ?? 0.6;
    const rotation = b.rotateByField
      ? (b.rotateByField.map[String(c[b.rotateByField.field])] ?? 0)
      : 0;
    const fill = b.colorByField
      ? (b.colorByField.map[String(c[b.colorByField.field])] ?? b.fill ?? '#888')
      : (b.fill ?? '#888');
    const inter = interactionByKind.get(c.kind);
    const action = inter ? { type: inter.emits.type, [inter.emits.param]: c.id } : undefined;

    nodes.push({
      id: c.id,
      shape: b.shape,
      cx: (c.pos.x + 0.5) * cell,
      cy: (c.pos.y + 0.5) * cell,
      size: sizeFrac * cell,
      rotation,
      fill,
      stroke: b.stroke ?? '#222',
      ...(resolveLabel(b, c) !== undefined ? { label: resolveLabel(b, c)! } : {}),
      ...(action ? { action } : {}),
    });
  }

  const beams: SceneBeam[] = [];
  if (spec.beams) {
    for (const ray of state.derived?.rays ?? []) {
      beams.push({
        points: ray.points.map((p) => ({ x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell })),
        stroke: spec.beams.stroke,
        width: spec.beams.width,
      });
    }
  }

  return { width: def.grid.w * cell, height: def.grid.h * cell, nodes, beams };
}
