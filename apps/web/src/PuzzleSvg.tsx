import type { Action, Scene, SceneNode } from '@puzzle/runtime';

// The ONLY mechanism-agnostic SVG renderer. It draws a Scene — it knows nothing about
// mirrors, beams-as-physics, etc. Add a shape here once; never per mechanism.

function shapeElement(n: SceneNode): JSX.Element {
  const half = n.size / 2;
  const common = { fill: n.fill, stroke: n.stroke, strokeWidth: 2 };
  switch (n.shape) {
    case 'circle':
      return <circle cx={n.cx} cy={n.cy} r={half} {...common} />;
    case 'rect':
      return <rect x={n.cx - half} y={n.cy - half} width={n.size} height={n.size} rx={6} {...common} />;
    case 'diamond':
      return (
        <polygon
          points={`${n.cx},${n.cy - half} ${n.cx + half},${n.cy} ${n.cx},${n.cy + half} ${n.cx - half},${n.cy}`}
          {...common}
        />
      );
    case 'triangle':
      return (
        <polygon
          points={`${n.cx},${n.cy - half} ${n.cx + half},${n.cy + half} ${n.cx - half},${n.cy + half}`}
          {...common}
        />
      );
    case 'line':
      return <line x1={n.cx - half} y1={n.cy} x2={n.cx + half} y2={n.cy} stroke={n.stroke} strokeWidth={3} />;
    case 'arrow':
      return <line x1={n.cx - half} y1={n.cy} x2={n.cx + half} y2={n.cy} stroke={n.stroke} strokeWidth={3} markerEnd="url(#arrow)" />;
  }
}

export function PuzzleSvg({
  scene,
  highlightId,
  onAction,
}: {
  scene: Scene;
  highlightId?: string;
  onAction: (a: Action) => void;
}): JSX.Element {
  const cell = scene.width / Math.max(1, Math.round(scene.width / 72));
  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      width={scene.width}
      height={scene.height}
      style={{ background: '#11131a', borderRadius: 12, border: '1px solid #2a2f3a', maxWidth: '100%' }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#f6c350" />
        </marker>
      </defs>

      {/* grid */}
      {Array.from({ length: Math.round(scene.width / cell) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * cell} y1={0} x2={i * cell} y2={scene.height} stroke="#1b1f29" />
      ))}
      {Array.from({ length: Math.round(scene.height / cell) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * cell} x2={scene.width} y2={i * cell} stroke="#1b1f29" />
      ))}

      {/* beams (derived — same trace the solver uses) */}
      {scene.beams.map((b, i) => (
        <polyline
          key={`b${i}`}
          points={b.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={b.stroke}
          strokeWidth={b.width}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}

      {/* components */}
      {scene.nodes.map((n) => {
        const interactive = !!n.action;
        const highlighted = n.id === highlightId;
        return (
          <g
            key={n.id}
            transform={`rotate(${n.rotation} ${n.cx} ${n.cy})`}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onClick={interactive ? () => onAction(n.action!) : undefined}
          >
            {highlighted && (
              <circle cx={n.cx} cy={n.cy} r={n.size / 2 + 8} fill="none" stroke="#7ee787" strokeWidth={3}>
                <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {shapeElement(n)}
            {n.label && (
              <text
                x={n.cx}
                y={n.cy}
                transform={`rotate(${-n.rotation} ${n.cx} ${n.cy})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={14}
                fontFamily="monospace"
                fill="#11131a"
                pointerEvents="none"
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
