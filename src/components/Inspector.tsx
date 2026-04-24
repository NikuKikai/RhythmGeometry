import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getAdjacentInteronsetIntervals,
  getFullIntervalContent,
  getRhythmicContours,
} from "../lib/rhythm";
import { useRhythmStore } from "../store/rhythmStore";

function formatSequence(values: Array<number | string>): string {
  return values.length > 0 ? values.join(" ") : "None";
}

export function Inspector() {
  const selectedRingId = useRhythmStore((state) => state.selectedRingId);
  const selectedRing = useRhythmStore(
    useShallow((state) => {
      const currentRing =
        state.rings.find((ring) => ring.id === selectedRingId) ??
        state.rings[0];
      return currentRing
        ? {
            label: currentRing.label,
            division: currentRing.division,
            notes: currentRing.notes,
          }
        : null;
    }),
  );
  const adjacentIntervals = useMemo(
    () =>
      selectedRing
        ? getAdjacentInteronsetIntervals(selectedRing.notes, selectedRing.division)
        : [],
    [selectedRing],
  );
  const rhythmicContours = useMemo(
    () => getRhythmicContours(adjacentIntervals),
    [adjacentIntervals],
  );
  const intervalContent = useMemo(
    () =>
      selectedRing ? getFullIntervalContent(selectedRing.notes, selectedRing.division) : [],
    [selectedRing],
  );
  const maxIntervalCount = Math.max(1, ...intervalContent.map((item) => item.count));

  return (
    <aside className="inspector-panel" aria-label="Inspector">
      <div className="panel-heading">
        <p className="eyebrow">Inspector</p>
      </div>

      <div className="inspector-body">
        <section className="inspector-section">
          <p className="inspector-label">Track</p>
          <p className="inspector-value">{selectedRing?.label ?? "None"}</p>
        </section>

        <section className="inspector-section">
          <p className="inspector-label">Adjacent IOI</p>
          <p className="inspector-sequence">{formatSequence(adjacentIntervals)}</p>
        </section>

        <section className="inspector-section">
          <p className="inspector-label">Rhythmic Contours</p>
          <p className="inspector-sequence">{formatSequence(rhythmicContours)}</p>
        </section>

        <section className="inspector-section inspector-histogram-section">
          <p className="inspector-label">Interval Content</p>
          <div className="interval-histogram" aria-label="Full interval content histogram">
            {intervalContent.map((item) => (
              <div className="interval-column" key={item.interval}>
                <span className="interval-count">{item.count}</span>
                <div className="interval-bar-track">
                  <div
                    className="interval-bar"
                    style={{ height: `${(item.count / maxIntervalCount) * 100}%` }}
                  />
                </div>
                <span className="interval-index">{item.interval}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
