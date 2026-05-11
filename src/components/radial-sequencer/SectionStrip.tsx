import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRhythmStore } from "../../store/rhythmStore";
import { DeleteIcon, EyeIcon } from "../Icons";

const SectionChip = memo(function SectionChip({
  sectionId,
  index,
}: {
  sectionId: string;
  index: number;
}) {
  const currentSectionId = useRhythmStore((state) => state.currentSectionId);
  const section = useRhythmStore((state) => state.sections[index] ?? null);
  const playbackSectionId = useRhythmStore((state) => state.transport.playbackSectionId);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const sectionCount = useRhythmStore((state) => state.sections.length);
  const selectSection = useRhythmStore((state) => state.selectSection);
  const toggleSectionEnabled = useRhythmStore((state) => state.toggleSectionEnabled);
  const deleteSection = useRhythmStore((state) => state.deleteSection);

  if (!section || section.id !== sectionId) {
    return null;
  }

  return (
    <div
      className={`section-chip${currentSectionId === sectionId ? " is-current" : ""}${!section.isEnabled ? " is-disabled" : ""}`}
    >
      {playbackSectionId === sectionId && (
        <>
          <span className="section-chip-playhead top" style={{ left: `${cyclePosition * 100}%` }} />
          <span className="section-chip-playhead bottom" style={{ left: `${cyclePosition * 100}%` }} />
        </>
      )}
      <button
        className="section-chip-select"
        type="button"
        aria-label={`Section ${index + 1}`}
        onClick={() => selectSection(sectionId)}
      >
        <span className="section-chip-fill" />
      </button>
      <span className="section-chip-hover">
        <button
          className={
            section.isEnabled
              ? "section-chip-visibility floating-overlay-button ui-button ui-icon-button"
              : "section-chip-visibility floating-overlay-button ui-button ui-icon-button is-muted"
          }
          type="button"
          aria-label={section.isEnabled ? `Disable section ${index + 1}` : `Enable section ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleSectionEnabled(sectionId);
          }}
        >
          <EyeIcon />
        </button>
        <button
          className="section-chip-delete floating-overlay-button ui-button ui-icon-button"
          type="button"
          aria-label={`Delete section ${index + 1}`}
          disabled={sectionCount <= 1}
          onClick={(event) => {
            event.stopPropagation();
            deleteSection(sectionId);
          }}
        >
          <DeleteIcon />
        </button>
      </span>
    </div>
  );
});

export const SectionStrip = memo(function SectionStrip() {
  const sectionIds = useRhythmStore(useShallow((state) => state.sections.map((section) => section.id)));
  const addSection = useRhythmStore((state) => state.addSection);

  return (
    <div className="section-strip" aria-label="Groove sections">
      {sectionIds.map((sectionId, index) => (
        <SectionChip key={sectionId} sectionId={sectionId} index={index} />
      ))}
      <button
        className="section-chip section-chip-add"
        type="button"
        aria-label="Add section"
        onClick={addSection}
      >
        <span className="section-chip-add-mark">+</span>
      </button>
    </div>
  );
});
