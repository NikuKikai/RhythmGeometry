import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { polarToCartesian } from "../../lib/geometry";
import { useRhythmStore } from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { CENTER, OUTER_RADIUS, RING_GAP, RING_WIDTH } from "./shared";

export const LbdmGroupingOverlay = memo(function LbdmGroupingOverlay() {
  const showLbdmGrouping = useSequencerUiStore((state) => state.showLbdmGrouping);
  const lbdmGroupingEdges = useSequencerUiStore((state) => state.lbdmGroupingEdges);
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const ringIndex = state.rings.findIndex((ring) => ring.id === state.selectedRingId);
      const ring = ringIndex >= 0 ? state.rings[ringIndex] : state.rings[0];
      const resolvedRingIndex = ringIndex >= 0 ? ringIndex : 0;
      return ring
        ? {
            division: ring.division,
            phaseOffset: ring.phaseOffset,
            noteRadius:
              OUTER_RADIUS - resolvedRingIndex * (RING_WIDTH + RING_GAP) - RING_WIDTH / 2,
          }
        : null;
    }),
  );
  const ringDragState = useSequencerUiStore((state) => state.ringDragState);
  const overlayEdges = useMemo(() => {
    if (!showLbdmGrouping || !selectedRing || lbdmGroupingEdges.length === 0) {
      return [];
    }

    const phaseOffset =
      ringDragState?.isRotating ? ringDragState.previewOffset : selectedRing.phaseOffset;

    return lbdmGroupingEdges.map((edge) => ({
      ...edge,
      fromPoint: polarToCartesian(
        CENTER,
        selectedRing.noteRadius,
        (edge.fromNote + phaseOffset) / selectedRing.division,
      ),
      toPoint: polarToCartesian(
        CENTER,
        selectedRing.noteRadius,
        (edge.toNote + phaseOffset) / selectedRing.division,
      ),
    }));
  }, [lbdmGroupingEdges, ringDragState, selectedRing, showLbdmGrouping]);

  if (overlayEdges.length === 0) {
    return null;
  }

  return (
    <g className="lbdm-grouping-layer">
      {overlayEdges.map((edge) => (
        <line
          className={edge.isMutual ? "lbdm-grouping-edge mutual" : "lbdm-grouping-edge one-way"}
          key={`${edge.fromNote}-${edge.toNote}-${edge.isMutual ? "m" : "o"}`}
          x1={edge.fromPoint.x}
          y1={edge.fromPoint.y}
          x2={edge.toPoint.x}
          y2={edge.toPoint.y}
        />
      ))}
    </g>
  );
});
