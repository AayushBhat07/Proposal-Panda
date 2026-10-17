'use client';

import { useEffect, useRef, useState } from 'react';
import type { CrewId, CrewState, Point } from './crew';
import { CREW, WAYPOINTS } from './crew';

/**
 * Walking between fixed waypoints. Routes are L-shaped: straight down/up to a corridor row,
 * along it, then to the target. Corridors run between the desk rows (y≈40-45, 110, 150).
 */

export type Facing = 'left' | 'right';

/** Logical scene px per second. */
export const WALK_SPEED = 40;
/** Corridor rows that are clear of desks. */
export const CORRIDORS = { upper: 80, lower: 132 } as const;
/** Columns between desks where a walker may change corridor. */
export const AISLES = [55, 105, 155, 205, 255] as const;
/** Where a crew member stands to hand a finished page to the Foreman (in front of the Foreman's desk). */
export const FOREMAN_DROP: Point = { x: WAYPOINTS.foremanDesk.x + 16, y: WAYPOINTS.foremanDesk.y + 4 };

const ORDER = Object.keys(CREW) as CrewId[];

/** A spot near `base`, spread on a 5-wide grid by crew id so people don't stack. */
function spread(id: CrewId, base: Point, dx: number, dy: number): Point {
  const i = ORDER.indexOf(id);
  return { x: base.x + ((i % 5) - 2) * dx, y: base.y + Math.floor(i / 5) * dy };
}

export const chaiSpot = (id: CrewId): Point => spread(id, WAYPOINTS.chai, 7, 8);
export const windowSpot = (id: CrewId): Point => spread(id, { x: WAYPOINTS.window.x, y: WAYPOINTS.window.y + 10 }, 8, 6);

/** Where the character ends up for a state. */
export function destinationFor(id: CrewId, state: CrewState): Point {
  if (state === 'idle') return chaiSpot(id);
  if (state === 'failed') return windowSpot(id);
  return CREW[id].desk;
}

const corridorFor = (p: Point) => (p.y < 125 ? CORRIDORS.upper : CORRIDORS.lower);

/** Corner points from `a` to `b`, along corridors, including both ends. Consecutive duplicates removed. */
export function route(a: Point, b: Point): Point[] {
  if (a.x === b.x && a.y === b.y) return [a];
  const ca = corridorFor(a);
  const cb = corridorFor(b);
  let pts: Point[];
  if (ca === cb) {
    pts = [a, { x: a.x, y: ca }, { x: b.x, y: ca }, b];
  } else {
    const mid = (a.x + b.x) / 2;
    const aisle = AISLES.reduce((best, x) => (Math.abs(x - mid) < Math.abs(best - mid) ? x : best));
    pts = [a, { x: a.x, y: ca }, { x: aisle, y: ca }, { x: aisle, y: cb }, { x: b.x, y: cb }, b];
  }
  return pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
}

/** The full walk when `id` enters `state` while standing at `from`. */
export function planWalk(id: CrewId, state: CrewState, from: Point): Point[] {
  const dest = destinationFor(id, state);
  if (state === 'done' && id !== 'foreman') {
    return [...route(from, FOREMAN_DROP), ...route(FOREMAN_DROP, dest).slice(1)];
  }
  return route(from, dest);
}

const segLen = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

export function pathLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += segLen(path[i - 1], path[i]);
  return total;
}

/**
 * Integer position `dist` px along `path`. `dx` is the x direction of the current segment
 * (0 on vertical segments), `arrived` once the end is reached.
 */
export function pointAlong(path: Point[], dist: number): { position: Point; dx: number; arrived: boolean } {
  let left = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const len = segLen(a, b);
    if (left < len) {
      const t = left / len;
      return {
        position: { x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) },
        dx: Math.sign(b.x - a.x),
        arrived: false,
      };
    }
    left -= len;
  }
  const end = path[path.length - 1];
  return { position: { x: Math.round(end.x), y: Math.round(end.y) }, dx: 0, arrived: true };
}

function shouldSnap(): boolean {
  if (typeof document !== 'undefined' && document.hidden) return true;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

interface Pose {
  position: Point;
  walking: boolean;
  facing: Facing;
}

/** Where a character's feet are right now, in scene px. First render snaps to the state's spot. */
export function useCrewPosition(id: CrewId, state: CrewState): Pose {
  const [pose, setPose] = useState<Pose>(() => ({ position: destinationFor(id, state), walking: false, facing: 'right' }));
  const poseRef = useRef(pose);
  const lastState = useRef(state);

  useEffect(() => {
    if (lastState.current === state) return;
    lastState.current = state;

    const path = planWalk(id, state, poseRef.current.position);
    const snap = shouldSnap();
    let start: number | null = null;
    let raf = 0;

    const tick = (now: number) => {
      start ??= now;
      const { position, dx, arrived } = pointAlong(path, snap ? Infinity : ((now - start) / 1000) * WALK_SPEED);
      const prev = poseRef.current;
      const facing: Facing = dx < 0 ? 'left' : dx > 0 ? 'right' : prev.facing;
      const next = { position, walking: !arrived, facing };
      if (prev.position.x !== position.x || prev.position.y !== position.y || prev.walking !== next.walking || prev.facing !== facing) {
        poseRef.current = next;
        setPose(next);
      }
      if (!arrived) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, state]);

  return pose;
}
