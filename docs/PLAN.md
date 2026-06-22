# Lockwright — implementation plan (data-first revision)

Status: agreed 2026-06-22. This is the source of truth for build order and locked decisions.
It revises the original tech design (kept in `docs/tech-design.md` / PRD) where they conflict.

## The one sentence

A mechanism is **one declarative data definition** with three faces — rules, render-binding, and
verification config — and authoring, drawing, playing, verifying, and hinting are all consumers of
that one definition. The crown jewel is `@puzzle/runtime`: DOM-free TypeScript holding the rules
interpreter, solver, verifier, and hint engine, running identically in browser, Worker, and Node.

## Locked decisions

1. **Mechanisms are pure data, not code.** A `MechanismDefinition` is a declarative document. There
   is **no LLM-generated-code / module escape hatch** in v1. Rationale: only data can be authored,
   locked, version-snapshotted, LLM-drafted, persisted, and diffed through one uniform pipeline.
   Generality — "make new mechanisms through the tool" — is impossible if mechanisms are code.

2. **Render is a fixed generic shape alphabet + per-mechanism bindings (Excalidraw model).** The
   renderer ships one universal primitive set (diamond, circle, arrow, rect, line, glyph + attributes
   like rotation/color/label). A mechanism *agrees* what shapes mean by binding `componentKind →
   shape` and `stateField → attribute`. Same shape, different mechanism, different rules. Visuals are
   filler; there is **no render-spec art editor** and no bespoke per-mechanism SVG. Invest in
   component-type/rule expressiveness, not aesthetics.

3. **The declarative interpreter is P0-critical, not a P6 stretch.** The engine *is* the interpreter.

4. **A throwaway code probe precedes the interpreter.** Hand-code Lightwell Mirrors as a
   `MechanismRuntime` purely to discover the required interface + primitive vocabulary, then delete
   it. Mirrors ships only as a **data fixture**, never as engine code.

5. **Client-first; defer the backend.** Solver/verifier/hint run in-browser (Web Worker).
   Persistence = IndexedDB; backup/sharing = JSON export/import. The only server v1 ever needs is a
   **thin Anthropic key-proxy** for the LLM draft loop (P6) — the verify loop itself runs client-side
   because the verifier lives in `@puzzle/runtime`.

6. **Verification honesty over cleverness.** P0 gates are **solvable + inconclusive** (never a false
   pass). `aha-forced` and `garden-path-fails` are **advisory** signals the author confirms, not hard
   gates. Strict uniqueness is not a v1 requirement.

7. **`hashState` keys on primary (player-controlled) state only.** Derived state (beams, `lit` flags)
   is a pure function of primary state, so primary alone is a sufficient, canonical visited-set key.

8. **Determinism is enforced.** `step` is pure; the harness calls it twice on cloned input and
   asserts identical `hashState`.

## Acceptance test for the whole bet

Not "Mirrors works." It is: **after P2, author a second, unrelated (non-mirror) mechanism as data and
have it draw, play, and verify** through the same engine. Where the DSL can't express it, that gap is
the most valuable signal P0 produces — we extend the DSL, we don't patch around it.

## Build order

| Phase | Deliverable | Accept |
|---|---|---|
| **P0a** | Throwaway probe: Mirrors as a hand-coded `MechanismRuntime` (enumerate/step/isSolved/hash) + BFS solver. | Solver finds the known solution to a hand-built mirrors puzzle; determinism test passes. Discover what the DSL must support. Then delete the probe. |
| **P0b** | `MechanismDefinition` schema + **declarative interpreter** (`DeclarativeRules → MechanismRuntime`) built to the probe's proven interface. | Mirrors expressed **as data** solves to the same known solution; determinism test passes. |
| **P1** | Generic data-driven renderer `(def, state) → SVG` from the shape alphabet + bindings; interaction bindings dispatch actions. | Mirrors puzzle draws from data; clicking a part fires its action and derived visuals (beam) redraw from the same step output. |
| **P2** | Attempt mode (apply/undo/reset/win) + Hint (`nextHint`, in a Worker). | A human solves the puzzle by hand; Hint always walks to a win from any reachable state; an unsolvable state reports "no solution from here." |
| **▶ Generality test** | Author a second, non-mirror mechanism as data through the system. | It draws, plays, verifies. DSL gaps logged and closed. |
| **P3** | Verifier: solvable + inconclusive (hard); aha-forced + garden-path (advisory); difficulty metrics. | Unsolvable puzzle rejected; aha-decorative puzzle flagged (not hard-failed). |
| **P4** | Persistence (IndexedDB) + versioning (immutable `MechanismVersion` snapshots) + JSON export/import. | Author → lock → add puzzle → reload intact; unlock bumps version and flags pinned puzzles. |
| **P5** | Authoring UI: mechanism editor (rules + shape bindings) + lock validation. | A mechanism is authored, validated, and locked entirely through the UI. |
| **P6** | LLM loop: thin key-proxy + client-side generate→verify→repair, **solvable-gated first**. | Given an aha, returns a puzzle that passes the solvable gate within the retry budget, pre-filled for review. |

## Stack

- **TypeScript** end-to-end. Workspace: `packages/runtime` (pure, DOM/Node-free, heavily tested) +
  `apps/web` (React + Vite + SVG; solver in a Web Worker via Comlink).
- **Test runner:** Vitest (runs the runtime in Node identically to the browser).
- **Persistence:** IndexedDB (e.g. `idb`); export/import = plain JSON bundle.
- **LLM (P6):** Anthropic Messages API behind a thin serverless proxy; model id + prompts in config.

## Open risks to revisit

- **DSL expressiveness ceiling** — no escape hatch means an inexpressible mechanism is impossible, not
  deferred. Expect to grow the DSL at the generality test; budget for it.
- **Solver scalability in-browser** — large state spaces can jank/OOM with no server to offload to.
  Mitigations: `hashState` dedup, optional `canonicalize` (symmetry) and `heuristic` (A*), per-mechanism
  `maxStates`/`maxDepth` ceilings, honest `inconclusive` reporting.
- **LLM yield vs gates** — every quality gate lowers first-try pass rate. Ship solvable-gated first;
  measure before promising the headline metric.
