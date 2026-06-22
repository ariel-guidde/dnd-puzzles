// A 3×3 sliding-tile ("8-puzzle") mechanism, expressed entirely as DATA. Structurally
// unrelated to Mirrors: no propagation, the action MOVES a component, legality is
// relational (a tile adjacent to the blank), and the goal is positional (each tile home).
// It exercises the three DSL additions: swapWithAdjacent, adjacentTo, posEquals.

import type { Component } from '../types.js';
import type { DeclarativeMechanism } from '../declarative/types.js';

export const slidingTilesMechanism: DeclarativeMechanism = {
  id: 'sliding-tiles',
  name: 'Sliding Tiles',
  grid: { w: 3, h: 3 },
  componentTypes: [
    {
      kind: 'tile',
      fields: [
        { name: 'label', type: 'int' }, // display only
        { name: 'goalX', type: 'int' }, // home cell — constant, primary
        { name: 'goalY', type: 'int' },
      ],
    },
    { kind: 'blank', fields: [] },
  ],
  actions: [
    {
      type: 'slide',
      // A tile is slidable iff it is orthogonally adjacent to the blank.
      over: { kind: 'tile', adjacentTo: 'blank' },
      param: 'target',
      effect: { op: 'swapWithAdjacent', target: 'target', otherKind: 'blank' },
    },
  ],
  propagation: [], // none — confirms propagation is optional
  goal: {
    all: [{ kind: 'tile', posEquals: { xField: 'goalX', yField: 'goalY' } }],
  },
  render: {
    layout: { kind: 'grid', cell: 80 },
    bindings: [
      {
        kind: 'tile',
        shape: 'rect',
        fill: '#3b6e8f',
        stroke: '#10212b',
        size: 0.92,
        label: { field: 'label' },
      },
      // 'blank' is intentionally unbound → not drawn (an empty cell).
    ],
    interactions: [{ kind: 'tile', on: 'click', emits: { type: 'slide', param: 'target' } }],
  },
};

/**
 * A solvable scramble four legal slides from solved, so BFS finds a short solution fast.
 * Home arrangement is tiles 1–8 in reading order with the blank bottom-right.
 */
export function slidingTilesFixturePuzzle(): Component[] {
  // home (goal) cell for each tile id
  const home: Record<string, { x: number; y: number; label: number }> = {
    t1: { x: 0, y: 0, label: 1 },
    t2: { x: 1, y: 0, label: 2 },
    t3: { x: 2, y: 0, label: 3 },
    t4: { x: 0, y: 1, label: 4 },
    t5: { x: 1, y: 1, label: 5 },
    t6: { x: 2, y: 1, label: 6 },
    t7: { x: 0, y: 2, label: 7 },
    t8: { x: 1, y: 2, label: 8 },
  };
  // current (scrambled) positions — 4 slides from solved
  const at: Record<string, { x: number; y: number }> = {
    t1: { x: 1, y: 0 },
    t2: { x: 1, y: 1 },
    t3: { x: 2, y: 0 },
    t4: { x: 0, y: 1 },
    t5: { x: 2, y: 1 },
    t6: { x: 2, y: 2 },
    t7: { x: 0, y: 2 },
    t8: { x: 1, y: 2 },
  };
  const tiles: Component[] = Object.entries(home).map(([id, h]) => ({
    id,
    kind: 'tile',
    pos: at[id]!,
    label: h.label,
    goalX: h.x,
    goalY: h.y,
  }));
  return [...tiles, { id: 'blank', kind: 'blank', pos: { x: 0, y: 0 } }];
}
