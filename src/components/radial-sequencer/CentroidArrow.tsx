import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getRhythmCentroid } from "../../lib/inspectorAnalysis";
import { useRhythmStore } from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { CENTER, OUTER_RADIUS, RING_GAP, RING_WIDTH } from "./shared";

export const CentroidArrow = memo(function CentroidArrow() {
  const showCentroidArrow = useSequencerUiStore((state) => state.showCentroidArrow);
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const ringIndex = state.rings.findIndex((ring) => ring.id === state.selectedRingId);
      const ring = ringIndex >= 0 ? state.rings[ringIndex] : state.rings[0];
      const resolvedRingIndex = ringIndex >= 0 ? ringIndex : 0;
      return ring
        ? {
            notes: ring.notes,
            division: ring.division,
            phaseOffset: ring.phaseOffset,
            centerRadius:
              OUTER_RADIUS - resolvedRingIndex * (RING_WIDTH + RING_GAP) - RING_WIDTH / 2,
          }
        : null;
    }),
  );
  const arrow = useMemo(() => {
    if (!showCentroidArrow || !selectedRing) {
      return null;
    }

    const centroid = getRhythmCentroid(
      selectedRing.notes,
      selectedRing.division,
      selectedRing.phaseOffset,
    );
    if (centroid.magnitude <= 0) {
      return null;
    }

    const endX = CENTER.x + centroid.x * selectedRing.centerRadius;
    const endY = CENTER.y + centroid.y * selectedRing.centerRadius;
    return {
      endX,
      endY,
    };
  }, [selectedRing, showCentroidArrow]);

  if (!arrow) {
    return null;
  }

  return (
    <g className="centroid-arrow-layer">
      <line
        className="centroid-arrow-line"
        x1={CENTER.x}
        y1={CENTER.y}
        x2={arrow.endX}
        y2={arrow.endY}
      />
      <circle className="centroid-arrow-dot" cx={arrow.endX} cy={arrow.endY} r={6} />
    </g>
  );
});
