import { memo, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getLbdmGroupingEdges } from "../../lib/inspectorAnalysis";
import { useRhythmStore } from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { EyeIcon } from "../Icons";
import { InspectorLabel } from "./InspectorLabel";
import type { InspectorInfoKey } from "./inspectorInfo";

interface LbdmGroupingSectionProps {
  onOpenInfo: (key: InspectorInfoKey) => void;
}

export const LbdmGroupingSection = memo(function LbdmGroupingSection({
  onOpenInfo,
}: LbdmGroupingSectionProps) {
  const showLbdmGrouping = useSequencerUiStore((state) => state.showLbdmGrouping);
  const setLbdmGroupingEdges = useSequencerUiStore((state) => state.setLbdmGroupingEdges);
  const toggleLbdmGroupingVisibility = useRhythmStore(
    (state) => state.toggleLbdmGroupingVisibility,
  );
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const currentRing =
        state.rings.find((ring) => ring.id === state.selectedRingId) ?? state.rings[0];
      return currentRing
        ? {
            notes: currentRing.notes,
            division: currentRing.division,
          }
        : null;
    }),
  );
  const lbdmGroupingEdges = useMemo(
    () =>
      selectedRing
        ? getLbdmGroupingEdges(selectedRing.notes, selectedRing.division)
        : [],
    [selectedRing],
  );

  useEffect(() => {
    setLbdmGroupingEdges(lbdmGroupingEdges);
  }, [lbdmGroupingEdges, setLbdmGroupingEdges]);

  return (
    <section className="inspector-section">
      <InspectorLabel
        infoKey="lbdmGrouping"
        actions={
          <button
            className={
              showLbdmGrouping
                ? "inspector-visibility-button is-active"
                : "inspector-visibility-button"
            }
            type="button"
            aria-label={showLbdmGrouping ? "Hide LBDM grouping overlay" : "Show LBDM grouping overlay"}
            title={showLbdmGrouping ? "Hide LBDM grouping overlay" : "Show LBDM grouping overlay"}
            aria-pressed={showLbdmGrouping}
            onClick={toggleLbdmGroupingVisibility}
          >
            <EyeIcon className="inspector-visibility-icon" />
          </button>
        }
        onOpenInfo={onOpenInfo}
      />
    </section>
  );
});
