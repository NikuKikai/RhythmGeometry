import { describe, expect, it } from "vitest";
import { getNotePolygonPoints, polarToCartesian } from "./geometry";

describe("geometry helpers", () => {
  it("converts normalized top position to cartesian coordinates", () => {
    expect(polarToCartesian({ x: 100, y: 100 }, 50, 0)).toEqual({
      x: 100,
      y: 50,
    });
  });

  it("builds stable polygon point strings", () => {
    expect(getNotePolygonPoints([0, 1, 2, 3], 4, { x: 100, y: 100 }, 50)).toBe(
      "100,50 150,100 100,150 50,100",
    );
  });
});
