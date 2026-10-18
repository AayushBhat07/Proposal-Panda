import { memo } from 'react';
import type { CrewId } from './crew';
import { CREW } from './crew';
import { C, R } from './pixels';
import styles from './office.module.css';

/**
 * Every character walks straight up or down from their desk point to a corridor (y 80 or 132), so:
 * - top row (foreman, engineer, inspector) desks sit just north of the point, under the characters,
 *   who sit with their backs to us (BACK_DESKS);
 * - everyone else sits behind a front-facing desk just south of the point, drawn over the characters.
 * `active` makes the monitor flicker or the stamp press.
 */

function Monitor({ x, y }: { x: number; y: number }) {
  // x, y = top-left of the casing (9 x 8)
  return (
    <g>
      <R x={x} y={y} w={9} h={7} c={C.out} />
      <R x={x + 1} y={y + 1} w={7} h={5} c="#3b3f42" />
      <R x={x + 2} y={y + 2} w={5} h={3} c={C.screenOff} />
      <g className={styles.screen}>
        <R x={x + 2} y={y + 2} w={5} h={3} c={C.screenOn} />
        <R x={x + 3} y={y + 3} w={3} h={1} c="#4f9f88" />
      </g>
      <R x={x + 3} y={y + 7} w={3} h={1} c={C.out} />
      <R x={x + 2} y={y + 8} w={5} h={1} c={C.metalDark} />
    </g>
  );
}

function Top({ x0, x1, y, light = C.wood, shade = C.woodShade }: { x0: number; x1: number; y: number; light?: string; shade?: string }) {
  // a desk top seen from above: surface rows y..y+5, front edge y+6..y+7
  const w = x1 - x0;
  return (
    <g>
      <R x={x0 - 1} y={y - 1} w={w + 2} h={10} c={C.out} />
      <R x={x0} y={y} w={w} h={6} c={light} />
      <R x={x0} y={y} w={w} h={1} c={C.woodLight} />
      <R x={x0} y={y + 6} w={w} h={2} c={shade} />
    </g>
  );
}

function Papers({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <R x={x} y={y} w={5} h={4} c={C.out} />
      <R x={x} y={y} w={5} h={3} c={C.paper} />
      <R x={x + 1} y={y + 1} w={3} h={1} c={C.wallDark} />
    </g>
  );
}

function deskArt(id: CrewId) {
  const { x, y } = CREW[id].desk;
  const top = y - 12;
  switch (id) {
    case 'foreman':
      return (
        <>
          <Top x0={x - 18} x1={x + 10} y={top} />
          <Monitor x={x - 17} y={top - 4} />
          <Papers x={x + 3} y={top + 1} />
          <R x={x - 6} y={top + 4} w={8} h={2} c="#b8962e" />
          <R x={x - 4} y={top + 1} w={2} h={2} c={C.white} />
        </>
      );
    case 'engineer':
      return (
        <>
          <Top x0={x - 14} x1={x + 13} y={top} light="#d9c9a5" shade="#a08a62" />
          <R x={x - 12} y={top + 1} w={17} h={5} c={C.blue} />
          <R x={x - 10} y={top + 2} w={6} h={1} c={C.white} />
          <R x={x - 6} y={top + 2} w={1} h={3} c={C.white} />
          <R x={x - 2} y={top + 4} w={6} h={1} c={C.white} />
          <R x={x + 6} y={top + 1} w={6} h={2} c={C.paper} />
          <R x={x + 6} y={top + 3} w={6} h={2} c="#cfe0f3" />
          <g>
            <R x={x - 12} y={top - 4} w={7} h={4} c={C.out} />
            <R x={x - 11} y={top - 3} w={5} h={2} c={C.screenOff} />
            <g className={styles.screen}>
              <R x={x - 11} y={top - 3} w={5} h={2} c={C.screenOn} />
            </g>
          </g>
        </>
      );
    case 'inspector':
      return (
        <>
          <Top x0={x - 14} x1={x + 13} y={top} />
          <Papers x={x - 12} y={top + 1} />
          <Papers x={x - 11} y={top} />
          <R x={x + 2} y={top + 2} w={6} h={3} c={C.out} />
          <R x={x + 3} y={top + 3} w={4} h={1} c={C.red} />
          <g className={styles.press}>
            <R x={x - 2} y={top - 3} w={3} h={3} c="#8e2f27" />
            <R x={x - 3} y={top} w={5} h={2} c={C.out} />
          </g>
        </>
      );
    default:
      return null;
  }
}

/** Front-facing desks: the character sits behind (north of) it and walks straight up to the corridor. */
function frontArt(id: CrewId) {
  const { x, y } = CREW[id].desk;
  const top = y - 6;
  const left = x - 15;
  return (
    <>
      <Top x0={left} x1={x + 15} y={top} />
      <Monitor x={x + 5} y={top - 8} />
      {id === 'clerk' && (
        <>
          <R x={left + 1} y={top + 1} w={9} h={4} c={C.out} />
          <R x={left + 2} y={top + 2} w={7} h={2} c={C.metal} />
          <Papers x={left + 11} y={top} />
        </>
      )}
      {id === 'estimator' && (
        <>
          <R x={left + 1} y={top + 1} w={4} h={5} c={C.out} />
          <R x={left + 2} y={top + 2} w={2} h={1} c="#b5e1a0" />
          <R x={left + 7} y={top + 1} w={7} h={5} c="#2f5d50" />
          <R x={left + 8} y={top + 2} w={5} h={3} c={C.paper} />
        </>
      )}
      {id === 'planner' && (
        <>
          <Papers x={left + 1} y={top + 1} />
          <R x={left + 7} y={top + 1} w={7} h={5} c={C.paper} />
          <R x={left + 8} y={top + 2} w={3} h={1} c={C.orange} />
          <R x={left + 9} y={top + 4} w={4} h={1} c={C.blue} />
        </>
      )}
      {id === 'contracts' && (
        <>
          <R x={left + 1} y={top - 1} w={3} h={7} c="#7a2730" />
          <R x={left + 4} y={top} w={3} h={6} c="#2f4e7a" />
          <R x={left + 7} y={top + 1} w={3} h={5} c="#5c6b2e" />
          <Papers x={left + 11} y={top + 1} />
        </>
      )}
      {id === 'safety' && (
        <>
          <R x={left + 2} y={top - 3} w={1} h={7} c={C.woodDark} />
          <R x={left + 3} y={top - 3} w={4} h={3} c={C.red} />
          <R x={left + 8} y={top + 1} w={5} h={5} c={C.woodDark} />
          <R x={left + 9} y={top + 2} w={3} h={3} c={C.paper} />
        </>
      )}
    </>
  );
}

/** Desks drawn under the characters: the top row, where people sit with their backs to us. */
function DeskImpl({ id, active }: { id: CrewId; active: boolean }) {
  return <g className={active ? styles.active : undefined}>{deskArt(id)}</g>;
}

export const Desk = memo(DeskImpl);

export const BACK_DESKS: readonly CrewId[] = ['foreman', 'engineer', 'inspector'];
export const FRONT_DESKS: readonly CrewId[] = ['clerk', 'estimator', 'planner', 'contracts', 'safety', 'correspondence'];

function Typewriter() {
  const { x, y } = CREW.correspondence.desk;
  return (
    <>
      <R x={x - 15} y={y - 7} w={30} h={11} c={C.out} />
      <R x={x - 14} y={y - 6} w={28} h={6} c={C.wood} />
      <R x={x - 14} y={y - 6} w={28} h={1} c={C.woodLight} />
      <R x={x - 14} y={y} w={28} h={3} c={C.woodShade} />
      <R x={x - 2} y={y + 1} w={4} h={1} c={C.woodDark} />
      <g className={styles.press}>
        <R x={x - 5} y={y - 10} w={10} h={4} c={C.paper} />
        <R x={x - 4} y={y - 9} w={6} h={1} c={C.wallDark} />
      </g>
      <R x={x - 7} y={y - 6} w={14} h={5} c={C.out} />
      <R x={x - 6} y={y - 5} w={12} h={2} c="#3d4a46" />
      <R x={x - 5} y={y - 3} w={10} h={1} c={C.metalLight} />
      <R x={x + 8} y={y - 5} w={5} h={3} c={C.paper} />
    </>
  );
}

/** A yellow cone set on the desk when a section needs the user's edit. */
function DeskCone({ x, y }: { x: number; y: number }) {
  return (
    <g className={styles.cone}>
      <R x={x + 2} y={y} w={1} h={1} c={C.out} />
      <R x={x + 1} y={y + 1} w={3} h={2} c={C.orange} />
      <R x={x + 1} y={y + 3} w={3} h={1} c={C.white} />
      <R x={x} y={y + 4} w={5} h={2} c={C.orange} />
      <R x={x - 1} y={y + 6} w={7} h={1} c={C.out} />
    </g>
  );
}

/** Desks drawn over the characters: the bottom row and the typewriter desk. */
function FrontDeskImpl({ id, active, needs }: { id: CrewId; active: boolean; needs: boolean }) {
  const { x, y } = CREW[id].desk;
  return (
    <g className={`${active ? styles.active : ''} ${needs ? styles.needs : ''}`}>
      {id === 'correspondence' ? <Typewriter /> : frontArt(id)}
      {needs && <DeskCone x={x - 12} y={y - 12} />}
    </g>
  );
}

export const FrontDesk = memo(FrontDeskImpl);
