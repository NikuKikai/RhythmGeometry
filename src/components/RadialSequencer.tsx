import { getNotePolygonPoints, getRingCellPath, polarToCartesian } from "../lib/geometry";
import type { Ring } from "../lib/rhythm";

interface RadialSequencerProps {
  rings: Ring[];
  selectedRingId: string;
  cyclePosition: number;
  onSelectRing: (ringId: string) => void;
  onToggleNote: (ringId: string, noteIndex: number) => void;
}

const SIZE = 620;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const OUTER_RADIUS = 270;
const RING_WIDTH = 42;
const RING_GAP = 12;

export function RadialSequencer({
  rings,
  selectedRingId,
  cyclePosition,
  onSelectRing,
  onToggleNote,
}: RadialSequencerProps) {
  const playheadStart = polarToCartesian(CENTER, OUTER_RADIUS + 8, cyclePosition);
  const playheadEnd = polarToCartesian(CENTER, OUTER_RADIUS + 30, cyclePosition);

  return (
    <section className="sequencer-card" aria-label="Circular rhythm editor">
      <svg className="radial-sequencer" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img">
        <circle className="sequencer-core" cx={CENTER.x} cy={CENTER.y} r="68" />

        {rings.map((ring, ringIndex) => {
          const outerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP);
          const innerRadius = outerRadius - RING_WIDTH;
          const noteRadius = innerRadius + RING_WIDTH / 2;
          const polygonPoints = getNotePolygonPoints(ring.notes, ring.division, CENTER, noteRadius);
          const isSelected = ring.id === selectedRingId;

          return (
            <g key={ring.id} className={isSelected ? "ring selected" : "ring"}>
              {Array.from({ length: ring.division }, (_, stepIndex) => {
                const active = ring.notes.includes(stepIndex);
                return (
                  <path
                    key={stepIndex}
                    d={getRingCellPath({
                      center: CENTER,
                      innerRadius,
                      outerRadius,
                      stepIndex,
                      division: ring.division,
                      gapRadians: 0,
                    })}
                    className={active ? "ring-cell active" : "ring-cell"}
                    style={{
                      "--ring-color": ring.color,
                    } as React.CSSProperties}
                    onClick={() => {
                      onSelectRing(ring.id);
                      onToggleNote(ring.id, stepIndex);
                    }}
                    aria-label={`${ring.label} step ${stepIndex + 1}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectRing(ring.id);
                        onToggleNote(ring.id, stepIndex);
                      }
                    }}
                  />
                );
              })}

              {ring.notes.length > 1 && (
                <polygon
                  className="note-polygon"
                  points={polygonPoints}
                  style={{
                    "--ring-color": ring.color,
                  } as React.CSSProperties}
                />
              )}

              {ring.notes.map((note) => {
                const point = polarToCartesian(CENTER, noteRadius, note / ring.division);
                return (
                  <circle
                    key={note}
                    className="note-dot"
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? 7 : 5}
                    style={{
                      "--ring-color": ring.color,
                    } as React.CSSProperties}
                  />
                );
              })}
            </g>
          );
        })}

        <line
          className="playhead-line"
          x1={playheadStart.x}
          y1={playheadStart.y}
          x2={playheadEnd.x}
          y2={playheadEnd.y}
        />
      </svg>
    </section>
  );
}
