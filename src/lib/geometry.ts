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
  gapRadians?: number;
}

const START_ANGLE = -Math.PI / 2;

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
): string {
  return notes
    .map((note) => polarToCartesian(center, radius, note / division))
    .map((point) => `${round(point.x)},${round(point.y)}`)
    .join(" ");
}

export function getRingCellPath({
  center,
  innerRadius,
  outerRadius,
  stepIndex,
  division,
  gapRadians = 0.012,
}: RingCellPathInput): string {
  const stepSize = (Math.PI * 2) / division;
  const startAngle = START_ANGLE + stepIndex * stepSize + gapRadians;
  const endAngle = START_ANGLE + (stepIndex + 1) * stepSize - gapRadians;
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  const outerStart = pointAtAngle(center, outerRadius, startAngle);
  const outerEnd = pointAtAngle(center, outerRadius, endAngle);
  const innerEnd = pointAtAngle(center, innerRadius, endAngle);
  const innerStart = pointAtAngle(center, innerRadius, startAngle);

  return [
    `M ${round(outerStart.x)} ${round(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${round(innerStart.x)} ${round(innerStart.y)}`,
    "Z",
  ].join(" ");
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

