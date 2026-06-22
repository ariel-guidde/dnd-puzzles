// Core contracts for @puzzle/runtime. These SURVIVE P0a — the throwaway Mirrors
// probe exists to confirm this interface is the right one before the declarative
// interpreter (P0b) is built to satisfy it.

/** A discrete, enumerable, parameterized move. `type` names the action; the rest are params. */
export type Action = { readonly type: string } & Readonly<Record<string, unknown>>;

/** A single part of the machine at a moment. `pos` + typed-but-open state fields. */
export type Component = {
  readonly id: string;
  readonly kind: string;
  readonly pos: { readonly x: number; readonly y: number };
} & Readonly<Record<string, unknown>>;

/** A traced ray as a polyline in CELL coordinates (the same trace the rules use). */
export interface RayPath {
  readonly points: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/**
 * Full machine state. `components` is the PRIMARY (player-controlled) state and is
 * the canonical identity of a state. `derived` is a pure function of primary state
 * (e.g. traced beams, computed `lit` flags) — recomputed by `step`, never hashed.
 */
export type PuzzleState = {
  readonly components: Readonly<Record<string, Component>>;
  readonly derived?: { readonly rays?: ReadonlyArray<RayPath> } & Readonly<Record<string, unknown>>;
};

/**
 * The executable form of a mechanism's rules. The solver, verifier, hint engine and
 * attempt harness all program against THIS — never against a specific mechanism.
 */
export interface MechanismRuntime {
  /** Finite, legal moves from a state. */
  enumerateActions(state: PuzzleState): Action[];
  /** Deterministic, pure transition. Must not mutate `state`. */
  step(state: PuzzleState, action: Action): PuzzleState;
  /** The goal predicate. */
  isSolved(state: PuzzleState): boolean;
  /** Canonical key over PRIMARY state only, for visited-set dedup. */
  hashState(state: PuzzleState): string;
  /** Optional admissible distance-to-goal, enables A*. */
  heuristic?(state: PuzzleState): number;
  /** Optional symmetry reduction. */
  canonicalize?(state: PuzzleState): PuzzleState;
}
