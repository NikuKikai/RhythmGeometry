import { describe, expect, it } from "vitest";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingVoice,
  getScheduledSteps,
  normalizeNotes,
  type Preset,
  type Ring,
} from "./rhythm";

const ring: Ring = {
  id: "kick",
  label: "Kick",
  division: 16,
  notes: [0, 4, 16, 20],
  voice: "kick",
  volume: 0.8,
  color: "#ff6b35",
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
      division: 12,
      notes: [0, 4, 8],
    };

    expect(applyPresetToRing(ring, preset)).toMatchObject({
      division: 12,
      notes: [0, 4, 8],
    });
  });

  it("changes the ring voice without changing the rhythm", () => {
    expect(changeRingVoice(ring, "tom")).toMatchObject({
      voice: "tom",
      division: 16,
      notes: [0, 4, 16, 20],
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
});

