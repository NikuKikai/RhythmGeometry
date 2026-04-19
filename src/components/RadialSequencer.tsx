import { useMemo } from "react";
import { getNotePolygonPoints, getRingCellPath, polarToCartesian } from "../lib/geometry";
import { colorRings, useRhythmStore } from "../store/rhythmStore";

const SIZE = 620;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const OUTER_RADIUS = 270;
const RING_WIDTH = 38;
const RING_GAP = 12;
const NOTE_FLASH_WINDOW = 0.035;

export function RadialSequencer() {
  const rawRings = useRhythmStore((state) => state.rings);
  const selectedRingId = useRhythmStore((state) => state.selectedRingId);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const selectRing = useRhythmStore((state) => state.selectRing);
  const toggleNote = useRhythmStore((state) => state.toggleNote);
  const rings = useMemo(() => colorRings(rawRings), [rawRings]);
  const playheadStart = polarToCartesian(CENTER, OUTER_RADIUS + 8, cyclePosition);
  const playheadEnd = polarToCartesian(CENTER, OUTER_RADIUS + 30, cyclePosition);

  return (
    <section className="sequencer-card" aria-label="Circular rhythm editor">
      <svg className="radial-sequencer" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img">
        {/* <circle className="sequencer-core" cx={CENTER.x} cy={CENTER.y} r="68" /> */}

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
                      selectRing(ring.id);
                      toggleNote(ring.id, stepIndex);
                    }}
                    aria-label={`${ring.label} step ${stepIndex + 1}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRing(ring.id);
                        toggleNote(ring.id, stepIndex);
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
                const notePosition = note / ring.division;
                const elapsedSinceTrigger = (cyclePosition - notePosition + 1) % 1;
                const isTriggered = isPlaying && elapsedSinceTrigger < NOTE_FLASH_WINDOW;

                return (
                  <circle
                    key={note}
                    className={isTriggered ? "note-dot triggered" : "note-dot"}
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
