import { memo, useMemo } from "react";
import { HorizontalScrollViewport } from "./HorizontalScrollViewport";
import { getTrackColor, useRhythmStore } from "../store/rhythmStore";

const TIMELINE_MIN_CELL_WIDTH = 12;

interface TimelineRowProps {
  ringIndex: number;
  sectionLayouts: TimelineSectionLayout[];
  totalUnits: number;
}

interface TimelineSectionLayout {
  id: string;
  startUnits: number;
  widthUnits: number;
}

const TimelineRow = memo(function TimelineRow({
  ringIndex,
  sectionLayouts,
  totalUnits,
}: TimelineRowProps) {
  const sections = useRhythmStore((state) => state.sections);

  if (sectionLayouts.length === 0 || totalUnits <= 0) {
    return null;
  }

  return (
    <div className="timeline-row">
      {sections.flatMap((section, sectionIndex) => {
        const currentRing = section.rings[ringIndex];
        const sectionLayout = sectionLayouts[sectionIndex];
        if (!currentRing) {
          return [];
        }

        const markers = Array.from({ length: currentRing.division }, (_, index) => {
          const localPosition = ((index + currentRing.phaseOffset) / currentRing.division) % 1;
          const left =
            ((sectionLayout.startUnits + localPosition * sectionLayout.widthUnits) / totalUnits) * 100;
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
              left: `${((sectionLayout.startUnits + ((((note + currentRing.phaseOffset) / currentRing.division) % 1) * sectionLayout.widthUnits)) / totalUnits) * 100}%`,
              width: `${(sectionLayout.widthUnits / (totalUnits * currentRing.division)) * 100}%`,
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

function TimelineSectionBands({
  sectionLayouts,
  totalUnits,
}: {
  sectionLayouts: TimelineSectionLayout[];
  totalUnits: number;
}) {
  return (
    <>
      {sectionLayouts.map((sectionLayout, index) => (
        <span
          key={sectionLayout.id}
          className={index % 2 === 0 ? "timeline-section-band" : "timeline-section-band alt"}
          style={{
            left: `${(sectionLayout.startUnits / totalUnits) * 100}%`,
            width: `${(sectionLayout.widthUnits / totalUnits) * 100}%`,
          }}
        />
      ))}
    </>
  );
}

function TimelineSectionDividers({
  sectionLayouts,
  totalUnits,
}: {
  sectionLayouts: TimelineSectionLayout[];
  totalUnits: number;
}) {
  return (
    <>
      {sectionLayouts.slice(1).map((sectionLayout) => (
        <span
          key={sectionLayout.id}
          className="timeline-section-divider"
          style={{ left: `${(sectionLayout.startUnits / totalUnits) * 100}%` }}
        />
      ))}
    </>
  );
}

export function Timeline() {
  const sections = useRhythmStore((state) => state.sections);
  const rowCount = sections.reduce((max, section) => Math.max(max, section.rings.length), 0);
  const sectionLayouts = useMemo(() => {
    let startUnits = 0;
    return sections.map((section) => {
      const widthUnits = Math.max(1, ...section.rings.map((ring) => ring.division));
      const layout = {
        id: section.id,
        startUnits,
        widthUnits,
      };
      startUnits += widthUnits;
      return layout;
    });
  }, [sections]);
  const totalUnits = sectionLayouts.reduce((sum, sectionLayout) => sum + sectionLayout.widthUnits, 0);

  return (
    <HorizontalScrollViewport
      className="timeline"
      bottomInset={8}
      topInset={8}
      ariaLabel="Arrangement timeline"
    >
      <div
        className="timeline-track"
        style={{
          "--track-count": rowCount,
          minWidth: `${Math.max(1, totalUnits) * TIMELINE_MIN_CELL_WIDTH}px`,
        } as React.CSSProperties}
      >
        <TimelineSectionBands sectionLayouts={sectionLayouts} totalUnits={totalUnits} />
        {Array.from({ length: rowCount }, (_, ringIndex) => (
          <TimelineRow
            key={ringIndex}
            ringIndex={ringIndex}
            sectionLayouts={sectionLayouts}
            totalUnits={totalUnits}
          />
        ))}
        <TimelineSectionDividers sectionLayouts={sectionLayouts} totalUnits={totalUnits} />
        <TimelinePlayhead />
      </div>
    </HorizontalScrollViewport>
  );
}
