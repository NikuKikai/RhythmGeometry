import { memo, type PointerEvent } from "react";
import { getNotePolygonPoints, getRingCellPath, polarToCartesian } from "../../lib/geometry";
import { getTrackColor, useRhythmStore } from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { CENTER, OFFSET_GUIDE_WIDTH, OUTER_RADIUS, RING_GAP, RING_WIDTH, getOffsetArcPath, type RingPointerData } from "./shared";

interface RadialRingShellProps {
  ringId: string;
  ringIndex: number;
  onCellPointerDown: (event: PointerEvent<SVGPathElement>, ring: RingPointerData) => void;
  onCellClick: (ringId: string, stepIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent<SVGPathElement>, ringId: string, stepIndex: number) => void;
}

export const RadialRingShell = memo(function RadialRingShell({
  ringId,
  ringIndex,
  onCellPointerDown,
  onCellClick,
  onCellKeyDown,
}: RadialRingShellProps) {
  const ring = useRhythmStore((state) => state.rings[ringIndex]);
  const ringDragState = useSequencerUiStore((state) =>
    state.ringDragState?.ringId === ringId ? state.ringDragState : null,
  );

  if (!ring || ring.id !== ringId) {
    return null;
  }

  const outerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP);
  const innerRadius = outerRadius - RING_WIDTH;
  const noteRadius = innerRadius + RING_WIDTH / 2;
  const phaseOffset = ringDragState?.isRotating ? ringDragState.previewOffset : ring.phaseOffset;
  const isRotating = ringDragState?.isRotating ?? false;
  const polygonPoints = getNotePolygonPoints(
    ring.notes,
    ring.division,
    CENTER,
    noteRadius,
    phaseOffset,
  );
  const offsetArcRadius = outerRadius + OFFSET_GUIDE_WIDTH / 2;
  const offsetLabelPoint = polarToCartesian(CENTER, offsetArcRadius, 0);
  const maxOffsetMarkerPosition = 1 / ring.division;
  const maxOffsetMarkerStart = polarToCartesian(
    CENTER,
    offsetArcRadius - OFFSET_GUIDE_WIDTH / 2,
    maxOffsetMarkerPosition,
  );
  const maxOffsetMarkerEnd = polarToCartesian(
    CENTER,
    offsetArcRadius + OFFSET_GUIDE_WIDTH / 2,
    maxOffsetMarkerPosition,
  );
  const offsetArcPath = getOffsetArcPath(offsetArcRadius, ring.division, phaseOffset);
  const ringColor = getTrackColor(ringIndex);

  return (
    <g>
      {isRotating && (
        <>
          {offsetArcPath && <path className="ring-offset-arc" d={offsetArcPath} />}
          <line
            className="ring-offset-limit"
            x1={maxOffsetMarkerStart.x}
            y1={maxOffsetMarkerStart.y}
            x2={maxOffsetMarkerEnd.x}
            y2={maxOffsetMarkerEnd.y}
          />
          <text
            className="ring-offset-label"
            x={offsetLabelPoint.x + 4}
            y={offsetLabelPoint.y - 7}
            textAnchor="start"
          >
            {phaseOffset.toFixed(3)}
          </text>
        </>
      )}

      {Array.from({ length: ring.division }, (_, stepIndex) => {
        const active = ring.notes.includes(stepIndex);
        return (
          <path
            key={stepIndex}
            d={getRingCellPath({
              center: CENTER,
              innerRadius,
              outerRadius,
              stepIndex,
              division: ring.division,
              phaseOffset,
              gapRadians: 0,
            })}
            className={active ? "ring-cell active" : "ring-cell"}
            style={{
              "--ring-color": ringColor,
            } as React.CSSProperties}
            onPointerDown={(event) =>
              onCellPointerDown(event, {
                ringId: ring.id,
                phaseOffset: ring.phaseOffset,
                noteLevels: ring.noteLevels,
              })}
            onClick={() => onCellClick(ring.id, stepIndex)}
            aria-label={`${ring.label} step ${stepIndex + 1}`}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => onCellKeyDown(event, ring.id, stepIndex)}
          />
        );
      })}

      {ring.notes.length > 1 && (
        <polygon
          className="note-polygon"
          points={polygonPoints}
          style={{
            "--ring-color": ringColor,
          } as React.CSSProperties}
        />
      )}
    </g>
  );
}, (previous, next) =>
  previous.ringId === next.ringId &&
  previous.ringIndex === next.ringIndex,
);
