import { memo, useEffect, useMemo, useRef, type PointerEvent } from "react";
import { getNotePolygonPoints, getRingCellPath, polarToCartesian } from "../lib/geometry";
import { clampNoteLevel, getNoteLevel, MAX_NOTE_LEVEL, MIN_NOTE_LEVEL, type Ring } from "../lib/rhythm";
import {
  getCycleBucketIndex,
  getTrackColor,
  INACTIVE_CYCLE_BUCKET,
  useRhythmStore,
} from "../store/rhythmStore";
import { useSequencerUiStore } from "../store/sequencerUiStore";

const SIZE = 620;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const OUTER_RADIUS = 270;
const RING_WIDTH = 38;
const RING_GAP = 12;
const NOTE_FLASH_WINDOW = 0.035;
const DRAG_THRESHOLD = 0.006;
const LONG_PRESS_ROTATE_MS = 500;
const OFFSET_GUIDE_WIDTH = 4;

interface RadialLineSegment {
  fromRadius: number;
  toRadius: number;
}

interface RadialRingProps {
  ring: Ring;
  ringIndex: number;
  onCellPointerDown: (event: PointerEvent<SVGPathElement>, ring: Ring) => void;
  onCellClick: (ringId: string, stepIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent<SVGPathElement>, ringId: string, stepIndex: number) => void;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: Ring,
    noteIndex: number,
  ) => void;
}

interface RadialRingShellProps {
  ring: Ring;
  ringIndex: number;
  ringColor: string;
  onCellPointerDown: (event: PointerEvent<SVGPathElement>, ring: Ring) => void;
  onCellClick: (ringId: string, stepIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent<SVGPathElement>, ringId: string, stepIndex: number) => void;
}

interface RadialRingNotesProps {
  ring: Ring;
  ringIndex: number;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: Ring,
    noteIndex: number,
  ) => void;
}

interface NoteDotProps {
  ring: Ring;
  note: number;
  ringColor: string;
  noteRadius: number;
  dotRadius: number;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: Ring,
    noteIndex: number,
  ) => void;
}

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

const RadialRingShell = memo(function RadialRingShell({
  ring,
  ringIndex,
  ringColor,
  onCellPointerDown,
  onCellClick,
  onCellKeyDown,
}: RadialRingShellProps) {
  const ringDragState = useSequencerUiStore((state) =>
    state.ringDragState?.ringId === ring.id ? state.ringDragState : null,
  );
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
            onPointerDown={(event) => onCellPointerDown(event, ring)}
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
  previous.ring === next.ring &&
  previous.ringIndex === next.ringIndex &&
  previous.ringColor === next.ringColor,
);

const NoteDot = memo(function NoteDot({
  ring,
  note,
  ringColor,
  noteRadius,
  dotRadius,
  onNotePointerDown,
}: NoteDotProps) {
  const ringDragState = useSequencerUiStore((state) =>
    state.ringDragState?.ringId === ring.id ? state.ringDragState : null,
  );
  const draggedNote = useSequencerUiStore((state) =>
    state.noteDragState?.ringId === ring.id && state.noteDragState.noteIndex === note
      ? state.noteDragState
      : null,
  );
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const phaseOffset = ringDragState?.isRotating ? ringDragState.previewOffset : ring.phaseOffset;
  const point = polarToCartesian(CENTER, noteRadius, (note + phaseOffset) / ring.division);
  const notePosition = ((note + phaseOffset) / ring.division) % 1;
  const cycleBucketIndex = getCycleBucketIndex(notePosition);
  const cycleBucketPosition = useRhythmStore(
    (state) => state.transport.cycleBuckets[cycleBucketIndex] ?? INACTIVE_CYCLE_BUCKET,
  );
  const elapsedSinceTrigger =
    cycleBucketPosition === INACTIVE_CYCLE_BUCKET ? 1 : (cycleBucketPosition - notePosition + 1) % 1;
  const isTriggered =
    isPlaying &&
    cycleBucketPosition !== INACTIVE_CYCLE_BUCKET &&
    elapsedSinceTrigger < NOTE_FLASH_WINDOW;
  const level = draggedNote?.previewLevel ?? getNoteLevel(ring.noteLevels, note);

  return (
    <g>
      <circle
        className="note-dot-base"
        cx={point.x}
        cy={point.y}
        r={dotRadius}
      />
      <circle
        className={isTriggered ? "note-dot-fill triggered" : "note-dot-fill"}
        cx={point.x}
        cy={point.y}
        r={dotRadius * level}
        style={{
          "--ring-color": ringColor,
        } as React.CSSProperties}
      />
      <circle
        className="note-hit-area"
        cx={point.x}
        cy={point.y}
        r={dotRadius}
        onPointerDown={(event) => onNotePointerDown(event, ring, note)}
      />
    </g>
  );
}, (previous, next) =>
  previous.ring === next.ring &&
  previous.note === next.note &&
  previous.ringColor === next.ringColor &&
  previous.noteRadius === next.noteRadius &&
  previous.dotRadius === next.dotRadius,
);

const RadialRingNotes = memo(function RadialRingNotes({
  ring,
  ringIndex,
  onNotePointerDown,
}: RadialRingNotesProps) {
  const isSelected = useRhythmStore((state) => state.selectedRingId === ring.id);
  const ringColor = getTrackColor(ringIndex);
  const outerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP);
  const innerRadius = outerRadius - RING_WIDTH;
  const noteRadius = innerRadius + RING_WIDTH / 2;
  const dotRadius = isSelected ? 7 : 5;

  return (
    <>
      {ring.notes.map((note) => (
        <NoteDot
          key={note}
          ring={ring}
          note={note}
          ringColor={ringColor}
          noteRadius={noteRadius}
          dotRadius={dotRadius}
          onNotePointerDown={onNotePointerDown}
        />
      ))}
    </>
  );
}, (previous, next) =>
  previous.ring === next.ring &&
  previous.ringIndex === next.ringIndex,
);

const RadialRing = memo(function RadialRing({
  ring,
  ringIndex,
  onCellPointerDown,
  onCellClick,
  onCellKeyDown,
  onNotePointerDown,
}: RadialRingProps) {
  const isSelected = useRhythmStore((state) => state.selectedRingId === ring.id);
  const ringColor = getTrackColor(ringIndex);
  return (
    <g className={isSelected ? "ring selected" : "ring"}>
      <RadialRingShell
        ring={ring}
        ringIndex={ringIndex}
        ringColor={ringColor}
        onCellPointerDown={onCellPointerDown}
        onCellClick={onCellClick}
        onCellKeyDown={onCellKeyDown}
      />
      <RadialRingNotes
        ring={ring}
        ringIndex={ringIndex}
        onNotePointerDown={onNotePointerDown}
      />
    </g>
  );
}, (previous, next) =>
  previous.ring === next.ring &&
  previous.ringIndex === next.ringIndex,
);

const PlayheadLine = memo(function PlayheadLine() {
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const playheadStart = polarToCartesian(CENTER, OUTER_RADIUS + 8, cyclePosition);
  const playheadEnd = polarToCartesian(CENTER, OUTER_RADIUS + 30, cyclePosition);

  return (
    <line
      className="playhead-line"
      x1={playheadStart.x}
      y1={playheadStart.y}
      x2={playheadEnd.x}
      y2={playheadEnd.y}
    />
  );
});

export function RadialSequencer() {
  const rawRings = useRhythmStore((state) => state.rings);
  const selectRing = useRhythmStore((state) => state.selectRing);
  const toggleNote = useRhythmStore((state) => state.toggleNote);
  const changeRingPhaseOffset = useRhythmStore((state) => state.changeRingPhaseOffset);
  const setNoteLevel = useRhythmStore((state) => state.setNoteLevel);
  const isAnyRingRotating = useSequencerUiStore((state) => state.ringDragState?.isRotating ?? false);
  const setUiRingDragState = useSequencerUiStore((state) => state.setRingDragState);
  const setUiNoteDragState = useSequencerUiStore((state) => state.setNoteDragState);
  const draggedRingIdRef = useRef<string | null>(null);
  const rotateTimerRef = useRef<number | null>(null);
  const rings = rawRings;
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

  function clearRotateTimer() {
    if (rotateTimerRef.current !== null) {
      window.clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
  }

  useEffect(() => () => {
    useSequencerUiStore.getState().setRingDragState(null);
    useSequencerUiStore.getState().setNoteDragState(null);
    clearRotateTimer();
  }, []);

  function enterRotatingState(ringId: string) {
    draggedRingIdRef.current = ringId;
    const current = useSequencerUiStore.getState().ringDragState;
    if (current && current.ringId === ringId) {
      const nextDragState = {
        ...current,
        isRotating: true,
      };
      setUiRingDragState(nextDragState);
    }
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
    if (!currentDragState) {
      return;
    }

    const ring = rings.find((item) => item.id === currentDragState.ringId);
    if (!ring) {
      return;
    }

    const pointerPosition = getPointerCyclePosition(event.clientX, event.clientY, event.currentTarget);
    let delta = pointerPosition - currentDragState.startPosition;
    if (delta > 0.5) {
      delta -= 1;
    } else if (delta < -0.5) {
      delta += 1;
    }

    const nextOffset = Math.min(Math.max(currentDragState.initialOffset + delta * ring.division, 0), 1);
    const isStartingRotation = Math.abs(nextOffset - currentDragState.initialOffset) > DRAG_THRESHOLD;
    if (!currentDragState.isRotating && isStartingRotation) {
      clearRotateTimer();
      draggedRingIdRef.current = currentDragState.ringId;
    }

    if (currentDragState.isRotating || isStartingRotation) {
      const nextDragState = {
        ...currentDragState,
        previewOffset: nextOffset,
        isRotating: true,
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
    setUiRingDragState(null);
    window.setTimeout(() => {
      draggedRingIdRef.current = null;
    }, 0);
  }

  function handleNotePointerDown(
    event: PointerEvent<SVGCircleElement>,
    ring: Ring,
    noteIndex: number,
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectRing(ring.id);
    clearRotateTimer();
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
      ringId: ring.id,
      noteIndex,
      startDistance,
      initialLevel,
      dragRange: RING_WIDTH,
      previewLevel: initialLevel,
    });
  }

  function handleCellPointerDown(event: PointerEvent<SVGPathElement>, ring: Ring) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    selectRing(ring.id);
    const nextDragState = {
      ringId: ring.id,
      initialOffset: ring.phaseOffset,
      previewOffset: ring.phaseOffset,
      startPosition: getPointerCyclePosition(event.clientX, event.clientY, svg),
      isRotating: false,
    };
    setUiRingDragState(nextDragState);
    clearRotateTimer();
    rotateTimerRef.current = window.setTimeout(() => {
      enterRotatingState(ring.id);
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
          return (
            <RadialRing
              key={ring.id}
              ring={ring}
              ringIndex={ringIndex}
              onCellPointerDown={handleCellPointerDown}
              onCellClick={handleCellClick}
              onCellKeyDown={handleCellKeyDown}
              onNotePointerDown={handleNotePointerDown}
            />
          );
        })}

        <PlayheadLine />
      </svg>
    </section>
  );
}
