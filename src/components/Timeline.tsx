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
  const ring = useRhythmStore(
    useShallow((state) => {
      const currentRing = state.rings.find((item) => item.id === ringId);
      return currentRing
        ? {
            id: currentRing.id,
            division: currentRing.division,
            notes: currentRing.notes,
            phaseOffset: currentRing.phaseOffset,
          }
        : null;
    }),
  );

  if (!ring) {
    return null;
  }

  return (
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
  );
});

export function Timeline() {
  const ringIds = useRhythmStore(useShallow((state) => state.rings.map((ring) => ring.id)));
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);

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
        <span className="timeline-playhead" style={{ left: `${cyclePosition * 100}%` }} />
      </div>
    </div>
  );
}
