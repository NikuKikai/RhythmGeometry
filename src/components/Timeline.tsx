import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRhythmStore, getTrackColor } from "../store/rhythmStore";

interface TimelineRowProps {
  ringId: string;
  ringIndex: number;
}

const TimelineRow = memo(function TimelineRow({
  ringId,
  ringIndex,
}: TimelineRowProps) {
  const division = useRhythmStore((state) => state.rings[ringIndex]?.division);
  const notes = useRhythmStore((state) => state.rings[ringIndex]?.notes);
  const phaseOffset = useRhythmStore((state) => state.rings[ringIndex]?.phaseOffset);

  if (!division || !notes || phaseOffset === undefined) {
    return null;
  }

  return (
    <div className="timeline-row" key={ringId} >
      {Array.from({ length: division }, (_, index) => {
        const position = ((index + phaseOffset) / division) % 1;
        const isStrong = index === 0 || index % Math.max(1, division / 4) === 0;

        return (
          <span
            key={index}
            className={isStrong ? "timeline-marker strong" : "timeline-marker"}
            style={{ left: `${position * 100}%` }}
          />
        );
      })}
      {notes.map((note) => (
        <span
          key={note}
          className="timeline-note"
          style={{
            left: `${(((note + phaseOffset) / division) % 1) * 100}%`,
            background: getTrackColor(ringIndex),
          }}
        />
      ))}
    </div>
  );
});

function TimelinePlayhead() {
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  return (
    <span className="timeline-playhead" style={{ left: `${cyclePosition * 100}%` }} />
  );
}

export function Timeline() {
  const ringIds = useRhythmStore(useShallow((state) => state.rings.map((ring) => ring.id)));

  return (
    <div className="timeline" aria-label="Shared cycle timeline">
      <div className="timeline-track" style={{ "--track-count": ringIds.length } as React.CSSProperties}>
        {ringIds.map((ringId, ringIndex) => (
          <TimelineRow
            key={ringId}
            ringId={ringId}
            ringIndex={ringIndex}
          />
        ))}
        <TimelinePlayhead />
      </div>
    </div>
  );
}
