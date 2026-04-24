import { memo, type PointerEvent } from "react";
import { polarToCartesian } from "../../lib/geometry";
import { getNoteLevel } from "../../lib/rhythm";
import {
  getCycleBucketIndex,
  getTrackColor,
  INACTIVE_CYCLE_BUCKET,
  useRhythmStore,
} from "../../store/rhythmStore";
import { useSequencerUiStore } from "../../store/sequencerUiStore";
import { CENTER, NOTE_FLASH_WINDOW, OUTER_RADIUS, RING_GAP, RING_WIDTH, type RingPointerData } from "./shared";

interface RadialRingNotesProps {
  ringId: string;
  ringIndex: number;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: RingPointerData,
    noteIndex: number,
  ) => void;
}

interface NoteDotProps {
  ringId: string;
  ringIndex: number;
  note: number;
  noteRadius: number;
  dotRadius: number;
  onNotePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    ring: RingPointerData,
    noteIndex: number,
  ) => void;
}

const NoteDot = memo(function NoteDot({
  ringId,
  ringIndex,
  note,
  noteRadius,
  dotRadius,
  onNotePointerDown,
}: NoteDotProps) {
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const ring = useRhythmStore((state) => state.rings[ringIndex]);
  const ringDragState = useSequencerUiStore((state) =>
    state.ringDragState?.ringId === ringId ? state.ringDragState : null,
  );
  const draggedNote = useSequencerUiStore((state) =>
    state.noteDragState?.ringId === ringId && state.noteDragState.noteIndex === note
      ? state.noteDragState
      : null,
  );
  const phaseOffset = ringDragState?.isRotating ? ringDragState.previewOffset : ring.phaseOffset;
  const notePosition = ((note + phaseOffset) / ring.division) % 1;
  const cycleBucketIndex = getCycleBucketIndex(notePosition);
  const cycleBucketPosition = useRhythmStore(
    (state) => state.transport.cycleBuckets[cycleBucketIndex] ?? INACTIVE_CYCLE_BUCKET,
  );

  if (!ring || ring.id !== ringId) {
    return null;
  }

  const elapsedSinceTrigger =
    cycleBucketPosition === INACTIVE_CYCLE_BUCKET ? 1 : (cycleBucketPosition - notePosition + 1) % 1;
  const isTriggered =
    isPlaying &&
    cycleBucketPosition !== INACTIVE_CYCLE_BUCKET &&
    elapsedSinceTrigger < NOTE_FLASH_WINDOW;
  const level = draggedNote?.previewLevel ?? getNoteLevel(ring.noteLevels, note);
  const point = polarToCartesian(CENTER, noteRadius, (note + phaseOffset) / ring.division);
  const ringColor = getTrackColor(ringIndex);

  return (
    <g>
      <circle className="note-dot-base" cx={point.x} cy={point.y} r={dotRadius} />
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
        onPointerDown={(event) =>
          onNotePointerDown(event, {
            ringId: ring.id,
            phaseOffset: ring.phaseOffset,
            noteLevels: ring.noteLevels,
          }, note)}
      />
    </g>
  );
}, (previous, next) =>
  previous.ringId === next.ringId &&
  previous.ringIndex === next.ringIndex &&
  previous.note === next.note &&
  previous.noteRadius === next.noteRadius &&
  previous.dotRadius === next.dotRadius,
);

export const RadialRingNotes = memo(function RadialRingNotes({
  ringId,
  ringIndex,
  onNotePointerDown,
}: RadialRingNotesProps) {
  const notes = useRhythmStore((state) => state.rings[ringIndex]?.notes);
  const isSelected = useRhythmStore((state) => state.selectedRingId === ringId);

  if (!notes) {
    return null;
  }

  const outerRadius = OUTER_RADIUS - ringIndex * (RING_WIDTH + RING_GAP);
  const innerRadius = outerRadius - RING_WIDTH;
  const noteRadius = innerRadius + RING_WIDTH / 2;
  const dotRadius = isSelected ? 7 : 5;

  return (
    <>
      {notes.map((note) => (
        <NoteDot
          key={note}
          ringId={ringId}
          ringIndex={ringIndex}
          note={note}
          noteRadius={noteRadius}
          dotRadius={dotRadius}
          onNotePointerDown={onNotePointerDown}
        />
      ))}
    </>
  );
}, (previous, next) =>
  previous.ringId === next.ringId &&
  previous.ringIndex === next.ringIndex,
);
