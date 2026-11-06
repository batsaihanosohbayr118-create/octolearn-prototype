import type { PathItem } from './types';

export const UNIT_HEADER_HEIGHT = 84;
const UNIT_GAP = 28;
const ROW_HEIGHT = 116;
const TOP_PADDING = 16;
/** Horizontal rhythm of the zigzag, as a share of the amplitude. */
const ZIGZAG = [0, 0.75, 1, 0.75, 0, -0.75, -1, -0.75];

export type LayoutNode = { item: PathItem; x: number; y: number };
export type LayoutHeader = { unitId: string; y: number };

/** Positions every stop for the given width, so the path adapts to any screen. */
export function computePathLayout(items: PathItem[], width: number) {
  const amplitude = Math.min(width * 0.26, 110);
  const nodes: LayoutNode[] = [];
  const headers: LayoutHeader[] = [];
  let y = TOP_PADDING;
  let currentUnitId: string | null = null;

  items.forEach((item, index) => {
    if (item.unit.id !== currentUnitId) {
      if (currentUnitId !== null) y += UNIT_GAP;
      headers.push({ unitId: item.unit.id, y });
      y += UNIT_HEADER_HEIGHT + 44;
      currentUnitId = item.unit.id;
    }
    nodes.push({ item, x: width / 2 + ZIGZAG[index % ZIGZAG.length] * amplitude, y: y + 40 });
    y += ROW_HEIGHT;
  });

  return { nodes, headers, height: y + 24 };
}

/** Smooth vertical S-curve between two neighbouring stops, as an SVG path. */
export function segmentPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}
