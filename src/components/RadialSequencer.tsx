import { memo, useEffect, useMemo, useRef, type PointerEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRhythmStore } from "../store/rhythmStore";
import { useSequencerUiStore } from "../store/sequencerUiStore";
import { PlayheadLine } from "./radial-sequencer/PlayheadLine";
import { CentroidArrow } from "./radial-sequencer/CentroidArrow";
import { LbdmGroupingOverlay } from "./radial-sequencer/LbdmGroupingOverlay";
import { RadialRingNotes } from "./radial-sequencer/RadialRingNotes";
import { RadialRingShell } from "./radial-sequencer/RadialRingShell";
import {
  CENTER,
  DRAG_THRESHOLD,
  LONG_PRESS_ROTATE_MS,
  OFFSET_GUIDE_WIDTH,
  OUTER_RADIUS,
  RING_GAP,
  RING_WIDTH,
  SIZE,
  getPointerCyclePosition,
  type RadialLineSegment,
  type RingPointerData,
} from "./radial-sequencer/shared";
import { polarToCartesian } from "../lib/geometry";
import { clampNoteLevel, getNoteLevel, MAX_NOTE_LEVEL, MIN_NOTE_LEVEL } from "../lib/rhythm";

interface RadialRingProps {
  ringId: string;
  ringIndex: number;
  onCellPointerDown: (event: PointerEvent<SVGPathElement>, ring: RingPointerData) => void;
  onCellClick: (ringId: string, stepIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent<SVGPathElement>, ringId: string, stepIndex: number) => void;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: RingPointerData,
    noteIndex: number,
  ) => void;
}

interface RadialRingNotesLayerProps {
  ringId: string;
  ringIndex: number;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: RingPointerData,
    noteIndex: number,
  ) => void;
}

const RadialRingShellLayer = memo(function RadialRingShellLayer({
  ringId,
  ringIndex,
  onCellPointerDown,
  onCellClick,
  onCellKeyDown,
}: RadialRingProps) {
  const isSelected = useRhythmStore((state) => state.selectedRingId === ringId);

  return (
    <g className={isSelected ? "ring selected" : "ring"}>
      <RadialRingShell
        ringId={ringId}
        ringIndex={ringIndex}
        onCellPointerDown={onCellPointerDown}
        onCellClick={onCellClick}
        onCellKeyDown={onCellKeyDown}
      />
    </g>
  );
}, (previous, next) =>
  previous.ringId === next.ringId &&
  previous.ringIndex === next.ringIndex,
);

const RadialRingNotesLayer = memo(function RadialRingNotesLayer({
  ringId,
  ringIndex,
  onNotePointerDown,
}: RadialRingNotesLayerProps) {
  return (
    <RadialRingNotes
      ringId={ringId}
      ringIndex={ringIndex}
      onNotePointerDown={onNotePointerDown}
    />
  );
}, (previous, next) =>
  previous.ringId === next.ringId &&
  previous.ringIndex === next.ringIndex,
);

export function RadialSequencer() {
  const ringIds = useRhythmStore(useShallow((state) => state.rings.map((ring) => ring.id)));
  const selectRing = useRhythmStore((state) => state.selectRing);
  const toggleNote = useRhythmStore((state) => state.toggleNote);
  const changeRingPhaseOffset = useRhythmStore((state) => state.changeRingPhaseOffset);
  const setNoteLevel = useRhythmStore((state) => state.setNoteLevel);
  const isAnyRingRotating = useSequencerUiStore((state) => state.ringDragState?.isRotating ?? false);
  const setUiRingDragState = useSequencerUiStore((state) => state.setRingDragState);
  const setUiNoteDragState = useSequencerUiStore((state) => state.setNoteDragState);
  const pendingRingDragRef = useRef<{
    ringId: string;
    initialOffset: number;
    previewOffset: number;
    startPosition: number;
  } | null>(null);
  const draggedRingIdRef = useRef<string | null>(null);
  const rotateTimerRef = useRef<number | null>(null);
  const zeroLineSegments = useMemo(() => {
    if (ringIds.length === 0) {
      return [{ fromRadius: 0, toRadius: OUTER_RADIUS + OFFSET_GUIDE_WIDTH }];
    }

    const segments: RadialLineSegment[] = [];
    const innermostOuterRadius = OUTER_RADIUS - (ringIds.length - 1) * (RING_WIDTH + RING_GAP);
    const innermostInnerRadius = innermostOuterRadius - RING_WIDTH;

    segments.push({ fromRadius: 0, toRadius: innermostInnerRadius });
    for (let ringIndex = ringIds.length - 2; ringIndex >= 0; ringIndex -= 1) {
      const outerRingInnerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP) - RING_WIDTH;
      const innerRingOuterRadius = OUTER_RADIUS - (ringIndex + 1) * (RING_WIDTH + RING_GAP);
      segments.push({ fromRadius: innerRingOuterRadius, toRadius: outerRingInnerRadius });
    }
    segments.push({ fromRadius: OUTER_RADIUS, toRadius: OUTER_RADIUS + OFFSET_GUIDE_WIDTH });

    return segments.filter((segment) => segment.toRadius > segment.fromRadius);
  }, [ringIds.length]);

  function clearRotateTimer() {
    if (rotateTimerRef.current !== null) {
      window.clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
  }

  useEffect(() => () => {
    pendingRingDragRef.current = null;
    useSequencerUiStore.getState().setRingDragState(null);
    useSequencerUiStore.getState().setNoteDragState(null);
    clearRotateTimer();
  }, []);

  function enterRotatingState(ringId: string) {
    const pendingRingDrag = pendingRingDragRef.current;
    if (!pendingRingDrag || pendingRingDrag.ringId !== ringId) {
      return;
    }

    draggedRingIdRef.current = ringId;
    setUiRingDragState({
      ...pendingRingDrag,
      isRotating: true,
    });
  }

  function handleDragMove(event: PointerEvent<SVGSVGElement>) {
    const currentNoteDragState = useSequencerUiStore.getState().noteDragState;
    if (currentNoteDragState) {
      const svg = event.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * SIZE;
      const y = ((event.clientY - rect.top) / rect.height) * SIZE;
      const distance = Math.hypot(x - CENTER.x, y - CENTER.y);
      const radialDelta =
        (distance - currentNoteDragState.startDistance) / currentNoteDragState.dragRange;
      const nextLevel = clampNoteLevel(
        currentNoteDragState.initialLevel +
        radialDelta * (MAX_NOTE_LEVEL - MIN_NOTE_LEVEL) * 1.8,
      );

      setUiNoteDragState({
        ...currentNoteDragState,
        previewLevel: nextLevel,
      });
      return;
    }

    const currentDragState = useSequencerUiStore.getState().ringDragState;
    const pendingRingDrag = pendingRingDragRef.current;
    const activeDragState =
      currentDragState ??
      (pendingRingDrag
        ? {
            ...pendingRingDrag,
            isRotating: false,
          }
        : null);
    if (!activeDragState) {
      return;
    }

    const ring = useRhythmStore.getState().rings.find((item) => item.id === activeDragState.ringId);
    if (!ring) {
      return;
    }

    const pointerPosition = getPointerCyclePosition(event.clientX, event.clientY, event.currentTarget);
    let delta = pointerPosition - activeDragState.startPosition;
    if (delta > 0.5) {
      delta -= 1;
    } else if (delta < -0.5) {
      delta += 1;
    }

    const nextOffset = Math.min(Math.max(activeDragState.initialOffset + delta * ring.division, 0), 1);
    const isStartingRotation = Math.abs(nextOffset - activeDragState.initialOffset) > DRAG_THRESHOLD;
    if (!activeDragState.isRotating && isStartingRotation) {
      clearRotateTimer();
      draggedRingIdRef.current = activeDragState.ringId;
    }

    if (activeDragState.isRotating || isStartingRotation) {
      const nextDragState = {
        ...activeDragState,
        previewOffset: nextOffset,
        isRotating: true,
      };
      pendingRingDragRef.current = {
        ringId: nextDragState.ringId,
        initialOffset: nextDragState.initialOffset,
        previewOffset: nextDragState.previewOffset,
        startPosition: nextDragState.startPosition,
      };
      setUiRingDragState(nextDragState);
    }
  }

  function handleDragEnd() {
    const currentNoteDragState = useSequencerUiStore.getState().noteDragState;
    if (currentNoteDragState) {
      setNoteLevel(
        currentNoteDragState.ringId,
        currentNoteDragState.noteIndex,
        currentNoteDragState.previewLevel,
      );
      setUiNoteDragState(null);
      return;
    }

    const currentDragState = useSequencerUiStore.getState().ringDragState;
    if (currentDragState?.isRotating) {
      changeRingPhaseOffset(currentDragState.ringId, currentDragState.previewOffset);
    }
    clearRotateTimer();
    pendingRingDragRef.current = null;
    setUiRingDragState(null);
    window.setTimeout(() => {
      draggedRingIdRef.current = null;
    }, 0);
  }

  function handleNotePointerDown(
    event: PointerEvent<SVGCircleElement>,
    ring: RingPointerData,
    noteIndex: number,
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectRing(ring.ringId);
    clearRotateTimer();
    pendingRingDragRef.current = null;
    setUiRingDragState(null);
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const startDistance = Math.hypot(x - CENTER.x, y - CENTER.y);
    const initialLevel = getNoteLevel(ring.noteLevels, noteIndex);
    setUiNoteDragState({
      ringId: ring.ringId,
      noteIndex,
      startDistance,
      initialLevel,
      dragRange: RING_WIDTH,
      previewLevel: initialLevel,
    });
  }

  function handleCellPointerDown(event: PointerEvent<SVGPathElement>, ring: RingPointerData) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    selectRing(ring.ringId);
    const nextDragState = {
      ringId: ring.ringId,
      initialOffset: ring.phaseOffset,
      previewOffset: ring.phaseOffset,
      startPosition: getPointerCyclePosition(event.clientX, event.clientY, svg),
    };
    pendingRingDragRef.current = nextDragState;
    clearRotateTimer();
    rotateTimerRef.current = window.setTimeout(() => {
      enterRotatingState(ring.ringId);
    }, LONG_PRESS_ROTATE_MS);
  }

  function handleCellClick(ringId: string, stepIndex: number) {
    if (draggedRingIdRef.current === ringId) {
      return;
    }

    selectRing(ringId);
    toggleNote(ringId, stepIndex);
  }

  function handleCellKeyDown(
    event: React.KeyboardEvent<SVGPathElement>,
    ringId: string,
    stepIndex: number,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRing(ringId);
      toggleNote(ringId, stepIndex);
    }
  }

  return (
    <section className="sequencer-card" aria-label="Circular rhythm editor">
      <svg
        className={isAnyRingRotating ? "radial-sequencer dragging" : "radial-sequencer"}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onLostPointerCapture={handleDragEnd}
      >
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

        {ringIds.map((ringId, ringIndex) => (
          <RadialRingShellLayer
            key={ringId}
            ringId={ringId}
            ringIndex={ringIndex}
            onCellPointerDown={handleCellPointerDown}
            onCellClick={handleCellClick}
            onCellKeyDown={handleCellKeyDown}
            onNotePointerDown={handleNotePointerDown}
          />
        ))}

        <LbdmGroupingOverlay />

        {ringIds.map((ringId, ringIndex) => (
          <RadialRingNotesLayer
            key={`${ringId}-notes`}
            ringId={ringId}
            ringIndex={ringIndex}
            onNotePointerDown={handleNotePointerDown}
          />
        ))}

        <PlayheadLine />
        <CentroidArrow />
      </svg>
    </section>
  );
}
