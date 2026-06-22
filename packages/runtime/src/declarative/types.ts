// The declarative form of a mechanism's rules. A MechanismDefinition is DATA — this
// is the subset the P0b interpreter compiles into a MechanismRuntime. Verification
// config (P3) is a further face added later.

import type { RenderSpec } from '../render/types.js';

export type FieldType = 'enum' | 'dir' | 'bool' | 'int';

export interface FieldDef {
  readonly name: string;
  readonly type: FieldType;
  /** Allowed values for `enum`/`dir`. Order matters: `cycle` advances through it. */
  readonly values?: readonly string[];
  /** True if computed by a propagation pass. Excluded from `hashState`. */
  readonly derived?: boolean;
}

export interface ComponentTypeDef {
  readonly kind: string;
  readonly fields: readonly FieldDef[];
}

/** Matches components by kind, optionally gated by a field value and/or spatial relation. */
export interface Selector {
  readonly kind: string;
  readonly where?: { readonly field: string; readonly eq: string | number | boolean };
  /** Only match if orthogonally adjacent to some component of this kind (e.g. the blank). */
  readonly adjacentTo?: string;
}

/** Advance an enum/dir field to its next declared value (2-value ⇒ toggle). */
export interface CycleEffect {
  readonly op: 'cycle';
  /** Action param naming the component this effect mutates. */
  readonly target: string;
  readonly field: string;
}

/** Swap the position of the target with the orthogonally-adjacent component of `otherKind`. */
export interface SwapAdjacentEffect {
  readonly op: 'swapWithAdjacent';
  readonly target: string;
  readonly otherKind: string;
}

export type Effect = CycleEffect | SwapAdjacentEffect;

export interface ActionTypeDef {
  readonly type: string;
  /** One action is enumerated per component matching this selector... */
  readonly over: Selector;
  /** ...bound to this param name (e.g. `target`). */
  readonly param: string;
  readonly effect: Effect;
}

/** A named propagation kernel from the fixed library. P0b ships `ray-march`. */
export interface RayMarchSpec {
  readonly kind: 'ray-march';
  readonly emitter: { readonly kind: string; readonly dirField: string };
  readonly turnAt: {
    readonly kind: string;
    readonly field: string;
    /** value-of-field → (incoming dir → outgoing dir). */
    readonly map: Readonly<Record<string, Readonly<Record<string, string>>>>;
  };
  readonly stopAt: readonly string[];
  readonly marks: readonly MarkSpec[];
}

export interface MarkSpec {
  readonly kind: string;
  /** Derived bool field set true when the ray strikes this component. */
  readonly field: string;
  /** If set, only mark when the ray's travel dir equals this field on the component. */
  readonly whenDirEquals?: string;
}

export type PropagationSpec = RayMarchSpec;

/** A goal clause: either a field equality, or a positional "home" check — universally over `kind`. */
export type GoalClause =
  /** `field === eq` must hold for ALL components of `kind`. */
  | { readonly kind: string; readonly field: string; readonly eq: boolean }
  /** Each component of `kind` must sit at the cell named by its own (xField, yField). */
  | { readonly kind: string; readonly posEquals: { readonly xField: string; readonly yField: string } };

export interface GoalSpec {
  readonly all: readonly GoalClause[];
  /** At least one component of each named kind must exist (else the goal is vacuous). */
  readonly requireKinds?: readonly string[];
}

export interface DeclarativeMechanism {
  readonly id: string;
  readonly name: string;
  readonly grid: { readonly w: number; readonly h: number };
  readonly componentTypes: readonly ComponentTypeDef[];
  readonly actions: readonly ActionTypeDef[];
  readonly propagation: readonly PropagationSpec[];
  readonly goal: GoalSpec;
  /** The render face (FACE 2): how this mechanism is drawn and interacted with. */
  readonly render?: RenderSpec;
}
