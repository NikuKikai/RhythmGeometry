import { memo } from "react";
import { getTrackColor, useRhythmStore } from "../store/rhythmStore";

interface TimelineRowProps {
  ringIndex: number;
}

const TimelineRow = memo(function TimelineRow({
  ringIndex,
}: TimelineRowProps) {
  const sections = useRhythmStore((state) => state.sections);
  const sectionCount = sections.length;

  if (sectionCount === 0) {
    return null;
  }

  return (
    <div className="timeline-row">
      {sections.flatMap((section, sectionIndex) => {
        const currentRing = section.rings[ringIndex];
        if (!currentRing) {
          return [];
        }

        const markers = Array.from({ length: currentRing.division }, (_, index) => {
          const localPosition = ((index + currentRing.phaseOffset) / currentRing.division) % 1;
          const left = ((sectionIndex + localPosition) / sectionCount) * 100;
          const isStrong = index === 0 || index % Math.max(1, currentRing.division / 4) === 0;

          return (
            <span
              key={`${section.id}-marker-${index}`}
              className={isStrong ? "timeline-marker strong" : "timeline-marker"}
              style={{ left: `${left}%` }}
            />
          );
        });

        const notes = currentRing.notes.map((note) => (
          <span
            key={`${section.id}-note-${note}`}
            className="timeline-note"
            style={{
              left: `${((sectionIndex + (((note + currentRing.phaseOffset) / currentRing.division) % 1)) / sectionCount) * 100}%`,
              background: getTrackColor(ringIndex),
            }}
          />
        ));

        return [...markers, ...notes];
      })}
    </div>
  );
});

function TimelinePlayhead() {
  const arrangementPosition = useRhythmStore((state) => state.transport.arrangementPosition);
  return (
    <>
      <span className="timeline-playhead top" style={{ left: `${arrangementPosition * 100}%` }} />
      <span className="timeline-playhead bottom" style={{ left: `${arrangementPosition * 100}%` }} />
    </>
  );
}

function TimelineSectionBands() {
  const sectionCount = useRhythmStore((state) => state.sections.length);

  return (
    <>
      {Array.from({ length: sectionCount }, (_, index) => (
        <span
          key={index}
          className={index % 2 === 0 ? "timeline-section-band" : "timeline-section-band alt"}
          style={{
            left: `${(index / sectionCount) * 100}%`,
            width: `${100 / sectionCount}%`,
          }}
        />
      ))}
    </>
  );
}

function TimelineSectionDividers() {
  const sectionCount = useRhythmStore((state) => state.sections.length);

  return (
    <>
      {Array.from({ length: Math.max(0, sectionCount - 1) }, (_, index) => (
        <span
          key={index}
          className="timeline-section-divider"
          style={{ left: `${((index + 1) / sectionCount) * 100}%` }}
        />
      ))}
    </>
  );
}

export function Timeline() {
  const sections = useRhythmStore((state) => state.sections);
  const rowCount = sections.reduce((max, section) => Math.max(max, section.rings.length), 0);

  return (
    <div className="timeline" aria-label="Arrangement timeline">
      <div className="timeline-track" style={{ "--track-count": rowCount } as React.CSSProperties}>
        <TimelineSectionBands />
        {Array.from({ length: rowCount }, (_, ringIndex) => (
          <TimelineRow
            key={ringIndex}
            ringIndex={ringIndex}
          />
        ))}
        <TimelineSectionDividers />
        <TimelinePlayhead />
      </div>
    </div>
  );
}
