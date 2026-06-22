import { useMemo, useState } from 'react';
import {
  applyAction,
  createEngine,
  nextHint,
  renderScene,
  resetAttempt,
  startAttempt,
  undo,
  mirrorsMechanism,
  mirrorsFixturePuzzle,
  slidingTilesMechanism,
  slidingTilesFixturePuzzle,
  type Action,
  type AttemptSession,
  type Component,
  type DeclarativeMechanism,
  type Hint,
} from '@puzzle/runtime';
import { PuzzleSvg } from './PuzzleSvg.js';

const SOLVER_CFG = { maxDepth: 40, maxStates: 300_000 };

interface Demo {
  id: string;
  mechanism: DeclarativeMechanism;
  makePuzzle: () => Component[];
  blurb: string;
}

const DEMOS: Demo[] = [
  {
    id: 'mirrors',
    mechanism: mirrorsMechanism,
    makePuzzle: mirrorsFixturePuzzle,
    blurb:
      'Click a diamond (mirror) to rotate it. Wake the sigil (gold), leave the decoy (red) dark. The amber beam is the same trace the solver sees.',
  },
  {
    id: 'tiles',
    mechanism: slidingTilesMechanism,
    makePuzzle: slidingTilesFixturePuzzle,
    blurb: 'Click a tile next to the gap to slide it. Get the tiles into reading order (1–8).',
  },
];

function sameAction(a: Action, b: Action): boolean {
  const ak = Object.keys(a);
  return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
}

function Play({ demo }: { demo: Demo }): JSX.Element {
  const { runtime, initialState } = useMemo(() => createEngine(demo.mechanism), [demo]);
  const init = useMemo(() => initialState(demo.makePuzzle()), [initialState, demo]);

  const [session, setSession] = useState<AttemptSession>(() => startAttempt(runtime, init));
  const [hint, setHint] = useState<Hint | null>(null);

  const scene = renderScene(demo.mechanism, session.state);
  const highlightId =
    hint?.kind === 'move'
      ? scene.nodes.find((n) => n.action && sameAction(n.action, hint.action))?.id
      : undefined;

  const dispatch = (a: Action) => {
    setHint(null);
    setSession((s) => applyAction(runtime, s, a));
  };

  return (
    <>
      <p style={{ margin: '0 0 20px', color: '#9aa7b4', maxWidth: 580 }}>{demo.blurb}</p>
      <PuzzleSvg scene={scene} highlightId={highlightId} onAction={dispatch} />

      <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setHint(nextHint(runtime, session, SOLVER_CFG))} style={btn('#f0883e')}>
          Hint
        </button>
        <button onClick={() => { setHint(null); setSession((s) => undo(runtime, s)); }} style={btn()}>
          Undo
        </button>
        <button onClick={() => { setHint(null); setSession((s) => resetAttempt(runtime, s)); }} style={btn()}>
          Reset
        </button>
        <span style={{ color: '#6b7785', fontSize: 13 }}>moves: {session.history.length}</span>
      </div>

      <div style={{ marginTop: 16, minHeight: 26 }}>
        {session.solved && (
          <span style={{ color: '#7ee787', fontWeight: 600 }}>✓ Solved — the puzzle is proven solvable.</span>
        )}
        {!session.solved && hint?.kind === 'move' && (
          <span style={{ color: '#f0b27a' }}>Hint: act on the highlighted part.</span>
        )}
        {hint?.kind === 'deadEnd' && <span style={{ color: '#ff9d96' }}>{hint.message}</span>}
        {hint?.kind === 'inconclusive' && <span style={{ color: '#f0b27a' }}>{hint.message}</span>}
      </div>
    </>
  );
}

export function App(): JSX.Element {
  const [demoId, setDemoId] = useState(DEMOS[0]!.id);
  const demo = DEMOS.find((d) => d.id === demoId)!;

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        color: '#e6edf3',
        background: '#0e1116',
        minHeight: '100vh',
        padding: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Lockwright</h1>
        <select
          value={demoId}
          onChange={(e) => setDemoId(e.target.value)}
          style={{ background: '#1c232d', color: '#e6edf3', border: '1px solid #2a323d', borderRadius: 8, padding: '6px 10px', fontSize: 14 }}
        >
          {DEMOS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.mechanism.name}
            </option>
          ))}
        </select>
        <span style={{ color: '#6b7785', fontSize: 13 }}>one engine · two mechanisms · zero mechanism-specific code</span>
      </div>

      {/* key on demo id so switching remounts a fresh attempt */}
      <Play key={demo.id} demo={demo} />
    </div>
  );
}

function btn(accent = '#2a323d'): React.CSSProperties {
  return {
    background: accent,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    cursor: 'pointer',
  };
}
