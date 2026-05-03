import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getRhythmCentroid } from "../../lib/inspectorAnalysis";
import { useRhythmStore } from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { EyeIcon } from "../Icons";
import { InspectorLabel } from "./InspectorLabel";
import type { InspectorInfoKey } from "./inspectorInfo";

interface CentroidBalancedSectionProps {
  onOpenInfo: (key: InspectorInfoKey) => void;
}

export const CentroidBalancedSection = memo(function CentroidBalancedSection({
  onOpenInfo,
}: CentroidBalancedSectionProps) {
  const showCentroidArrow = useSequencerUiStore((state) => state.showCentroidArrow);
  const toggleCentroidArrowVisibility = useRhythmStore(
    (state) => state.toggleCentroidArrowVisibility,
  );
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const currentRing =
        state.rings.find((ring) => ring.id === state.selectedRingId) ?? state.rings[0];
      return currentRing
        ? {
            notes: currentRing.notes,
            division: currentRing.division,
            phaseOffset: currentRing.phaseOffset,
          }
        : null;
    }),
  );
  const centroidMagnitude = useMemo(
    () =>
      selectedRing
        ? getRhythmCentroid(
            selectedRing.notes,
            selectedRing.division,
            selectedRing.phaseOffset,
          ).magnitude
        : 0,
    [selectedRing],
  );

  return (
    <section className="inspector-section">
      <InspectorLabel
        infoKey="centroidBalanced"
        valueText={centroidMagnitude.toFixed(3)}
        actions={
          <button
            className={
              showCentroidArrow
                ? "inspector-visibility-button is-active"
                : "inspector-visibility-button"
            }
            type="button"
            aria-label={showCentroidArrow ? "Hide centroid vector" : "Show centroid vector"}
            title={showCentroidArrow ? "Hide centroid vector" : "Show centroid vector"}
            aria-pressed={showCentroidArrow}
            onClick={toggleCentroidArrowVisibility}
          >
            <EyeIcon className="inspector-visibility-icon" />
          </button>
        }
        onOpenInfo={onOpenInfo}
      />
    </section>
  );
});
