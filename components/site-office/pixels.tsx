import type { ReactElement } from 'react';

/** Shared pixel-art palette for the office. Scene art only; the chrome around it uses the app's tokens. */
export const C = {
  out: '#2a2420',
  floor: '#7b968a',
  floorLight: '#86a195',
  grout: '#6a8479',
  wall: '#e9e3d6',
  wallShade: '#d3cbb9',
  wallDark: '#b9af9b',
  wood: '#c48b52',
  woodLight: '#d6a06a',
  woodShade: '#9c6a3a',
  woodDark: '#734c2a',
  metal: '#a3abad',
  metalLight: '#c4cacb',
  metalDark: '#6c7477',
  green: '#4f8a4a',
  greenDark: '#356332',
  gravel: '#b49d74',
  gravelDark: '#9a8460',
  sky: '#a9d3e6',
  white: '#f4f1ea',
  paper: '#fbf8f2',
  blue: '#5d8fd0',
  red: '#c0453a',
  yellow: '#f2c230',
  orange: '#ef7d2b',
  screenOff: '#2e3b3a',
  screenOn: '#9fe3cf',
} as const;

/** One pixel-art rectangle. */
export function R({ x, y, w = 1, h = 1, c, className }: { x: number; y: number; w?: number; h?: number; c: string; className?: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={c} className={className} />;
}

/**
 * Draw an ASCII pixel map: one character per pixel, '.' is transparent.
 * Horizontal runs of the same colour merge into one rect.
 */
export function pixelRects(rows: readonly string[], palette: Record<string, string>, ox = 0, oy = 0): ReactElement[] {
  const rects: ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = palette[ch];
      if (ch !== '.' && fill) rects.push(<rect key={`${y}-${x}`} x={ox + x} y={oy + y} width={end - x} height={1} fill={fill} />);
      x = end;
    }
  });
  return rects;
}
