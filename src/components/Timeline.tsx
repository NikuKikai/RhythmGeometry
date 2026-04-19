import { useMemo } from "react";
import { colorRings, useRhythmStore } from "../store/rhythmStore";

export function Timeline() {
  const rawRings = useRhythmStore((state) => state.rings);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const rings = useMemo(() => colorRings(rawRings), [rawRings]);

  return (
    <div className="timeline" aria-label="Shared cycle timeline">
      <div className="timeline-track" style={{ "--track-count": rings.length } as React.CSSProperties}>
        {rings.map((ring) => (
          <div className="timeline-row" key={ring.id} >
            {Array.from({ length: ring.division + 1 }, (_, index) => {
              const position = index / ring.division;
              const isStrong = index === 0 || index === ring.division || index % Math.max(1, ring.division / 4) === 0;

              return (
                <span
                  key={index}
                  className={isStrong ? "timeline-marker strong" : "timeline-marker"}
                  style={{ left: `${position * 100}%` }}
                />
              );
            })}
            {ring.notes.map((note) => (
              <span
                key={note}
                className="timeline-note"
                style={{
                  left: `${(note / ring.division) * 100}%`,
                  background: ring.color,
                }}
              />
            ))}
          </div>
        ))}
        <span className="timeline-playhead" style={{ left: `${cyclePosition * 100}%` }} />
      </div>
    </div>
  );
}
