# Lockwright — handoff for the next agent

Read this first, then `docs/PLAN.md` (locked decisions + phase plan). This file is the
cold-start: what exists, how to run it, what's true, and what to do next.

## TL;DR

A two-tier tabletop-puzzle authoring tool. **Mechanisms are pure DATA** (a
`DeclarativeMechanism`), compiled by one generic interpreter into a `MechanismRuntime`
that the solver / hint / renderer / (future) verifier all consume. **P0–P2 are done and
pushed** (commit `3d4b359` on `main`). Two mechanisms exist as data — Lightwell Mirrors
and Sliding Tiles — and both draw, play, and hint through the same engine and the same
renderer, with **zero mechanism-specific code** anywhere.

## Run it

```bash
pnpm install
pnpm -r test                      # 21 tests, all green
pnpm --filter web dev             # play surface at http://localhost:5173 (or --port 5174)
pnpm --filter @puzzle/runtime typecheck
pnpm --filter web build           # bundler smoke test
```

Node 22, pnpm 11, TypeScript strict. Vitest runs the runtime in Node identically to the
browser (the runtime is DOM-free by design).

## Where things live

```
packages/runtime/src               # the crown jewel — pure, DOM/Node-free
  types.ts                         # MechanismRuntime contract, PuzzleState, Action, RayPath
  solver.ts                        # BFS, shortest path, honest hitCeiling (escape valve)
  attempt.ts                       # AttemptSession + applyAction/undo/reset + nextHint
  declarative/types.ts             # the DSL schema (this is the surface authors/LLM target)
  declarative/interpreter.ts       # createEngine(def) → { runtime, initialState }
  render/types.ts                  # shape alphabet (RenderSpec) + Scene output types
  render/scene.ts                  # renderScene(def, state) → Scene  (pure, no SVG)
  fixtures/mirrors.ts              # Lightwell Mirrors as DATA
  fixtures/slidingTiles.ts         # Sliding Tiles as DATA
apps/web/src
  PuzzleSvg.tsx                    # the ONLY SVG renderer; mechanism-agnostic (Scene → SVG)
  App.tsx                          # selector + play surface (Hint/Undo/Reset)
docs/PLAN.md                       # locked decisions + phase plan + risks
```

## The contract everything programs against

`MechanismRuntime` (in `types.ts`): `enumerateActions`, `step` (pure/deterministic),
`isSolved`, `hashState`, optional `heuristic`/`canonicalize`. Nothing — solver, hint,
verifier, attempt — should ever reference a specific mechanism. Program against this.

## DSL surface as it stands (what the interpreter can express today)

- **Component types** with typed fields; mark a field `derived: true` (computed by
  propagation, excluded from `hashState`).
- **Effects**: `cycle` (advance an enum field; 2 values ⇒ toggle) · `swapWithAdjacent`
  (swap a component's `pos` with the orthogonally-adjacent component of a given kind).
- **Action legality / enumeration** via `Selector`: `where` (field == constant) and
  `adjacentTo: kind` (orthogonally adjacent to some component of that kind).
- **Propagation** (fixed library; one kernel so far): `ray-march` — emitter + turn map +
  stopAt + marks, with built-in loop detection over (cell, dir). Optional (Sliding Tiles
  has none).
- **Goal clauses** (universal over a kind): `field == bool`, or `posEquals {xField,yField}`
  (component sits at its own "home" cell). Plus `requireKinds`.
- **Render face**: fixed shape alphabet (`rect|circle|diamond|triangle|arrow|line`) bound
  per kind, with `colorByField` / `rotateByField` / `label`; `interactions` map a click to
  an action; `beams` draws `state.derived.rays`.

To add a new mechanism: write a `DeclarativeMechanism` (see the two fixtures), export it
from `src/index.ts`, add it to `DEMOS` in `apps/web/src/App.tsx`. **No engine code.** If it
can't be expressed, that's the signal to add a *generic* primitive (a new effect op, a new
propagation kernel, a new goal clause) — never a mechanism-specific branch.

## Invariants that must not regress (verified by tests)

- `step` is **pure & deterministic** — same input twice ⇒ same `hashState`; input untouched.
- `hashState` keys on **primary fields + pos only**; derived fields never enter it.
- Derived state is a **pure function of primary** (recomputed every `step`).
- `nextHint` **re-solves from the current state** — recovers off-path play; returns
  `deadEnd` (unsolvable) or `inconclusive` (hit ceiling) honestly, never a false win.

## Locked decisions (don't relitigate without the user — see PLAN.md §"Locked decisions")

1. Mechanisms are data; **no LLM-generated-code escape hatch** in v1.
2. Render = fixed shape alphabet + bindings; **visuals are filler**, no art editor.
3. Declarative interpreter is **P0-critical** (not deferred).
4. **Client-first**; the only server v1 needs is a thin Anthropic key-proxy (P6).
5. Verification: **solvable + inconclusive are hard gates**; aha-forced / garden-path are
   **advisory** (author confirms). Strict uniqueness is not a v1 requirement.

## Next work — P3, the verifier

This is the product's core promise ("a puzzle you can trust"). All against
`MechanismRuntime`, all client-side (the verifier lives in `@puzzle/runtime`).

1. **`verify(runtime, init, cfg) → VerifyReport`** in `packages/runtime/src/verifier.ts`.
   - **solvable** (hard) — wrap `solve`.
   - **inconclusive** (hard) — if `solve` hit a ceiling, never auto-pass.
   - **difficulty metrics** — solutionLength, exploredStates, forced vs choice steps.
   - **aha-forced** (advisory) — given an `ahaStepPredicate`, remove matching actions from
     `enumerateActions` and re-solve; if unsolvable, the aha is load-bearing.
   - **garden-path-fails** (advisory) — constrain the first move to the "obvious" one;
     assert it can't reach the goal.
2. Surface a verify badge in the web app (verified / unverified / inconclusive).
3. Tests: a deliberately unsolvable puzzle is rejected; an aha-decorative puzzle fails
   `ahaForced` (advisory) — see `docs/PLAN.md` P3 acceptance.

After P3: P4 persistence (IndexedDB + immutable version snapshots + JSON export/import),
P5 authoring UI, P6 the LLM draft→verify→repair loop behind a thin proxy.

## Conventions observed this session

- ESM throughout; imports use `.js` extensions (TS `Bundler` resolution). `import type` for
  types (`verbatimModuleSyntax`). Strict + `noUncheckedIndexedAccess` + `exactOptionalProps`.
- Keep all rules/solve/verify/render-scene logic **pure and in `@puzzle/runtime`**; only
  SVG/React/DOM belongs in `apps/web`.
- Run `pnpm -r test` and both typechecks before claiming done.
