// Lightwell Mirrors expressed entirely as DATA — no mechanism-specific code.
// This is what replaces the P0a probe: the same machine, now a DeclarativeMechanism
// the generic interpreter compiles. If this verifies and plays identically to the
// probe, the DSL is proven for this class.

import type { Component } from '../types.js';
import type { DeclarativeMechanism } from '../declarative/types.js';

const DIRS = ['N', 'E', 'S', 'W'] as const;

export const mirrorsMechanism: DeclarativeMechanism = {
  id: 'lightwell-mirrors',
  name: 'Lightwell Mirrors',
  grid: { w: 5, h: 5 },
  componentTypes: [
    { kind: 'lightSource', fields: [{ name: 'dir', type: 'dir', values: DIRS }] },
    {
      kind: 'mirror',
      fields: [
        { name: 'orientation', type: 'enum', values: ['/', '\\'] },
        { name: 'movable', type: 'bool' },
      ],
    },
    {
      kind: 'sigil',
      fields: [
        { name: 'facing', type: 'dir', values: DIRS },
        { name: 'lit', type: 'bool', derived: true },
      ],
    },
    { kind: 'decoy', fields: [{ name: 'lit', type: 'bool', derived: true }] },
    { kind: 'obstacle', fields: [] },
  ],
  actions: [
    {
      type: 'rotateMirror',
      over: { kind: 'mirror', where: { field: 'movable', eq: true } },
      param: 'target',
      effect: { op: 'cycle', target: 'target', field: 'orientation' },
    },
  ],
  propagation: [
    {
      kind: 'ray-march',
      emitter: { kind: 'lightSource', dirField: 'dir' },
      turnAt: {
        kind: 'mirror',
        field: 'orientation',
        map: {
          '/': { E: 'N', N: 'E', W: 'S', S: 'W' },
          '\\': { E: 'S', S: 'E', W: 'N', N: 'W' },
        },
      },
      stopAt: ['obstacle'],
      marks: [
        { kind: 'sigil', field: 'lit', whenDirEquals: 'facing' },
        { kind: 'decoy', field: 'lit' },
      ],
    },
  ],
  goal: {
    all: [
      { kind: 'sigil', field: 'lit', eq: true },
      { kind: 'decoy', field: 'lit', eq: false },
    ],
    requireKinds: ['sigil'],
  },
  // The Excalidraw model: a fixed shape alphabet, meaning agreed here by binding.
  render: {
    layout: { kind: 'grid', cell: 72 },
    beams: { stroke: '#f6c350', width: 4 },
    bindings: [
      { kind: 'lightSource', shape: 'circle', fill: '#f6c350', stroke: '#8a6d1f', label: { field: 'dir' } },
      {
        kind: 'mirror',
        shape: 'diamond',
        fill: '#cfd8e3',
        stroke: '#5b6b7d',
        size: 0.5,
        // Rotate the diamond to read as "/" vs "\".
        rotateByField: { field: 'orientation', map: { '/': 45, '\\': -45 } },
        label: { field: 'orientation' },
      },
      {
        kind: 'sigil',
        shape: 'circle',
        size: 0.5,
        stroke: '#7a6a2a',
        colorByField: { field: 'lit', map: { true: '#ffe27a', false: '#3a3a44' } },
        label: { field: 'facing' },
      },
      {
        kind: 'decoy',
        shape: 'triangle',
        size: 0.5,
        stroke: '#7d3a3a',
        colorByField: { field: 'lit', map: { true: '#ff6b6b', false: '#34343c' } },
      },
      { kind: 'obstacle', shape: 'rect', fill: '#2b2b33', stroke: '#15151a' },
    ],
    interactions: [{ kind: 'mirror', on: 'click', emits: { type: 'rotateMirror', param: 'target' } }],
  },
};

/** The same fixture puzzle the probe used: one movable mirror, a sigil, a garden-path decoy. */
export function mirrorsFixturePuzzle(): Component[] {
  return [
    { id: 'ls', kind: 'lightSource', pos: { x: 0, y: 2 }, dir: 'E' },
    { id: 'm1', kind: 'mirror', pos: { x: 2, y: 2 }, orientation: '\\', movable: true },
    { id: 's1', kind: 'sigil', pos: { x: 2, y: 0 }, facing: 'N' },
    { id: 'd1', kind: 'decoy', pos: { x: 2, y: 4 } },
  ];
}
