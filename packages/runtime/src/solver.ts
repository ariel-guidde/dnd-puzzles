import type { Action, MechanismRuntime, PuzzleState } from './types.js';

export interface SolverConfig {
  /** Search depth ceiling (longest path considered). */
  readonly maxDepth: number;
  /** Explored-state ceiling — the escape valve against state explosion. */
  readonly maxStates: number;
}

export interface SolveResult {
  readonly solvable: boolean;
  /** Optimal (shortest) action sequence to a goal, if found. Powers the hint engine. */
  readonly shortestPath?: Action[];
  readonly exploredStates: number;
  readonly reachedDepth: number;
  /** True if search was truncated by a ceiling — result may be a false negative, never a false pass. */
  readonly hitCeiling: boolean;
}

/**
 * Breadth-first search with a visited set keyed by `hashState`. BFS guarantees the
 * shortest path, which the hint engine needs (it re-solves from the current state and
 * takes the first action). If `hitCeiling`, an unsolved result is INCONCLUSIVE, not a
 * proof of unsolvability.
 */
export function solve(
  rt: MechanismRuntime,
  init: PuzzleState,
  cfg: SolverConfig,
): SolveResult {
  const startHash = rt.hashState(init);
  if (rt.isSolved(init)) {
    return { solvable: true, shortestPath: [], exploredStates: 1, reachedDepth: 0, hitCeiling: false };
  }

  const visited = new Set<string>([startHash]);
  // Queue holds the state plus the path of actions taken to reach it.
  let frontier: Array<{ state: PuzzleState; path: Action[] }> = [{ state: init, path: [] }];
  let explored = 0;
  let reachedDepth = 0;

  while (frontier.length > 0) {
    const next: Array<{ state: PuzzleState; path: Action[] }> = [];
    for (const node of frontier) {
      if (explored >= cfg.maxStates) {
        return { solvable: false, exploredStates: explored, reachedDepth, hitCeiling: true };
      }
      explored++;

      for (const action of rt.enumerateActions(node.state)) {
        const child = rt.step(node.state, action);
        const h = rt.hashState(child);
        if (visited.has(h)) continue;
        const path = [...node.path, action];
        if (rt.isSolved(child)) {
          return {
            solvable: true,
            shortestPath: path,
            exploredStates: explored,
            reachedDepth: path.length,
            hitCeiling: false,
          };
        }
        visited.add(h);
        if (path.length < cfg.maxDepth) next.push({ state: child, path });
      }
    }
    if (next.length > 0) reachedDepth++;
    // Depth ceiling hit with unexpanded nodes still pending → inconclusive.
    if (reachedDepth >= cfg.maxDepth && next.length > 0) {
      return { solvable: false, exploredStates: explored, reachedDepth, hitCeiling: true };
    }
    frontier = next;
  }

  // Frontier fully exhausted within ceilings → genuinely unsolvable.
  return { solvable: false, exploredStates: explored, reachedDepth, hitCeiling: false };
}
