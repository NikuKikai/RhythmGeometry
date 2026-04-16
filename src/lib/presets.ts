import type { Preset, Ring } from "./rhythm";

export const RING_TEMPLATES: Ring[] = [
  {
    id: "kick",
    label: "Kick",
    division: 16,
    notes: [0, 4, 8, 12],
    voice: "kick",
    volume: 0.9,
    color: "#ff6b35",
  },
  {
    id: "snare",
    label: "Snare",
    division: 16,
    notes: [4, 12],
    voice: "snare",
    volume: 0.72,
    color: "#f7c948",
  },
  {
    id: "closed-hat",
    label: "Closed Hat",
    division: 16,
    notes: [0, 2, 4, 6, 8, 10, 12, 14],
    voice: "closedHat",
    volume: 0.42,
    color: "#6ee7b7",
  },
  {
    id: "open-hat",
    label: "Open Hat",
    division: 16,
    notes: [6, 14],
    voice: "openHat",
    volume: 0.38,
    color: "#60a5fa",
  },
  {
    id: "tom",
    label: "Tom",
    division: 12,
    notes: [3, 7, 11],
    voice: "tom",
    volume: 0.52,
    color: "#f472b6",
  },
];

export const DEFAULT_RINGS: Ring[] = RING_TEMPLATES.slice(0, 2);

export const PRESETS: Preset[] = [
  {
    id: "four-on-floor",
    name: "Four on Floor",
    division: 16,
    notes: [0, 4, 8, 12],
  },
  {
    id: "backbeat",
    name: "Backbeat",
    division: 16,
    notes: [4, 12],
  },
  {
    id: "eighths",
    name: "Eighth Notes",
    division: 16,
    notes: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  {
    id: "clave",
    name: "Son Clave",
    division: 16,
    notes: [0, 3, 6, 10, 12],
  },
  {
    id: "triplet-pulse",
    name: "Triplet Pulse",
    division: 12,
    notes: [0, 4, 8],
  },
  {
    id: "odd-sparks",
    name: "Odd Sparks",
    division: 7,
    notes: [0, 2, 5],
  },
];
