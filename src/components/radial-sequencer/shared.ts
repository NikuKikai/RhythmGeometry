import { polarToCartesian } from "../../lib/geometry";

export const SIZE = 620;
export const CENTER = { x: SIZE / 2, y: SIZE / 2 };
export const OUTER_RADIUS = 270;
export const RING_WIDTH = 38;
export const RING_GAP = 12;
export const NOTE_FLASH_WINDOW = 0.035;
export const DRAG_THRESHOLD = 0.006;
export const LONG_PRESS_ROTATE_MS = 500;
export const OFFSET_GUIDE_WIDTH = 4;

export interface RadialLineSegment {
  fromRadius: number;
  toRadius: number;
}

export interface RingPointerData {
  ringId: string;
  phaseOffset: number;
  noteLevels?: Partial<Record<number, number>>;
}

export function getPointerCyclePosition(clientX: number, clientY: number, svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * SIZE;
  const y = ((clientY - rect.top) / rect.height) * SIZE;
  const angle = Math.atan2(y - CENTER.y, x - CENTER.x) + Math.PI / 2;
  return ((angle / (Math.PI * 2)) % 1 + 1) % 1;
}

export function getOffsetArcPath(radius: number, division: number, phaseOffset: number): string {
  if (phaseOffset <= 0) {
    return "";
  }

  const endPosition = phaseOffset / division;
  const start = polarToCartesian(CENTER, radius, 0);
  const end = polarToCartesian(CENTER, radius, endPosition);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}
