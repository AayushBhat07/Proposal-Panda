'use client';

import { memo, type CSSProperties } from 'react';
import type { CrewId, CrewState } from './crew';
import { CREW } from './crew';
import { BACK_DESKS } from './Desk';
import { useCrewPosition } from './motion';
import { C, pixelRects, R } from './pixels';
import { bubbleText, STATE_WORD } from './state';
import styles from './office.module.css';

/**
 * Crew sprites: 12 x 16 scene px, anchored at the feet. Drawn front-on when standing or walking and
 * from behind while seated at a desk (the desk is just north of them). Each role differs by hard hat,
 * vest, skin and a prop.
 */

interface Look {
  hat: string;
  hatShade: string;
  vest: string;
  vestShade: string;
  stripe: string;
  shirt: string;
  skin: string;
  hair: string;
  trousers: string;
  /** Extra front-view pixels: [col, row, colour]. */
  extra?: [number, number, string][];
  prop?: 'clipboard' | 'papers' | 'calculator' | 'wrench' | 'roll' | 'stamp' | 'pencil' | 'book' | 'letter' | 'flag';
}

const HIVIS = { vest: '#d6e64a', vestShade: '#b2c23a', stripe: '#f2f2e6' };
const ORANGE = { vest: '#f07f2a', vestShade: '#c9631a', stripe: '#f6efe0' };
const SKIN = ['#c98d60', '#a86f48', '#dba57c', '#8a573a'];

export const LOOKS: Record<CrewId, Look> = {
  foreman: { hat: '#f6f3ec', hatShade: '#cfc8b8', ...ORANGE, shirt: '#f6f3ec', skin: SKIN[0], hair: '#2b2018', trousers: '#3b4a5e', extra: [[5, 9, '#b8322a'], [6, 9, '#b8322a'], [5, 10, '#b8322a']], prop: 'roll' },
  clerk: { hat: '#6fb3e0', hatShade: '#4f8fbb', ...HIVIS, shirt: '#a9c8e6', skin: SKIN[2], hair: '#1e1611', trousers: '#4a4a52', prop: 'papers' },
  electrician: { hat: '#f3c623', hatShade: '#c99c12', ...ORANGE, shirt: '#2f5d8a', skin: SKIN[3], hair: '#1e1611', trousers: '#2f5d8a', extra: [[3, 12, '#6b4a2a'], [4, 12, '#6b4a2a'], [7, 12, '#6b4a2a'], [8, 12, '#6b4a2a']], prop: 'wrench' },
  estimator: { hat: '#3fa58f', hatShade: '#2d7d6b', ...HIVIS, shirt: '#e8e2d2', skin: SKIN[1], hair: '#3a2a1e', trousers: '#5b4a3a', extra: [[3, 5, '#1b1712'], [4, 5, '#1b1712'], [5, 5, '#1b1712'], [6, 5, '#1b1712'], [7, 5, '#1b1712'], [8, 5, '#1b1712']], prop: 'calculator' },
  planner: { hat: '#f08a24', hatShade: '#c46a12', ...HIVIS, shirt: '#d98a8a', skin: SKIN[2], hair: '#2b2018', trousers: '#3b4a5e', prop: 'pencil' },
  engineer: { hat: '#2f5fb3', hatShade: '#21458a', ...ORANGE, shirt: '#e8e2d2', skin: SKIN[0], hair: '#1e1611', trousers: '#6b6255', extra: [[4, 7, '#3a2a1e'], [5, 7, '#3a2a1e'], [6, 7, '#3a2a1e'], [7, 7, '#3a2a1e']], prop: 'roll' },
  contracts: { hat: '#9b2f3a', hatShade: '#76212b', ...HIVIS, shirt: '#f6f3ec', skin: SKIN[1], hair: '#1e1611', trousers: '#2b2f3a', prop: 'book' },
  safety: { hat: '#4caf50', hatShade: '#37833a', ...ORANGE, shirt: '#e8e2d2', skin: SKIN[3], hair: '#2b2018', trousers: '#3b4a5e', prop: 'flag' },
  inspector: { hat: '#8d9497', hatShade: '#6b7275', vest: '#4a4f57', vestShade: '#3a3e45', stripe: '#4a4f57', shirt: '#e8e2d2', skin: SKIN[0], hair: '#9a9a9a', trousers: '#4a4f57', extra: [[3, 5, '#1b1712'], [4, 5, '#1b1712'], [7, 5, '#1b1712'], [8, 5, '#1b1712'], [5, 9, '#2b2f3a']], prop: 'stamp' },
  correspondence: { hat: '#e0789a', hatShade: '#b85a78', ...HIVIS, shirt: '#c7b2e0', skin: SKIN[2], hair: '#1e1611', trousers: '#4a4a52', prop: 'letter' },
};

const HEAD_FRONT = ['....oooo....', '...oHHHHo...', '..oHHHHHHo..', '.ohhhhhhhho.', '..oSSSSSSo..', '..oSESSESo..', '..oSSSSSSo..', '...oSMMSo...'];
const HEAD_BACK = ['....oooo....', '...oHHHHo...', '..oHHHHHHo..', '.ohhhhhhhho.', '..oAAAAAAo..', '..oAAAAAAo..', '..sAAAAAAs..', '...oSSSSo...'];
const BODY_FRONT = ['..oVVCCVVo..', '.oCVVCCVvCo.', '.oCYYYYYYCo.', '.oSVVVVVvSo.', '..oVVVVvvo..'];
const BODY_BACK = ['..oVVVVVVo..', '.oCVYVVYvCo.', '.oCYYYYYYCo.', '.oSVYVVYvSo.', '..oVVVVvvo..'];
const LEGS_STAND = ['..oPPPPPPo..', '..oPPooPPo..', '..oBBooBBo..'];
const LEGS_A = ['..oPPPPPPo..', '.oPPo..oPPo.', '.oBBo...oBBo'];
const LEGS_B = ['..oPPPPPPo..', '...oPPPPo...', '...oBBBBo...'];

function palette(look: Look): Record<string, string> {
  return {
    o: C.out,
    H: look.hat,
    h: look.hatShade,
    S: look.skin,
    s: look.skin,
    E: '#1b1712',
    M: '#7a3b2a',
    A: look.hair,
    V: look.vest,
    v: look.vestShade,
    Y: look.stripe,
    C: look.shirt,
    P: look.trousers,
    B: '#3a2a1e',
  };
}

// Sprite pixels sit at x -6..5, y -16..-1 so the feet land on the anchor.
const OX = -6;
const OY = -16;

function Prop({ kind }: { kind: Look['prop'] }) {
  const x = 4; // right hand at col 10
  const y = -6;
  switch (kind) {
    case 'clipboard':
    case 'papers':
    case 'letter':
      return (
        <>
          <R x={x} y={y - 2} w={4} h={4} c={C.out} />
          <R x={x + 1} y={y - 1} w={3} h={3} c={C.paper} />
        </>
      );
    case 'calculator':
      return (
        <>
          <R x={x} y={y - 2} w={3} h={4} c={C.out} />
          <R x={x + 1} y={y - 1} w={1} h={1} c="#b5e1a0" />
        </>
      );
    case 'wrench':
      return <R x={x + 1} y={y - 3} w={1} h={5} c={C.metal} />;
    case 'roll':
      return <R x={x} y={y - 4} w={2} h={6} c="#cfe0f3" />;
    case 'stamp':
      return (
        <>
          <R x={x} y={y - 2} w={3} h={2} c="#8e2f27" />
          <R x={x} y={y} w={3} h={1} c={C.out} />
        </>
      );
    case 'pencil':
      return <R x={x + 1} y={y - 3} w={1} h={4} c={C.yellow} />;
    case 'book':
      return <R x={x} y={y - 2} w={3} h={4} c="#7a2730" />;
    case 'flag':
      return (
        <>
          <R x={x + 1} y={y - 6} w={1} h={8} c={C.woodDark} />
          <R x={x + 2} y={y - 6} w={3} h={2} c={C.red} />
        </>
      );
    default:
      return null;
  }
}

/** The pixel figure. `seated` draws the back view. Memoised: walking re-renders only the position. */
export const Figure = memo(function Figure({ id, seated, state }: { id: CrewId; seated: boolean; state: CrewState }) {
  const look = LOOKS[id];
  const pal = palette(look);
  const extras = seated ? [] : (look.extra ?? []);
  return (
    <g className={styles.figure}>
      <g className={styles.body}>
        <g>{pixelRects(seated ? BODY_BACK : BODY_FRONT, pal, OX, OY + 8)}</g>
        {extras.filter(([, r]) => r >= 8).map(([c, r, f]) => <R key={`${c}-${r}`} x={OX + c} y={OY + r} c={f} />)}
        <g className={styles.head}>
          {pixelRects(seated ? HEAD_BACK : HEAD_FRONT, pal, OX, OY)}
          {extras.filter(([, r]) => r < 8).map(([c, r, f]) => <R key={`${c}-${r}`} x={OX + c} y={OY + r} c={f} />)}
        </g>
        {!seated && state !== 'done' && state !== 'redoing' && state !== 'idle' && <Prop kind={look.prop} />}
        {state === 'idle' && (
          <g className={styles.cup}>
            <R x={4} y={-7} w={3} h={3} c={C.out} />
            <R x={4} y={-6} w={3} h={2} c="#c27a3a" />
            <R x={4} y={-7} w={3} h={1} c={C.white} />
          </g>
        )}
        {state === 'done' && (
          // thumbs up
          <g>
            <R x={4} y={-10} w={2} h={3} c={look.shirt} />
            <R x={5} y={-13} w={3} h={3} c={C.out} />
            <R x={5} y={-12} w={2} h={2} c={look.skin} />
            <R x={6} y={-14} w={1} h={2} c={look.skin} />
          </g>
        )}
        {state === 'redoing' && (
          <g className={styles.scratch}>
            <R x={3} y={-16} w={3} h={3} c={C.out} />
            <R x={3} y={-15} w={2} h={2} c={look.skin} />
            <R x={5} y={-13} w={2} h={4} c={look.shirt} />
          </g>
        )}
      </g>
      <g className={styles.legsStand}>{pixelRects(LEGS_STAND, pal, OX, OY + 13)}</g>
      <g className={styles.legsA}>{pixelRects(LEGS_A, pal, OX, OY + 13)}</g>
      <g className={styles.legsB}>{pixelRects(LEGS_B, pal, OX, OY + 13)}</g>
    </g>
  );
});

function Cone() {
  return (
    <g className={styles.cone}>
      <R x={8} y={-9} w={1} h={1} c={C.out} />
      <R x={7} y={-8} w={3} h={2} c={C.orange} />
      <R x={7} y={-6} w={3} h={1} c={C.white} />
      <R x={6} y={-5} w={5} h={2} c={C.orange} />
      <R x={6} y={-3} w={5} h={1} c={C.white} />
      <R x={5} y={-2} w={7} h={2} c={C.out} />
      <R x={6} y={-2} w={5} h={1} c={C.orange} />
    </g>
  );
}

const STATE_CLASS: Record<CrewState, string> = {
  idle: styles.idle,
  starting: styles.starting,
  working: styles.working,
  redoing: styles.redoing,
  done: styles.done,
  'needs-you': styles.needs,
  failed: styles.failed,
};

const BUBBLE_TONE: Record<CrewState, string> = {
  idle: 'text-muted',
  starting: 'text-ink',
  working: 'text-ink',
  redoing: 'text-ochre',
  done: 'text-forest',
  'needs-you': 'text-ink bg-[#f6d44a]',
  failed: 'text-seal',
};

// Scene units to container units: the overlay is a size container matching the 320 x 180 scene.
const ux = (n: number) => `calc(${n} * 100cqw / 320)`;
const uy = (n: number) => `calc(${n} * 100cqh / 180)`;

/** One crew member: positioned overlay with the sprite and a speech bubble. z-order follows the feet y. */
export function CrewSprite({ id, state, highlighted }: { id: CrewId; state: CrewState; highlighted: boolean }) {
  const { position, walking, facing } = useCrewPosition(id, state);
  const desk = CREW[id].desk;
  const atDesk = !walking && position.x === desk.x && position.y === desk.y;
  // Top-row desks are behind the character (back view); front desks draw their own cone, so only
  // back-desk crew carry one.
  const seated = atDesk && BACK_DESKS.includes(id);
  const cone = state === 'needs-you' && BACK_DESKS.includes(id);
  const style: CSSProperties = {
    width: ux(24),
    height: uy(26),
    transform: `translate(${ux(position.x - 12)}, ${uy(position.y - 24)})`,
    zIndex: Math.round(position.y),
    // A glow rather than just the floor ellipse, which a front desk hides.
    filter: highlighted ? 'drop-shadow(0 0 2px #f2c230) drop-shadow(0 0 1px #f2c230)' : undefined,
  };
  const text = bubbleText(id, state);
  const short = state === 'working' ? 'working' : state === 'needs-you' ? 'edit me' : STATE_WORD[state];
  return (
    <div className={`absolute top-0 left-0 ${STATE_CLASS[state]} ${walking ? styles.walking : ''}`} style={style}>
      <svg viewBox="-12 -24 24 26" className={`${styles.pixel} size-full overflow-visible`} aria-hidden>
        <rect x={-5} y={-1} width={10} height={2} fill="#000" opacity={0.18} />
        {highlighted && <ellipse cx={0} cy={0} rx={8} ry={2.5} fill="#f2c230" opacity={0.85} />}
        <g transform={facing === 'left' ? 'scale(-1 1)' : undefined}>
          <Figure id={id} seated={seated} state={state} />
          {cone && <Cone />}
        </g>
      </svg>
      {state !== 'idle' && !walking && (
      <span
        className={`absolute left-1/2 -translate-x-1/2 rounded-[3px] border border-ink/70 bg-white px-1 py-px font-mono text-[9px] leading-tight whitespace-nowrap shadow-sm @md:text-[10px] ${BUBBLE_TONE[state]} ${highlighted ? 'ring-2 ring-[#f2c230]' : ''}`}
        style={{ bottom: uy(19) }}
      >
        {state === 'done' && <span aria-hidden>✓ </span>}
        <span className="@md:hidden">{short}</span>
        <span className="hidden @md:inline">{text}</span>
      </span>
      )}
    </div>
  );
}

/** Head-and-shoulders portrait for the crew cards. */
export function Portrait({ id, state }: { id: CrewId; state: CrewState }) {
  return (
    <svg viewBox="-8 -18 16 14" className={`${styles.pixel} size-10 shrink-0 rounded-sm bg-[#7b968a]`} aria-hidden>
      <g className={state === 'failed' ? styles.failed : undefined}>
        <Figure id={id} seated={false} state="starting" />
      </g>
    </svg>
  );
}
