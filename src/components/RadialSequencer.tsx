import { useMemo, useRef, useState, type PointerEvent } from "react";
import { getNotePolygonPoints, getRingCellPath, polarToCartesian } from "../lib/geometry";
import { colorRings, useRhythmStore } from "../store/rhythmStore";

const SIZE = 620;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const OUTER_RADIUS = 270;
const RING_WIDTH = 38;
const RING_GAP = 12;
const NOTE_FLASH_WINDOW = 0.035;
const DRAG_THRESHOLD = 0.006;
const LONG_PRESS_ROTATE_MS = 500;
const OFFSET_GUIDE_WIDTH = 4;

interface RingDragState {
  ringId: string;
  initialOffset: number;
  startPosition: number;
  isRotating: boolean;
}

interface RadialLineSegment {
  fromRadius: number;
  toRadius: number;
}

export function RadialSequencer() {
  const rawRings = useRhythmStore((state) => state.rings);
  const selectedRingId = useRhythmStore((state) => state.selectedRingId);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const selectRing = useRhythmStore((state) => state.selectRing);
  const toggleNote = useRhythmStore((state) => state.toggleNote);
  const changeRingPhaseOffset = useRhythmStore((state) => state.changeRingPhaseOffset);
  const [dragState, setDragState] = useState<RingDragState | null>(null);
  const draggedRingIdRef = useRef<string | null>(null);
  const rotateTimerRef = useRef<number | null>(null);
  const rings = useMemo(() => colorRings(rawRings), [rawRings]);
  const playheadStart = polarToCartesian(CENTER, OUTER_RADIUS + 8, cyclePosition);
  const playheadEnd = polarToCartesian(CENTER, OUTER_RADIUS + 30, cyclePosition);
  const zeroLineSegments = useMemo(() => {
    if (rings.length === 0) {
      return [{ fromRadius: 0, toRadius: OUTER_RADIUS + OFFSET_GUIDE_WIDTH }];
    }

    const segments: RadialLineSegment[] = [];
    const innermostOuterRadius = OUTER_RADIUS - (rings.length - 1) * (RING_WIDTH + RING_GAP);
    const innermostInnerRadius = innermostOuterRadius - RING_WIDTH;

    segments.push({ fromRadius: 0, toRadius: innermostInnerRadius });
    for (let ringIndex = rings.length - 2; ringIndex >= 0; ringIndex -= 1) {
      const outerRingInnerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP) - RING_WIDTH;
      const innerRingOuterRadius = OUTER_RADIUS - (ringIndex + 1) * (RING_WIDTH + RING_GAP);
      segments.push({ fromRadius: innerRingOuterRadius, toRadius: outerRingInnerRadius });
    }
    segments.push({ fromRadius: OUTER_RADIUS, toRadius: OUTER_RADIUS + OFFSET_GUIDE_WIDTH });

    return segments.filter((segment) => segment.toRadius > segment.fromRadius);
  }, [rings.length]);

  function getPointerCyclePosition(clientX: number, clientY: number, svg: SVGSVGElement): number {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = ((clientY - rect.top) / rect.height) * SIZE;
    const angle = Math.atan2(y - CENTER.y, x - CENTER.x) + Math.PI / 2;
    return ((angle / (Math.PI * 2)) % 1 + 1) % 1;
  }

  function getOffsetArcPath(radius: number, division: number, phaseOffset: number): string {
    if (phaseOffset <= 0) {
      return "";
    }

    const endPosition = phaseOffset / division;
    const start = polarToCartesian(CENTER, radius, 0);
    const end = polarToCartesian(CENTER, radius, endPosition);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  }

  function enterRotatingState(ringId: string) {
    draggedRingIdRef.current = ringId;
    setDragState((current) =>
      current && current.ringId === ringId
        ? {
          ...current,
          isRotating: true,
        }
        : current,
    );
  }

  function clearRotateTimer() {
    if (rotateTimerRef.current !== null) {
      window.clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
  }

  function handleDragMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragState) {
      return;
    }

    const ring = rings.find((item) => item.id === dragState.ringId);
    if (!ring) {
      return;
    }

    const pointerPosition = getPointerCyclePosition(event.clientX, event.clientY, event.currentTarget);
    let delta = pointerPosition - dragState.startPosition;
    if (delta > 0.5) {
      delta -= 1;
    } else if (delta < -0.5) {
      delta += 1;
    }

    const nextOffset = Math.min(Math.max(dragState.initialOffset + delta * ring.division, 0), 1);
    const isStartingRotation = Math.abs(nextOffset - dragState.initialOffset) > DRAG_THRESHOLD;
    if (!dragState.isRotating && isStartingRotation) {
      clearRotateTimer();
      enterRotatingState(dragState.ringId);
    }

    if (dragState.isRotating || isStartingRotation) {
      changeRingPhaseOffset(dragState.ringId, nextOffset);
    }
  }

  function handleDragEnd() {
    clearRotateTimer();
    setDragState(null);
    window.setTimeout(() => {
      draggedRingIdRef.current = null;
    }, 0);
  }

  return (
    <section className="sequencer-card" aria-label="Circular rhythm editor">
      <svg
        className={dragState?.isRotating ? "radial-sequencer dragging" : "radial-sequencer"}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onLostPointerCapture={handleDragEnd}
      >
        {/* <circle className="sequencer-core" cx={CENTER.x} cy={CENTER.y} r="68" /> */}
        {zeroLineSegments.map((segment) => {
          const start = polarToCartesian(CENTER, segment.fromRadius, 0);
          const end = polarToCartesian(CENTER, segment.toRadius, 0);

          return (
            <line
              className="zero-angle-line"
              key={`${segment.fromRadius}-${segment.toRadius}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}

        {rings.map((ring, ringIndex) => {
          const outerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP);
          const innerRadius = outerRadius - RING_WIDTH;
          const noteRadius = innerRadius + RING_WIDTH / 2;
          const polygonPoints = getNotePolygonPoints(
            ring.notes,
            ring.division,
            CENTER,
            noteRadius,
            ring.phaseOffset,
          );
          const isSelected = ring.id === selectedRingId;
          const isRotating = dragState?.ringId === ring.id && dragState.isRotating;
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
          const offsetArcPath = getOffsetArcPath(offsetArcRadius, ring.division, ring.phaseOffset);

          return (
            <g key={ring.id} className={isSelected ? "ring selected" : "ring"}>
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
                    {ring.phaseOffset.toFixed(3)}
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
                      phaseOffset: ring.phaseOffset,
                      gapRadians: 0,
                    })}
                    className={active ? "ring-cell active" : "ring-cell"}
                    style={{
                      "--ring-color": ring.color,
                    } as React.CSSProperties}
                    onPointerDown={(event) => {
                      const svg = event.currentTarget.ownerSVGElement;
                      if (!svg) {
                        return;
                      }
                      event.currentTarget.setPointerCapture(event.pointerId);
                      selectRing(ring.id);
                      setDragState({
                        ringId: ring.id,
                        initialOffset: ring.phaseOffset,
                        startPosition: getPointerCyclePosition(event.clientX, event.clientY, svg),
                        isRotating: false,
                      });
                      clearRotateTimer();
                      rotateTimerRef.current = window.setTimeout(() => {
                        enterRotatingState(ring.id);
                      }, LONG_PRESS_ROTATE_MS);
                    }}
                    onClick={() => {
                      if (draggedRingIdRef.current === ring.id) {
                        return;
                      }
                      selectRing(ring.id);
                      toggleNote(ring.id, stepIndex);
                    }}
                    aria-label={`${ring.label} step ${stepIndex + 1}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRing(ring.id);
                        toggleNote(ring.id, stepIndex);
                      }
                    }}
                  />
                );
              })}

              {ring.notes.length > 1 && (
                <polygon
                  className="note-polygon"
                  points={polygonPoints}
                  style={{
                    "--ring-color": ring.color,
                  } as React.CSSProperties}
                />
              )}

              {ring.notes.map((note) => {
                const point = polarToCartesian(CENTER, noteRadius, (note + ring.phaseOffset) / ring.division);
                const notePosition = ((note + ring.phaseOffset) / ring.division) % 1;
                const elapsedSinceTrigger = (cyclePosition - notePosition + 1) % 1;
                const isTriggered = isPlaying && elapsedSinceTrigger < NOTE_FLASH_WINDOW;

                return (
                  <circle
                    key={note}
                    className={isTriggered ? "note-dot triggered" : "note-dot"}
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? 7 : 5}
                    style={{
                      "--ring-color": ring.color,
                    } as React.CSSProperties}
                  />
                );
              })}

            </g>
          );
        })}

        <line
          className="playhead-line"
          x1={playheadStart.x}
          y1={playheadStart.y}
          x2={playheadEnd.x}
          y2={playheadEnd.y}
        />
      </svg>
    </section>
  );
}
