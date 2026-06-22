// Attempt mode + hint engine. Pure logic over a MechanismRuntime — no DOM, no Worker.
// The web app owns presentation; this owns the rules of playing and being hinted.

import type { Action, MechanismRuntime, PuzzleState } from './types.js';
import { solve, type SolverConfig } from './solver.js';

export interface AttemptSession {
  readonly initial: PuzzleState;
  readonly state: PuzzleState;
  readonly history: readonly Action[];
  readonly solved: boolean;
}

export function startAttempt(rt: MechanismRuntime, initial: PuzzleState): AttemptSession {
  return { initial, state: initial, history: [], solved: rt.isSolved(initial) };
}

export function applyAction(
  rt: MechanismRuntime,
  session: AttemptSession,
  action: Action,
): AttemptSession {
  const state = rt.step(session.state, action);
  return {
    initial: session.initial,
    state,
    history: [...session.history, action],
    solved: rt.isSolved(state),
  };
}

export function resetAttempt(rt: MechanismRuntime, session: AttemptSession): AttemptSession {
  return startAttempt(rt, session.initial);
}

export function undo(rt: MechanismRuntime, session: AttemptSession): AttemptSession {
  if (session.history.length === 0) return session;
  const history = session.history.slice(0, -1);
  // Replay from the initial state — robust even when step has no inverse.
  let state = session.initial;
  for (const a of history) state = rt.step(state, a);
  return { initial: session.initial, state, history, solved: rt.isSolved(state) };
}

export type Hint =
  | { readonly kind: 'solved' }
  | { readonly kind: 'move'; readonly action: Action }
  | { readonly kind: 'deadEnd'; readonly message: string }
  | { readonly kind: 'inconclusive'; readonly message: string };

/**
 * The Hint button. Re-solves from the CURRENT state (so it recovers the player even
 * after off-path moves) and returns the first action of the shortest continuation.
 * This is also the live proof of solvability: if Hint can always walk to a win, the
 * puzzle is solvable from here; if it can't, that's surfaced honestly.
 */
export function nextHint(rt: MechanismRuntime, session: AttemptSession, cfg: SolverConfig): Hint {
  if (session.solved) return { kind: 'solved' };
  const res = solve(rt, session.state, cfg);
  if (res.solvable) {
    const first = res.shortestPath?.[0];
    return first ? { kind: 'move', action: first } : { kind: 'solved' };
  }
  if (res.hitCeiling) {
    return {
      kind: 'inconclusive',
      message: 'Too large to search fully from here — solvability is unverified.',
    };
  }
  return { kind: 'deadEnd', message: 'No solution from here — undo or reset.' };
}
