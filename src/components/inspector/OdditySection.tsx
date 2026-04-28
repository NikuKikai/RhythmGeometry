import { memo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  generateHopAndJumpRhythm,
  getOddityViolationCount,
} from "../../lib/inspectorAnalysis";
import { useRhythmStore } from "../../store/rhythmStore";
import { GenerateIcon } from "../Icons";
import { InspectorLabel } from "./InspectorLabel";
import type { InspectorInfoKey } from "./inspectorInfo";

interface OdditySectionProps {
  onOpenInfo: (key: InspectorInfoKey) => void;
}

export const OdditySection = memo(function OdditySection({
  onOpenInfo,
}: OdditySectionProps) {
  const [hopSize, setHopSize] = useState(2);
  const replaceRingNotes = useRhythmStore((state) => state.replaceRingNotes);
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const currentRing =
        state.rings.find((ring) => ring.id === state.selectedRingId) ?? state.rings[0];
      return currentRing
        ? {
            id: currentRing.id,
            division: currentRing.division,
            oddityViolationCount: getOddityViolationCount(
              currentRing.notes,
              currentRing.division,
            ),
          }
        : null;
    }),
  );

  function clampHopSize(nextHopSize: number): number {
    return selectedRing
      ? Math.max(1, Math.min(selectedRing.division, nextHopSize))
      : Math.max(1, nextHopSize);
  }

  function handleGenerateOddity() {
    if (!selectedRing) {
      return;
    }

    const generatedNotes = generateHopAndJumpRhythm(
      selectedRing.division,
      clampHopSize(hopSize),
    );
    if (!generatedNotes) {
      return;
    }

    replaceRingNotes(selectedRing.id, generatedNotes);
  }

  return (
    <section className="inspector-section">
      <InspectorLabel
        infoKey="oddity"
        valueText={String(selectedRing?.oddityViolationCount ?? 0)}
        onOpenInfo={onOpenInfo}
      />
      <div className="inspector-content-block">
        <div className="inspector-generator-row">
          <div className="inspector-stepper">
            <span className="inspector-stepper-label">HOP&JUMP steps</span>
            <input
              className="inspector-number-input"
              type="number"
              min="1"
              max={selectedRing ? Math.max(1, selectedRing.division) : 1}
              value={hopSize}
              onChange={(event) => setHopSize(clampHopSize(Number(event.target.value) || 1))}
            />
            <div className="inspector-stepper-buttons">
              <button
                className="ui-button inspector-stepper-button"
                type="button"
                onClick={() =>
                  setHopSize((current) => clampHopSize(current + 1))
                }
                aria-label="Increase hop size"
                title="Increase hop size"
              >
                +
              </button>
              <button
                className="ui-button inspector-stepper-button"
                type="button"
                onClick={() => setHopSize((current) => Math.max(1, current - 1))}
                aria-label="Decrease hop size"
                title="Decrease hop size"
              >
                -
              </button>
            </div>
          </div>
          <button
            className="ui-button ui-icon-button inspector-generate-button"
            type="button"
            onClick={handleGenerateOddity}
            aria-label="Generate oddity rhythm"
            title="Generate oddity rhythm"
          >
            <GenerateIcon className="inspector-generate-icon" />
          </button>
        </div>
      </div>
    </section>
  );
});
