import { describe, expect, it } from "vitest";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingVoice,
  getNoteLevel,
  getPlaybackNoteLevel,
  getAdjacentInteronsetIntervals,
  getFullIntervalContent,
  getRhythmicContours,
  getScheduledSteps,
  normalizeNotes,
  setNoteLevel,
  toggleNoteLevel,
  type Preset,
  type Ring,
} from "./rhythm";

const ring: Ring = {
  id: "kick",
  label: "Kick",
  division: 16,
  notes: [0, 4, 16, 20],
  phaseOffset: 0,
  voice: "kick",
  volume: 0.8,
};

describe("rhythm helpers", () => {
  it("normalizes note indices within the selected division", () => {
    expect(normalizeNotes([2, 2, 4, 9, -1], 8)).toEqual([2, 4]);
  });

  it("keeps only valid notes when ring division changes", () => {
    expect(changeRingDivision(ring, 8).notes).toEqual([0, 4]);
  });

  it("replaces ring notes and division when applying a preset", () => {
    const preset: Preset = {
      id: "triplet-pulse",
      name: "Triplet Pulse",
      category: "Odd",
      division: 12,
      notes: [0, 4, 8],
    };

    expect(applyPresetToRing(ring, preset)).toMatchObject({
      division: 12,
      notes: [0, 4, 8],
      phaseOffset: 0,
    });
  });

  it("changes the ring voice without changing the rhythm", () => {
    expect(changeRingVoice(ring, "tom")).toMatchObject({
      voice: "tom",
      division: 16,
      notes: [0, 4, 16, 20],
    });
  });

  it("applies preset phase offsets", () => {
    expect(applyPresetToRing(ring, { id: "late", name: "Late", category: "Basic", division: 4, notes: [0], phaseOffset: 0.5 })).toMatchObject({
      division: 4,
      notes: [0],
      phaseOffset: 0.5,
    });
  });

  it("maps different ring divisions into one normalized cycle", () => {
    expect(
      getScheduledSteps([
        { ...ring, division: 4, notes: [0, 1, 2, 3] },
        { ...ring, id: "hat", division: 8, notes: [0, 2, 4, 6] },
      ]).map((step) => step.position),
    ).toEqual([0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75]);
  });

  it("includes phase offsets in scheduled positions", () => {
    expect(getScheduledSteps([{ ...ring, division: 4, notes: [0, 1], phaseOffset: 0.5 }]).map((step) => step.position)).toEqual([
      0.125,
      0.375,
    ]);
  });

  it("computes cyclic adjacent interonset intervals", () => {
    expect(getAdjacentInteronsetIntervals([0, 3, 7], 12)).toEqual([3, 4, 5]);
  });

  it("computes rhythmic contours from adjacent intervals", () => {
    expect(getRhythmicContours([3, 4, 4, 2])).toEqual(["+", "=", "-", "+"]);
  });

  it("computes full interval content as cyclic interval classes", () => {
    expect(getFullIntervalContent([0, 3, 7], 12)).toEqual([
      { interval: 1, count: 0 },
      { interval: 2, count: 0 },
      { interval: 3, count: 1 },
      { interval: 4, count: 1 },
      { interval: 5, count: 1 },
      { interval: 6, count: 0 },
    ]);
  });

  it("defaults note levels to full velocity and clamps updates", () => {
    expect(getNoteLevel(undefined, 4)).toBe(1);
    expect(setNoteLevel(undefined, [4], 4, 0.02, 16)).toEqual({ 4: 0.1 });
  });

  it("maps note levels to a smoother playback curve", () => {
    expect(getPlaybackNoteLevel(0.1)).toBeCloseTo(0.12);
    expect(getPlaybackNoteLevel(1)).toBeCloseTo(1);
  });

  it("adds and removes note levels together with note toggles", () => {
    expect(toggleNoteLevel(undefined, [0, 4], 8, 16)).toEqual({ 0: 1, 4: 1, 8: 1 });
    expect(toggleNoteLevel({ 0: 0.4, 4: 0.8 }, [0, 4], 4, 16)).toEqual({ 0: 0.4 });
  });
});

