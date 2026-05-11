import { memo } from "react";
import { polarToCartesian } from "../../lib/geometry";
import { useRhythmStore } from "../../store/rhythmStore";
import { CENTER, OUTER_RADIUS } from "./shared";

export const PlayheadLine = memo(function PlayheadLine() {
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const playbackSectionId = useRhythmStore((state) => state.transport.playbackSectionId);
  const currentSectionId = useRhythmStore((state) => state.currentSectionId);

  if (playbackSectionId !== currentSectionId) {
    return null;
  }

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
