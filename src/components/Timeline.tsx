import { useRhythmStore, getTrackColor } from "../store/rhythmStore";

export function Timeline() {
  const rings = useRhythmStore((state) => state.rings);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);

  return (
    <div className="timeline" aria-label="Shared cycle timeline">
      <div className="timeline-track" style={{ "--track-count": rings.length } as React.CSSProperties}>
        {rings.map((ring, ringIndex) => (
          <div className="timeline-row" key={ring.id} >
            {Array.from({ length: ring.division }, (_, index) => {
              const position = ((index + ring.phaseOffset) / ring.division) % 1;
              const isStrong = index === 0 || index % Math.max(1, ring.division / 4) === 0;

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
                  left: `${(((note + ring.phaseOffset) / ring.division) % 1) * 100}%`,
                  background: getTrackColor(ringIndex),
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
