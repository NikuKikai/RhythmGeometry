import { useMemo, useState, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getAdjacentInteronsetIntervals,
  getGttmAccentHierarchy,
  getGttmSyncopation,
  getFullIntervalContent,
  getRhythmicContours,
} from "../lib/inspectorAnalysis";
import { useRhythmStore } from "../store/rhythmStore";
import { InfoIcon } from "./Icons";

type InspectorInfoKey = "track" | "adjacentIoi" | "rhythmicContours" | "intervalContent" | "gttmSyncopation";

interface InspectorInfoDefinition {
  label: string;
  title: string;
  description: string;
}

const INSPECTOR_INFO: Record<InspectorInfoKey, InspectorInfoDefinition> = {
  track: {
    label: "Track",
    title: "Track",
    description: "The currently selected track. All Inspector metrics are computed from this track only.",
  },
  adjacentIoi: {
    label: "Adjacent IOI",
    title: "Adjacent Interonset Intervals",
    description: "Distances in steps between each hit and the next hit in the cycle, including the wrap back to the first hit.",
  },
  rhythmicContours: {
    label: "Rhythmic Contours",
    title: "Rhythmic Contours",
    description: "Direction of interval changes around the cycle: '+' means longer, '-' means shorter, '=' means unchanged.",
  },
  intervalContent: {
    label: "Interval Content",
    title: "Full Interval Content",
    description: "Histogram of pairwise cyclic interval classes in the rhythm. Higher bars mean that interval occurs more often.",
  },
  gttmSyncopation: {
    label: "GTTM syncopation",
    title: "GTTM Accent Hierarchy",
    description: "Metrical strength per step inspired by GTTM hierarchy. The score is the normalized average weakness of active notes: higher means more off-beat placement.",
  },
};

interface InspectorLabelProps {
  infoKey: InspectorInfoKey;
  valueText?: string;
  onOpenInfo: (key: InspectorInfoKey) => void;
}

function InspectorLabel({ infoKey, valueText, onOpenInfo }: InspectorLabelProps) {
  const info = INSPECTOR_INFO[infoKey];

  return (
    <div className="inspector-label-row">
      <div className="inspector-label-left">
        <p className="inspector-label">{info.label}</p>
        <button
          className="inspector-info-button"
          type="button"
          aria-label={`About ${info.label}`}
          title={`About ${info.label}`}
          onClick={() => onOpenInfo(infoKey)}
        >
          <InfoIcon className="inspector-info-icon" />
        </button>
      </div>
      {valueText && <span className="inspector-label-value">{valueText}</span>}
    </div>
  );
}

function formatSequence(values: Array<number | string>): string {
  return values.length > 0 ? values.join(" ") : "None";
}

function getSyncopationLabelStride(division: number): number {
  if (division <= 8) {
    return 1;
  }
  if (division <= 16) {
    return 2;
  }
  if (division <= 24) {
    return 3;
  }
  return 4;
}

export function Inspector() {
  const [openInfoKey, setOpenInfoKey] = useState<InspectorInfoKey | null>(null);
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
  const gttmHierarchy = useMemo(
    () => (selectedRing ? getGttmAccentHierarchy(selectedRing.notes, selectedRing.division) : []),
    [selectedRing],
  );
  const gttmSyncopation = useMemo(
    () => (selectedRing ? getGttmSyncopation(selectedRing.notes, selectedRing.division) : 0),
    [selectedRing],
  );
  const maxGttmAccent = Math.max(1, ...gttmHierarchy.map((item) => item.accent));
  const syncopationLabelStride = selectedRing ? getSyncopationLabelStride(selectedRing.division) : 1;
  const intervalHistogramStyle = { "--histogram-columns": intervalContent.length } as CSSProperties;
  const syncopationHistogramStyle = { "--histogram-columns": gttmHierarchy.length } as CSSProperties;
  const openInfo = openInfoKey ? INSPECTOR_INFO[openInfoKey] : null;

  return (
    <>
      <aside className="inspector-panel" aria-label="Inspector">
        <div className="panel-heading">
          <p className="eyebrow">Inspector</p>
        </div>

        <div className="inspector-body">
          <section className="inspector-section">
            <InspectorLabel infoKey="track" onOpenInfo={setOpenInfoKey} />
            <p className="inspector-value">{selectedRing?.label ?? "None"}</p>
          </section>

          <section className="inspector-section">
            <InspectorLabel infoKey="adjacentIoi" onOpenInfo={setOpenInfoKey} />
            <p className="inspector-sequence">{formatSequence(adjacentIntervals)}</p>
          </section>

          <section className="inspector-section">
            <InspectorLabel infoKey="rhythmicContours" onOpenInfo={setOpenInfoKey} />
            <p className="inspector-sequence">{formatSequence(rhythmicContours)}</p>
          </section>

          <section className="inspector-section inspector-histogram-section">
            <InspectorLabel infoKey="intervalContent" onOpenInfo={setOpenInfoKey} />
            <div
              className="histogram"
              style={intervalHistogramStyle}
              aria-label="Full interval content histogram"
            >
              {intervalContent.map((item) => (
                <div className="histogram-column" key={item.interval}>
                  <span>{item.count}</span>
                  <div className="histogram-bar-track">
                    <div
                      className="histogram-bar"
                      style={{ height: `${(item.count / maxIntervalCount) * 100}%` }}
                    />
                  </div>
                  <span>{item.interval}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="inspector-section inspector-histogram-section">
            <InspectorLabel
              infoKey="gttmSyncopation"
              valueText={gttmSyncopation.toFixed(2)}
              onOpenInfo={setOpenInfoKey}
            />
            <div
              className="histogram"
              style={syncopationHistogramStyle}
              aria-label="GTTM accent hierarchy histogram"
            >
              {gttmHierarchy.map((item) => (
                <div className="histogram-column histogram-column" key={item.step}>
                  <div className="histogram-bar-track">
                    <div
                      className={item.isNote ? "histogram-bar histogram-bar-note" : "histogram-bar histogram-bar-muted"}
                      style={{ height: `${(item.accent / maxGttmAccent) * 100}%` }}
                    />
                  </div>
                  <span>
                    {item.step % syncopationLabelStride === 0 ? item.step + 1 : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {openInfo && (
        <div
          className="inspector-info-backdrop"
          role="presentation"
          onClick={() => setOpenInfoKey(null)}
        >
          <article
            className="inspector-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${openInfo.title} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="inspector-info-title">{openInfo.title}</h3>
            <p className="inspector-info-text">{openInfo.description}</p>
            <div className="inspector-info-actions">
              <button className="ui-button" type="button" onClick={() => setOpenInfoKey(null)}>
                Close
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
