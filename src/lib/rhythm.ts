export type DrumVoice = "kick" | "snare" | "closedHat" | "openHat" | "tom";

export const DRUM_VOICES: Array<{ value: DrumVoice; label: string }> = [
  { value: "kick", label: "Kick" },
  { value: "snare", label: "Snare" },
  { value: "closedHat", label: "Closed Hat" },
  { value: "openHat", label: "Open Hat" },
  { value: "tom", label: "Tom" },
];

export interface Ring {
  id: string;
  label: string;
  division: number;
  notes: number[];
  voice: DrumVoice;
  volume: number;
  color: string;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  division: number;
  notes: number[];
}

export interface GroovePreset {
  id: string;
  name: string;
  category: string;
  rings: Array<Omit<Ring, "id" | "color">>;
}

export interface TransportState {
  bpm: number;
  masterVolume: number;
  isPlaying: boolean;
  cyclePosition: number;
}

export interface ScheduledStep {
  ringId: string;
  noteIndex: number;
  position: number;
}

export const MIN_DIVISION = 1;
export const MAX_DIVISION = 32;
export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const USER_PRESET_CATEGORY = "Favorites";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampDivision(value: number): number {
  return Math.round(clamp(value, MIN_DIVISION, MAX_DIVISION));
}

export function clampBpm(value: number): number {
  return Math.round(clamp(value, MIN_BPM, MAX_BPM));
}

export function normalizeNotes(notes: number[], division: number): number[] {
  const nextDivision = clampDivision(division);
  return Array.from(
    new Set(
      notes
        .map((note) => Math.round(note))
        .filter((note) => note >= 0 && note < nextDivision),
    ),
  ).sort((left, right) => left - right);
}

export function toggleNote(notes: number[], noteIndex: number, division: number): number[] {
  const normalized = normalizeNotes(notes, division);
  if (noteIndex < 0 || noteIndex >= division) {
    return normalized;
  }

  if (normalized.includes(noteIndex)) {
    return normalized.filter((note) => note !== noteIndex);
  }

  return normalizeNotes([...normalized, noteIndex], division);
}

export function changeRingDivision(ring: Ring, division: number): Ring {
  const nextDivision = clampDivision(division);
  return {
    ...ring,
    division: nextDivision,
    notes: normalizeNotes(ring.notes, nextDivision),
  };
}

export function changeRingVoice(ring: Ring, voice: DrumVoice): Ring {
  return {
    ...ring,
    voice,
  };
}

export function applyPresetToRing(ring: Ring, preset: Preset): Ring {
  return {
    ...ring,
    division: clampDivision(preset.division),
    notes: normalizeNotes(preset.notes, preset.division),
  };
}

export function getScheduledSteps(rings: Ring[]): ScheduledStep[] {
  return rings.flatMap((ring) =>
    normalizeNotes(ring.notes, ring.division).map((noteIndex) => ({
      ringId: ring.id,
      noteIndex,
      position: noteIndex / ring.division,
    })),
  );
}

export function getStepPosition(noteIndex: number, division: number): number {
  if (division <= 0) {
    return 0;
  }

  return noteIndex / division;
}
