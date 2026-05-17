import { memo, useMemo } from "react";
import { getPhaseSpacePoints } from "../../lib/inspectorAnalysis";
import { InspectorLabel } from "./InspectorLabel";
import type { InspectorInfoKey } from "./inspectorInfo";

interface PhaseSpacePlotSectionProps {
  adjacentIntervals: number[];
  onOpenInfo: (key: InspectorInfoKey) => void;
}

const PHASE_SPACE_POINT_RADIUS = 3.5;
const PHASE_SPACE_ARROW_INSET = 1.5;
const PHASE_SPACE_SIZE = 160;
const PHASE_SPACE_PADDING = 14;
const PHASE_SPACE_INNER_SIZE = PHASE_SPACE_SIZE - PHASE_SPACE_PADDING * 2;

export const PhaseSpacePlotSection = memo(function PhaseSpacePlotSection({
  adjacentIntervals,
  onOpenInfo,
}: PhaseSpacePlotSectionProps) {
  const phaseSpacePoints = useMemo(
    () => getPhaseSpacePoints(adjacentIntervals),
    [adjacentIntervals],
  );
  const phaseSpaceBounds = useMemo(() => {
    if (phaseSpacePoints.length === 0) {
      return {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      };
    }

    const xValues = phaseSpacePoints.map((point) => point.x);
    const yValues = phaseSpacePoints.map((point) => point.y);
    const paddedMinX = Math.min(...xValues) - 0.5;
    const paddedMaxX = Math.max(...xValues) + 0.5;
    const paddedMinY = Math.min(...yValues) - 0.5;
    const paddedMaxY = Math.max(...yValues) + 0.5;
    const normalizedMinX = Math.floor(paddedMinX);
    const normalizedMaxX = Math.ceil(paddedMaxX);
    const normalizedMinY = Math.floor(paddedMinY);
    const normalizedMaxY = Math.ceil(paddedMaxY);
    const span = Math.max(
      normalizedMaxX - normalizedMinX,
      normalizedMaxY - normalizedMinY,
      1,
    );
    const centerX = (normalizedMinX + normalizedMaxX) / 2;
    const centerY = (normalizedMinY + normalizedMaxY) / 2;
    const halfSpan = span / 2;

    return {
      minX: centerX - halfSpan,
      maxX: centerX + halfSpan,
      minY: centerY - halfSpan,
      maxY: centerY + halfSpan,
    };
  }, [phaseSpacePoints]);
  const phaseSpaceXRange = Math.max(phaseSpaceBounds.maxX - phaseSpaceBounds.minX, 1);
  const phaseSpaceYRange = Math.max(phaseSpaceBounds.maxY - phaseSpaceBounds.minY, 1);

  function getPhaseSpaceXCoordinate(value: number) {
    return (
      PHASE_SPACE_PADDING +
      ((value - phaseSpaceBounds.minX) / phaseSpaceXRange) * PHASE_SPACE_INNER_SIZE
    );
  }

  function getPhaseSpaceYCoordinate(value: number) {
    return (
      PHASE_SPACE_SIZE -
      (PHASE_SPACE_PADDING +
        ((value - phaseSpaceBounds.minY) / phaseSpaceYRange) * PHASE_SPACE_INNER_SIZE)
    );
  }

  const phaseSpaceXTicks = useMemo(() => {
    const start = Math.ceil(phaseSpaceBounds.minX);
    const end = Math.floor(phaseSpaceBounds.maxX);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [phaseSpaceBounds]);
  const phaseSpaceYTicks = useMemo(() => {
    const start = Math.ceil(phaseSpaceBounds.minY);
    const end = Math.floor(phaseSpaceBounds.maxY);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [phaseSpaceBounds]);
  const phaseSpaceRenderPoints = useMemo(() => {
    const seen = new Set<string>();
    return phaseSpacePoints.reduce<Array<{ x: number; y: number; isFirst: boolean }>>(
      (points, point, index) => {
        const key = `${point.x},${point.y}`;
        if (seen.has(key)) {
          return points;
        }

        seen.add(key);
        points.push({
          x: point.x,
          y: point.y,
          isFirst: index === 0,
        });
        return points;
      },
      [],
    );
  }, [phaseSpacePoints]);
  const phaseSpaceRenderEdges = useMemo(() => {
    if (phaseSpacePoints.length < 2) {
      return [];
    }

    const orderedPoints = [...phaseSpacePoints, phaseSpacePoints[0]];
    const seen = new Set<string>();

    return orderedPoints.slice(0, -1).reduce<Array<{ fromX: number; fromY: number; toX: number; toY: number }>>(
      (edges, point, index) => {
        const nextPoint = orderedPoints[index + 1];
        if (point.x === nextPoint.x && point.y === nextPoint.y) {
          return edges;
        }

        const key = `${point.x},${point.y}->${nextPoint.x},${nextPoint.y}`;
        if (seen.has(key)) {
          return edges;
        }

        seen.add(key);
        edges.push({
          fromX: point.x,
          fromY: point.y,
          toX: nextPoint.x,
          toY: nextPoint.y,
        });
        return edges;
      },
      [],
    );
  }, [phaseSpacePoints]);
  const phaseSpaceDrawEdges = phaseSpaceRenderEdges
    .map((edge) => {
      const startX = getPhaseSpaceXCoordinate(edge.fromX);
      const startY = getPhaseSpaceYCoordinate(edge.fromY);
      const endX = getPhaseSpaceXCoordinate(edge.toX);
      const endY = getPhaseSpaceYCoordinate(edge.toY);
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const length = Math.hypot(deltaX, deltaY);

      if (length <= PHASE_SPACE_POINT_RADIUS * 2) {
        return null;
      }

      const unitX = deltaX / length;
      const unitY = deltaY / length;

      return {
        x1: startX + unitX * PHASE_SPACE_POINT_RADIUS,
        y1: startY + unitY * PHASE_SPACE_POINT_RADIUS,
        x2: endX - unitX * (PHASE_SPACE_POINT_RADIUS + PHASE_SPACE_ARROW_INSET),
        y2: endY - unitY * (PHASE_SPACE_POINT_RADIUS + PHASE_SPACE_ARROW_INSET),
      };
    })
    .filter((edge): edge is { x1: number; y1: number; x2: number; y2: number } => edge !== null);

  return (
    <section className="inspector-section">
      <InspectorLabel infoKey="phaseSpacePlot" onOpenInfo={onOpenInfo} />
      <div className="inspector-content-block">
        <div className="phase-space-plot-wrap">
          <svg
            className="phase-space-plot"
            viewBox={`0 0 ${PHASE_SPACE_SIZE} ${PHASE_SPACE_SIZE}`}
            aria-label="Phase space plot"
          >
            <defs>
              <marker
                id="phase-space-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path className="phase-space-arrowhead" d="M 0 0 L 6 3 L 0 6 z" />
              </marker>
            </defs>
            <rect
              className="phase-space-frame"
              x={PHASE_SPACE_PADDING}
              y={PHASE_SPACE_PADDING}
              width={PHASE_SPACE_INNER_SIZE}
              height={PHASE_SPACE_INNER_SIZE}
            />
            {phaseSpaceXTicks.map((tick) => (
              <g key={`x-${tick}`}>
                <line
                  className="phase-space-grid-line"
                  x1={getPhaseSpaceXCoordinate(tick)}
                  y1={PHASE_SPACE_PADDING}
                  x2={getPhaseSpaceXCoordinate(tick)}
                  y2={PHASE_SPACE_PADDING + PHASE_SPACE_INNER_SIZE}
                />
              </g>
            ))}
            {phaseSpaceYTicks.map((tick) => (
              <g key={`y-${tick}`}>
                <line
                  className="phase-space-grid-line"
                  x1={PHASE_SPACE_PADDING}
                  y1={getPhaseSpaceYCoordinate(tick)}
                  x2={PHASE_SPACE_PADDING + PHASE_SPACE_INNER_SIZE}
                  y2={getPhaseSpaceYCoordinate(tick)}
                />
              </g>
            ))}
            {phaseSpaceDrawEdges.map((edge, index) => (
              <line
                key={`${edge.x1},${edge.y1}-${edge.x2},${edge.y2}-${index}`}
                className="phase-space-line"
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                markerEnd="url(#phase-space-arrow)"
              />
            ))}
            {phaseSpaceRenderPoints.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                className={point.isFirst ? "phase-space-point phase-space-point-first" : "phase-space-point"}
                cx={getPhaseSpaceXCoordinate(point.x)}
                cy={getPhaseSpaceYCoordinate(point.y)}
                r={PHASE_SPACE_POINT_RADIUS}
              />
            ))}
            {phaseSpaceXTicks.map((tick) => (
              <text
                key={`x-label-${tick}`}
                className="phase-space-axis-value"
                x={getPhaseSpaceXCoordinate(tick)}
                y={PHASE_SPACE_SIZE - 2}
                textAnchor="middle"
              >
                {tick}
              </text>
            ))}
            {phaseSpaceYTicks.map((tick) => (
              <text
                key={`y-label-${tick}`}
                className="phase-space-axis-value"
                x={PHASE_SPACE_PADDING - 4}
                y={getPhaseSpaceYCoordinate(tick) + 3}
                textAnchor="end"
              >
                {tick}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
});
