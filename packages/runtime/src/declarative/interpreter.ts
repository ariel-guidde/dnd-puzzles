// Compiles a declarative MechanismDefinition into a MechanismRuntime. The solver,
// verifier, hint engine and attempt harness all program against the returned runtime
// and never see this declarative form — exactly as the hand-coded probe did, but now
// generic over any mechanism the DSL can express.

import type { Action, Component, MechanismRuntime, PuzzleState, RayPath } from '../types.js';
import type { DeclarativeMechanism, RayMarchSpec, Selector } from './types.js';

const DELTA: Record<string, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

/** Internal mutable mirror of Component, used while applying effects / propagation. */
type MutComp = { id: string; kind: string; pos: { x: number; y: number }; [field: string]: unknown };

function cloneComponents(components: Readonly<Record<string, Component>>): Record<string, MutComp> {
  const out: Record<string, MutComp> = {};
  for (const [id, c] of Object.entries(components)) {
    out[id] = { ...(c as unknown as MutComp), pos: { x: c.pos.x, y: c.pos.y } };
  }
  return out;
}

function manhattan(a: { pos: { x: number; y: number } }, b: { pos: { x: number; y: number } }): number {
  return Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y);
}

function matchesSelector(c: Component, sel: Selector, all: readonly Component[]): boolean {
  if (c.kind !== sel.kind) return false;
  if (sel.where && c[sel.where.field] !== sel.where.eq) return false;
  if (sel.adjacentTo && !all.some((o) => o.kind === sel.adjacentTo && manhattan(o, c) === 1)) return false;
  return true;
}

export interface Engine {
  readonly runtime: MechanismRuntime;
  /** Build an initial PuzzleState from raw components, with derived fields populated. */
  initialState(components: Component[]): PuzzleState;
}

export function createEngine(def: DeclarativeMechanism): Engine {
  // Precompute lookups from the (immutable) definition.
  const valuesOf = new Map<string, readonly string[]>(); // `${kind}.${field}` → enum values
  const derivedFields = new Map<string, string[]>(); // kind → derived field names
  const primaryFields = new Map<string, string[]>(); // kind → non-derived field names (sorted)
  for (const ct of def.componentTypes) {
    const derived: string[] = [];
    const primary: string[] = [];
    for (const f of ct.fields) {
      if (f.values) valuesOf.set(`${ct.kind}.${f.name}`, f.values);
      (f.derived ? derived : primary).push(f.name);
    }
    derivedFields.set(ct.kind, derived);
    primaryFields.set(ct.kind, primary.sort());
  }
  const actionsByType = new Map(def.actions.map((a) => [a.type, a]));
  const inBounds = (x: number, y: number) => x >= 0 && x < def.grid.w && y >= 0 && y < def.grid.h;

  function rayMarch(spec: RayMarchSpec, work: Record<string, MutComp>, rays: RayPath[]): void {
    const at = new Map<string, MutComp>();
    for (const c of Object.values(work)) at.set(`${c.pos.x},${c.pos.y}`, c);

    for (const src of Object.values(work)) {
      if (src.kind !== spec.emitter.kind) continue;
      let dir = String(src[spec.emitter.dirField]);
      let { x, y } = src.pos;
      // The drawn path is the same trace the rules use: emitter cell, then each cell entered.
      const points: Array<{ x: number; y: number }> = [{ x, y }];
      const seen = new Set<string>();
      for (;;) {
        const d = DELTA[dir];
        if (!d) break;
        x += d.x;
        y += d.y;
        if (!inBounds(x, y)) {
          points.push({ x, y }); // run the beam to the wall it exits through
          break;
        }
        const key = `${x},${y}:${dir}`;
        if (seen.has(key)) break; // loop guard over (cell, dir)
        seen.add(key);
        points.push({ x, y });
        const here = at.get(`${x},${y}`);
        if (!here) continue;
        if (spec.stopAt.includes(here.kind)) break;
        if (here.kind === spec.turnAt.kind) {
          const next = spec.turnAt.map[String(here[spec.turnAt.field])]?.[dir];
          if (next) dir = next;
          continue;
        }
        for (const mark of spec.marks) {
          if (mark.kind !== here.kind) continue;
          if (mark.whenDirEquals === undefined || here[mark.whenDirEquals] === dir) {
            here[mark.field] = true;
          }
        }
      }
      rays.push({ points });
    }
  }

  /** Recompute every derived field from primary state (pure over `work`). Also returns ray paths. */
  function derive(work: Record<string, MutComp>): { components: Record<string, MutComp>; rays: RayPath[] } {
    for (const c of Object.values(work)) {
      for (const f of derivedFields.get(c.kind) ?? []) c[f] = false;
    }
    const rays: RayPath[] = [];
    for (const pass of def.propagation) {
      if (pass.kind === 'ray-march') rayMarch(pass, work, rays);
    }
    return { components: work, rays };
  }

  const asState = (derived: { components: Record<string, MutComp>; rays: RayPath[] }): PuzzleState => ({
    components: derived.components as unknown as Record<string, Component>,
    derived: { rays: derived.rays },
  });

  const runtime: MechanismRuntime = {
    enumerateActions(state: PuzzleState): Action[] {
      const all = Object.values(state.components);
      const actions: Action[] = [];
      for (const a of def.actions) {
        for (const c of all) {
          if (matchesSelector(c, a.over, all)) actions.push({ type: a.type, [a.param]: c.id });
        }
      }
      return actions;
    },

    step(state: PuzzleState, action: Action): PuzzleState {
      const a = actionsByType.get(action.type);
      if (!a) return state;
      const work = cloneComponents(state.components);
      const target = work[action[a.param] as string];
      if (target && a.effect.op === 'cycle') {
        const values = valuesOf.get(`${target.kind}.${a.effect.field}`);
        if (values && values.length > 0) {
          const i = values.indexOf(String(target[a.effect.field]));
          target[a.effect.field] = values[(i + 1) % values.length];
        }
      } else if (target && a.effect.op === 'swapWithAdjacent') {
        const otherKind = a.effect.otherKind;
        const other = Object.values(work).find((o) => o.kind === otherKind && manhattan(o, target) === 1);
        if (other) {
          const tp = target.pos;
          target.pos = { x: other.pos.x, y: other.pos.y };
          other.pos = { x: tp.x, y: tp.y };
        }
      }
      return asState(derive(work));
    },

    isSolved(state: PuzzleState): boolean {
      const all = Object.values(state.components);
      for (const clause of def.goal.all) {
        for (const c of all) {
          if (c.kind !== clause.kind) continue;
          if ('posEquals' in clause) {
            if (c.pos.x !== c[clause.posEquals.xField] || c.pos.y !== c[clause.posEquals.yField]) {
              return false;
            }
          } else if (c[clause.field] !== clause.eq) {
            return false;
          }
        }
      }
      for (const k of def.goal.requireKinds ?? []) {
        if (!all.some((c) => c.kind === k)) return false;
      }
      return true;
    },

    // Canonical key over PRIMARY fields only (derived excluded), components sorted by id.
    hashState(state: PuzzleState): string {
      const parts: string[] = [];
      for (const id of Object.keys(state.components).sort()) {
        const c = state.components[id]!;
        const fieldStr = (primaryFields.get(c.kind) ?? [])
          .map((f) => `${f}=${String(c[f])}`)
          .join(',');
        parts.push(`${id}@${c.pos.x},${c.pos.y}:${fieldStr}`);
      }
      return parts.join('|');
    },
  };

  return {
    runtime,
    initialState(components: Component[]): PuzzleState {
      const work: Record<string, MutComp> = {};
      for (const c of components) {
        work[c.id] = { ...(c as unknown as MutComp), pos: { x: c.pos.x, y: c.pos.y } };
      }
      return asState(derive(work));
    },
  };
}

/** Convenience: compile straight to a runtime when you don't need `initialState`. */
export function compile(def: DeclarativeMechanism): MechanismRuntime {
  return createEngine(def).runtime;
}
