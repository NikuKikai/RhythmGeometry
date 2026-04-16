import type { Ring } from "../lib/rhythm";

interface TimelineProps {
  cyclePosition: number;
  rings: Ring[];
}

export function Timeline({ cyclePosition, rings }: TimelineProps) {
  const maxDivision = Math.max(16, ...rings.map((ring) => ring.division));
  const markers = Array.from({ length: maxDivision + 1 }, (_, index) => index / maxDivision);

  return (
    <footer className="timeline" aria-label="Shared cycle timeline">
      <div className="timeline-track" style={{ "--track-count": rings.length } as React.CSSProperties}>
        {markers.map((position, index) => (
          <span
            key={position}
            className={index % Math.max(1, maxDivision / 4) === 0 ? "timeline-marker strong" : "timeline-marker"}
            style={{ left: `${position * 100}%` }}
          />
        ))}
        {rings.map((ring, ringIndex) => (
          <div className="timeline-row" key={ring.id} style={{ top: `${ringIndex * 18 + 4}px` }}>
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
      <span className="timeline-label">One shared cycle</span>
    </footer>
  );
}
