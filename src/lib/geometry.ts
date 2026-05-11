export interface Point {
  x: number;
  y: number;
}

export interface RingCellPathInput {
  center: Point;
  innerRadius: number;
  outerRadius: number;
  stepIndex: number;
  division: number;
  phaseOffset?: number;
  gapLength?: number;
}

const START_ANGLE = -Math.PI / 2;
const DEFAULT_RING_CELL_GAP_LENGTH = 0.25;

export function polarToCartesian(
  center: Point,
  radius: number,
  normalizedPosition: number,
): Point {
  const angle = START_ANGLE + normalizedPosition * Math.PI * 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

export function getNotePolygonPoints(
  notes: number[],
  division: number,
  center: Point,
  radius: number,
  phaseOffset = 0,
): string {
  return notes
    .map((note) => polarToCartesian(center, radius, (note + phaseOffset) / division))
    .map((point) => `${round(point.x)},${round(point.y)}`)
    .join(" ");
}

export function getRingCellPath({
  center,
  innerRadius,
  outerRadius,
  stepIndex,
  division,
  phaseOffset = 0,
  gapLength = DEFAULT_RING_CELL_GAP_LENGTH,
}: RingCellPathInput): string {
  const stepSize = (Math.PI * 2) / division;
  const baseStartAngle = START_ANGLE + (stepIndex + phaseOffset) * stepSize;
  const baseEndAngle = START_ANGLE + (stepIndex + 1 + phaseOffset) * stepSize;
  const outerTrimAngle = getGapTrimAngle(outerRadius, gapLength, stepSize);
  const innerTrimAngle = getGapTrimAngle(innerRadius, gapLength, stepSize);
  const outerStartAngle = baseStartAngle + outerTrimAngle;
  const outerEndAngle = baseEndAngle - outerTrimAngle;
  const innerStartAngle = baseStartAngle + innerTrimAngle;
  const innerEndAngle = baseEndAngle - innerTrimAngle;
  const outerLargeArcFlag = outerEndAngle - outerStartAngle > Math.PI ? 1 : 0;
  const innerLargeArcFlag = innerEndAngle - innerStartAngle > Math.PI ? 1 : 0;

  const outerStart = pointAtAngle(center, outerRadius, outerStartAngle);
  const outerEnd = pointAtAngle(center, outerRadius, outerEndAngle);
  const innerEnd = pointAtAngle(center, innerRadius, innerEndAngle);
  const innerStart = pointAtAngle(center, innerRadius, innerStartAngle);

  return [
    `M ${round(outerStart.x)} ${round(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${outerLargeArcFlag} 1 ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${innerLargeArcFlag} 0 ${round(innerStart.x)} ${round(innerStart.y)}`,
    "Z",
  ].join(" ");
}

function getGapTrimAngle(radius: number, gapLength: number, stepSize: number): number {
  if (radius <= 0 || gapLength <= 0) {
    return 0;
  }

  return Math.min(gapLength / radius, stepSize * 0.5 - 0.0001);
}

function pointAtAngle(center: Point, radius: number, angle: number): Point {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

