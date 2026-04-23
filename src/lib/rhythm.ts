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
  noteLevels?: Partial<Record<number, number>>;
  phaseOffset: number;
  voice: DrumVoice;
  volume: number;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  division: number;
  notes: number[];
  noteLevels?: Partial<Record<number, number>>;
  phaseOffset?: number;
}

export interface GroovePreset {
  id: string;
  name: string;
  category: string;
  rings: Array<Omit<Ring, "id" | "phaseOffset" | "noteLevels"> & {
    noteLevels?: Partial<Record<number, number>>;
    phaseOffset?: number;
  }>;
}

export interface TransportState {
  bpm: number;
  masterVolume: number;
  isPlaying: boolean;
  cyclePosition: number;
  cycleBuckets: number[];
}

export interface ScheduledStep {
  ringId: string;
  noteIndex: number;
  position: number;
}

export interface IntervalContentBin {
  interval: number;
  count: number;
}

export const MIN_DIVISION = 1;
export const MAX_DIVISION = 32;
export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const USER_PRESET_CATEGORY = "Favorites";
export const MIN_NOTE_LEVEL = 0.1;
export const MAX_NOTE_LEVEL = 1;
const MIN_PLAYBACK_NOTE_LEVEL = 0.12;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampDivision(value: number): number {
  return Math.round(clamp(value, MIN_DIVISION, MAX_DIVISION));
}

export function clampBpm(value: number): number {
  return Math.round(clamp(value, MIN_BPM, MAX_BPM));
}

export function clampPhaseOffset(value: number): number {
  return clamp(value, 0, 1);
}

export function clampNoteLevel(value: number): number {
  return clamp(value, MIN_NOTE_LEVEL, MAX_NOTE_LEVEL);
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

export function normalizeNoteLevels(
  noteLevels: Partial<Record<number, number>> | undefined,
  notes: number[],
  division: number,
): Partial<Record<number, number>> {
  const normalizedNotes = normalizeNotes(notes, division);
  const nextLevels: Partial<Record<number, number>> = {};

  normalizedNotes.forEach((note) => {
    nextLevels[note] = clampNoteLevel(noteLevels?.[note] ?? MAX_NOTE_LEVEL);
  });

  return nextLevels;
}

export function getNoteLevel(
  noteLevels: Partial<Record<number, number>> | undefined,
  noteIndex: number,
): number {
  return clampNoteLevel(noteLevels?.[noteIndex] ?? MAX_NOTE_LEVEL);
}

export function getPlaybackNoteLevel(level: number): number {
  const normalized = (clampNoteLevel(level) - MIN_NOTE_LEVEL) / (MAX_NOTE_LEVEL - MIN_NOTE_LEVEL);
  return MIN_PLAYBACK_NOTE_LEVEL + normalized * normalized * (MAX_NOTE_LEVEL - MIN_PLAYBACK_NOTE_LEVEL);
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

export function toggleNoteLevel(
  noteLevels: Partial<Record<number, number>> | undefined,
  notes: number[],
  noteIndex: number,
  division: number,
): Partial<Record<number, number>> {
  const normalizedNotes = normalizeNotes(notes, division);
  const nextLevels = normalizeNoteLevels(noteLevels, normalizedNotes, division);

  if (!normalizedNotes.includes(noteIndex)) {
    nextLevels[noteIndex] = MAX_NOTE_LEVEL;
    return nextLevels;
  }

  delete nextLevels[noteIndex];
  return nextLevels;
}

export function setNoteLevel(
  noteLevels: Partial<Record<number, number>> | undefined,
  notes: number[],
  noteIndex: number,
  level: number,
  division: number,
): Partial<Record<number, number>> {
  const normalizedNotes = normalizeNotes(notes, division);
  const nextLevels = normalizeNoteLevels(noteLevels, normalizedNotes, division);

  if (!normalizedNotes.includes(noteIndex)) {
    return nextLevels;
  }

  nextLevels[noteIndex] = clampNoteLevel(level);
  return nextLevels;
}

export function changeRingDivision(ring: Ring, division: number): Ring {
  const nextDivision = clampDivision(division);
  const nextNotes = normalizeNotes(ring.notes, nextDivision);
  return {
    ...ring,
    division: nextDivision,
    notes: nextNotes,
    noteLevels: normalizeNoteLevels(ring.noteLevels, nextNotes, nextDivision),
  };
}

export function changeRingVoice(ring: Ring, voice: DrumVoice): Ring {
  return {
    ...ring,
    voice,
  };
}

export function changeRingPhaseOffset(ring: Ring, phaseOffset: number): Ring {
  return {
    ...ring,
    phaseOffset: clampPhaseOffset(phaseOffset),
  };
}

export function applyPresetToRing(ring: Ring, preset: Preset): Ring {
  const nextNotes = normalizeNotes(preset.notes, preset.division);
  return {
    ...ring,
    division: clampDivision(preset.division),
    notes: nextNotes,
    noteLevels: normalizeNoteLevels(preset.noteLevels, nextNotes, preset.division),
    phaseOffset: clampPhaseOffset(preset.phaseOffset ?? 0),
  };
}

export function getScheduledSteps(rings: Ring[]): ScheduledStep[] {
  return rings.flatMap((ring) =>
    normalizeNotes(ring.notes, ring.division).map((noteIndex) => ({
      ringId: ring.id,
      noteIndex,
      position: ((noteIndex + ring.phaseOffset) / ring.division) % 1,
    })),
  );
}

export function getStepPosition(noteIndex: number, division: number): number {
  if (division <= 0) {
    return 0;
  }

  return noteIndex / division;
}

export function getAdjacentInteronsetIntervals(notes: number[], division: number): number[] {
  const normalized = normalizeNotes(notes, division);
  if (normalized.length === 0) {
    return [];
  }
  if (normalized.length === 1) {
    return [clampDivision(division)];
  }

  const nextDivision = clampDivision(division);
  return normalized.map((note, index) => {
    const nextNote = normalized[(index + 1) % normalized.length];
    return nextNote > note ? nextNote - note : nextDivision - note + nextNote;
  });
}

export function getRhythmicContours(intervals: number[]): string[] {
  if (intervals.length === 0) {
    return [];
  }
  if (intervals.length === 1) {
    return ["="];
  }

  return intervals.map((interval, index) => {
    const nextInterval = intervals[(index + 1) % intervals.length];
    if (nextInterval > interval) {
      return "+";
    }
    if (nextInterval < interval) {
      return "-";
    }
    return "=";
  });
}

export function getFullIntervalContent(notes: number[], division: number): IntervalContentBin[] {
  const nextDivision = clampDivision(division);
  const normalized = normalizeNotes(notes, nextDivision);
  const maxInterval = Math.floor(nextDivision / 2);
  const counts = new Map<number, number>();

  for (let interval = 1; interval <= maxInterval; interval += 1) {
    counts.set(interval, 0);
  }

  normalized.forEach((note, index) => {
    normalized.slice(index + 1).forEach((otherNote) => {
      const distance = Math.abs(otherNote - note);
      const interval = Math.min(distance, nextDivision - distance);
      if (interval > 0) {
        counts.set(interval, (counts.get(interval) ?? 0) + 1);
      }
    });
  });

  return Array.from(counts, ([interval, count]) => ({ interval, count }));
}
