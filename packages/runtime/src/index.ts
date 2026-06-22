export type { Action, Component, PuzzleState, MechanismRuntime, RayPath } from './types.js';
export { solve } from './solver.js';
export type { SolverConfig, SolveResult } from './solver.js';
export { compile, createEngine } from './declarative/interpreter.js';
export type { Engine } from './declarative/interpreter.js';
export type {
  DeclarativeMechanism,
  ComponentTypeDef,
  FieldDef,
  ActionTypeDef,
  PropagationSpec,
  RayMarchSpec,
  GoalSpec,
} from './declarative/types.js';
export { renderScene } from './render/scene.js';
export type {
  RenderSpec,
  ShapeBinding,
  ShapeName,
  Scene,
  SceneNode,
  SceneBeam,
} from './render/types.js';
export {
  startAttempt,
  applyAction,
  undo,
  resetAttempt,
  nextHint,
} from './attempt.js';
export type { AttemptSession, Hint } from './attempt.js';

// Example content (locked-mechanism fixtures), exported for the demo app.
export { mirrorsMechanism, mirrorsFixturePuzzle } from './fixtures/mirrors.js';
export { slidingTilesMechanism, slidingTilesFixturePuzzle } from './fixtures/slidingTiles.js';
