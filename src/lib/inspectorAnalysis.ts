import { clampDivision, normalizeNotes } from "./rhythm";

export interface IntervalContentBin {
  interval: number;
  count: number;
}

export interface GttmAccentBin {
  step: number;
  accent: number;
  isNote: boolean;
}

export function getOddityViolationCount(notes: number[], division: number): number {
  const nextDivision = clampDivision(division);
  if (nextDivision % 2 !== 0) {
    return 0;
  }

  const normalizedNotes = normalizeNotes(notes, nextDivision);
  const noteSet = new Set(normalizedNotes);
  const halfTurn = nextDivision / 2;
  let violatingPairs = 0;

  normalizedNotes.forEach((note) => {
    const opposite = (note + halfTurn) % nextDivision;
    if (note < opposite && noteSet.has(opposite)) {
      violatingPairs += 1;
    }
  });

  return violatingPairs;
}

export function generateHopAndJumpRhythm(
  division: number,
  hopSize: number,
): number[] | null {
  const nextDivision = clampDivision(division);
  const nextHopSize = Math.max(1, Math.round(hopSize));

  if (nextDivision % 2 !== 0 || nextHopSize <= 0) {
    return null;
  }

  const halfTurn = nextDivision / 2;
  const notes: number[] = [0];
  const noteSet = new Set(notes);
  const blocked = new Set<number>([halfTurn]);
  let current = 0;

  while (true) {
    const hopped = (current + nextHopSize) % nextDivision;
    let candidate = hopped;
    let attempts = 0;

    while ((noteSet.has(candidate) || blocked.has(candidate)) && attempts < nextDivision) {
      candidate = (candidate + 1) % nextDivision;
      attempts += 1;
    }

    if (attempts >= nextDivision || noteSet.has(candidate) || blocked.has(candidate)) {
      break;
    }

    notes.push(candidate);
    noteSet.add(candidate);
    blocked.add((candidate + halfTurn) % nextDivision);
    current = candidate;
  }

  return notes.sort((left, right) => left - right);
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

export function getGttmAccentHierarchy(notes: number[], division: number): GttmAccentBin[] {
  const nextDivision = clampDivision(division);
  const normalizedNotes = normalizeNotes(notes, nextDivision);
  const noteSet = new Set(normalizedNotes);
  const divisors: number[] = [];

  let subdivision = nextDivision;
  while (Number.isInteger(subdivision) && subdivision >= 1) {
    divisors.push(subdivision);
    if (subdivision === 1) {
      break;
    }
    subdivision /= 2;
  }

  return Array.from({ length: nextDivision }, (_, step) => {
    const accent = divisors.reduce((level, divisor) => {
      if (step % divisor === 0) {
        return level + 1;
      }
      return level;
    }, 0);
    return {
      step,
      accent,
      isNote: noteSet.has(step),
    };
  });
}

export function getGttmSyncopation(notes: number[], division: number): number {
  const hierarchy = getGttmAccentHierarchy(notes, division);
  const highlighted = hierarchy.filter((item) => item.isNote);
  if (highlighted.length === 0) {
    return 0;
  }

  const maxAccent = Math.max(1, ...hierarchy.map((item) => item.accent));
  const weaknessSum = highlighted.reduce(
    (sum, item) => sum + (maxAccent - item.accent),
    0,
  );
  return weaknessSum / (highlighted.length * maxAccent);
}
