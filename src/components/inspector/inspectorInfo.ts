export type InspectorInfoKey =
  | "track"
  | "adjacentIoi"
  | "rhythmicContours"
  | "intervalContent"
  | "gttmSyncopation"
  | "oddity";

export interface InspectorInfoDefinition {
  label: string;
  title: string;
  description: string;
}

export const INSPECTOR_INFO: Record<InspectorInfoKey, InspectorInfoDefinition> = {
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
    description: "Gray bars show full interval content, meaning all pairwise cyclic interval classes in the rhythm. Highlight bars overlay adjacent interval content, derived only from successive interonset intervals around the cycle. Entropy is shown for both distributions after normalization.",
  },
  gttmSyncopation: {
    label: "GTTM syncopation",
    title: "GTTM Accent Hierarchy",
    description: "Metrical strength per step inspired by GTTM hierarchy. The score is the normalized average weakness of active notes: higher means more off-beat placement.",
  },
  oddity: {
    label: "Oddity",
    title: "Rhythmic Oddity",
    description: "Counts onset pairs that split an even cycle into two equal halves. Zero means the rhythm satisfies the oddity property.",
  },
};
