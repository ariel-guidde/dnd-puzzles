// The render face: a FIXED generic shape alphabet, bound to component kinds by data.
// Meaning is agreed per mechanism (diamond = mirror here; something else elsewhere).
// There is no bespoke per-mechanism drawing code — only these bindings.

import type { Action } from '../types.js';

/** The whole alphabet. Add to this list, never per-mechanism. */
export type ShapeName = 'rect' | 'circle' | 'diamond' | 'triangle' | 'arrow' | 'line';

export interface RenderSpec {
  readonly layout: { readonly kind: 'grid'; readonly cell: number };
  readonly bindings: readonly ShapeBinding[];
  readonly interactions?: readonly InteractionBinding[];
  /** How traced rays (state.derived.rays) are drawn. */
  readonly beams?: { readonly stroke: string; readonly width: number };
}

export interface ShapeBinding {
  readonly kind: string;
  readonly shape: ShapeName;
  readonly fill?: string;
  readonly stroke?: string;
  /** Side length as a fraction of a cell. Default 0.6. */
  readonly size?: number;
  /** Static label, or a field whose value is shown. */
  readonly label?: string | { readonly field: string };
  /** Rotate the shape by degrees keyed off a field value. */
  readonly rotateByField?: { readonly field: string; readonly map: Readonly<Record<string, number>> };
  /** Override fill by a field value (e.g. lit true → gold). */
  readonly colorByField?: { readonly field: string; readonly map: Readonly<Record<string, string>> };
}

export interface InteractionBinding {
  readonly kind: string;
  readonly on: 'click';
  /** Clicking a component of `kind` emits `{ type, [param]: componentId }`. */
  readonly emits: { readonly type: string; readonly param: string };
}

// ── Output: a flat, framework-agnostic scene the web app turns into SVG/React. ──

export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly SceneNode[];
  readonly beams: readonly SceneBeam[];
}

export interface SceneNode {
  readonly id: string;
  readonly shape: ShapeName;
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
  readonly rotation: number;
  readonly fill: string;
  readonly stroke: string;
  readonly label?: string;
  /** If present, clicking this node should dispatch this action. */
  readonly action?: Action;
}

export interface SceneBeam {
  readonly points: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly stroke: string;
  readonly width: number;
}
