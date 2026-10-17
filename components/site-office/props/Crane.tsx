import { useId, type CSSProperties } from 'react';

/**
 * Tower crane and a building frame seen through the office window. Paints the whole
 * strip x 90..230, y 0..28 (sky and ground included), so draw the window frame on top.
 * `progress` is 0..1: one floor per 10%. While below 1 the hook keeps lifting the next slab.
 */

export const CRANE_FLOORS = 10;
const GROUND = 26;
const FLOOR_H = 2;
const BUILDING = { x: 180, w: 36 };
const PICKUP_X = 100; // left edge of the slab while it sits on the ground stack
const SLAB_W = 10;
const DROP_X = BUILDING.x + (BUILDING.w - SLAB_W) / 2;
const SLAB_REST_Y = GROUND - 4; // top of the slab while it hangs just above the stack

const C = {
  sky: '#b9d6e3',
  skyLow: '#cfe3ea',
  ground: '#a68a5b',
  groundDark: '#8a7049',
  steel: '#e2b02a',
  steelDark: '#8c6b12',
  concrete: '#b4b9bd',
  concreteDark: '#7d8489',
  interior: '#4d5a63',
  cable: '#3b3f42',
  weight: '#6b7177',
};

const CSS = `
.so-crane-x{animation:so-crane-x 8s infinite;animation-timing-function:steps(24,end)}
.so-crane-y{animation:so-crane-y 8s infinite;animation-timing-function:steps(6,end)}
.so-crane-swing{animation:so-crane-swing 1.6s steps(1,end) infinite}
@keyframes so-crane-x{0%,30%{transform:translateX(0)}60%,85%{transform:translateX(var(--so-crane-dx))}100%{transform:translateX(var(--so-crane-dx))}}
@keyframes so-crane-y{0%,10%{transform:translateY(0)}30%,60%{transform:translateY(var(--so-crane-up))}75%,85%{transform:translateY(var(--so-crane-down))}100%{transform:translateY(var(--so-crane-down))}}
@keyframes so-crane-swing{0%{transform:translateX(0)}25%{transform:translateX(1px)}50%{transform:translateX(0)}75%{transform:translateX(-1px)}}
@media (prefers-reduced-motion: reduce){.so-crane-x,.so-crane-y,.so-crane-swing{animation:none}}
`;

function Lattice({ x, y, w, h, vertical }: { x: number; y: number; w: number; h: number; vertical: boolean }) {
  const dots = [];
  const n = vertical ? h : w;
  for (let i = 0; i < n; i += 2) {
    dots.push(
      vertical ? (
        <rect key={i} x={x + ((i / 2) % 2 === 0 ? 1 : w - 2)} y={y + i} width={1} height={1} fill={C.steelDark} />
      ) : (
        <rect key={i} x={x + i} y={y + ((i / 2) % 2 === 0 ? 0 : h - 1)} width={1} height={1} fill={C.steelDark} />
      ),
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.steel} />
      {dots}
    </g>
  );
}

export default function Crane({ progress }: { progress: number }) {
  const clipId = `so-crane-clip${useId().replace(/[^\w-]/g, '')}`;
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const floors = Math.min(CRANE_FLOORS, Math.floor(p * CRANE_FLOORS + 1e-6));
  const top = GROUND - floors * FLOOR_H; // y of the building's top edge
  const finished = p >= 1;

  const motionVars = {
    '--so-crane-dx': `${DROP_X - PICKUP_X}px`,
    '--so-crane-up': `${Math.max(top - 5, 5) - SLAB_REST_Y}px`,
    '--so-crane-down': `${top - 2 - SLAB_REST_Y}px`,
  } as CSSProperties;

  const columns: number[] = [];
  for (let x = BUILDING.x; x < BUILDING.x + BUILDING.w; x += 6) columns.push(x);

  return (
    <g shapeRendering="crispEdges" aria-hidden="true">
      <style>{CSS}</style>
      {/* sky and ground */}
      <rect x={90} y={0} width={140} height={GROUND} fill={C.sky} />
      <rect x={90} y={GROUND - 6} width={140} height={6} fill={C.skyLow} />
      <rect x={90} y={GROUND} width={140} height={28 - GROUND} fill={C.ground} />
      {[96, 121, 167, 204, 226].map(x => (
        <rect key={x} x={x} y={GROUND + 1} width={2} height={1} fill={C.groundDark} />
      ))}

      {/* building frame: floor slabs with columns, dark interior between */}
      {Array.from({ length: floors }, (_, k) => {
        const y = GROUND - (k + 1) * FLOOR_H;
        return (
          <g key={k}>
            <rect x={BUILDING.x} y={y} width={BUILDING.w} height={1} fill={C.concrete} />
            <rect x={BUILDING.x} y={y + 1} width={BUILDING.w} height={1} fill={C.interior} />
            {columns.map(x => (
              <rect key={x} x={x} y={y + 1} width={1} height={1} fill={C.concreteDark} />
            ))}
            <rect x={BUILDING.x + BUILDING.w - 1} y={y + 1} width={1} height={1} fill={C.concreteDark} />
          </g>
        );
      })}
      {/* rebar stubs on the top floor while building */}
      {!finished &&
        columns.map(x => <rect key={x} x={x} y={top - 1} width={1} height={1} fill={C.concreteDark} />)}

      {/* slab stack waiting on the ground */}
      {!finished && (
        <>
          <rect x={PICKUP_X - 1} y={GROUND - 1} width={SLAB_W + 2} height={1} fill={C.concreteDark} />
          <rect x={PICKUP_X - 1} y={GROUND - 2} width={SLAB_W + 2} height={1} fill={C.concrete} />
        </>
      )}

      {/* crane: mast, jib, counter-jib, cab, apex */}
      <rect x={136} y={GROUND - 1} width={11} height={1} fill={C.weight} />
      <Lattice x={140} y={4} w={3} h={GROUND - 5} vertical />
      <Lattice x={118} y={2} w={106} h={2} vertical={false} />
      <rect x={140} y={0} width={3} height={2} fill={C.steelDark} />
      <rect x={118} y={4} width={6} height={3} fill={C.weight} />
      <rect x={143} y={4} width={4} height={3} fill={C.steelDark} />
      <rect x={144} y={5} width={2} height={1} fill={C.sky} />

      {finished ? (
        // at rest: trolley parked by the mast, empty hook drawn up
        <g>
          <rect x={150} y={4} width={4} height={1} fill={C.cable} />
          <rect x={151} y={5} width={1} height={3} fill={C.cable} />
          <rect x={150} y={8} width={3} height={1} fill={C.cable} />
        </g>
      ) : (
        <g className="so-crane-x" style={motionVars}>
          <rect x={PICKUP_X + SLAB_W / 2 - 2} y={4} width={4} height={1} fill={C.cable} />
          <clipPath id={clipId}>
            <rect x={0} y={5} width={400} height={GROUND} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            <g className="so-crane-y" style={motionVars}>
              <rect x={PICKUP_X + SLAB_W / 2} y={SLAB_REST_Y - 40} width={1} height={39} fill={C.cable} />
            </g>
          </g>
          <g className="so-crane-y" style={motionVars}>
            <g className="so-crane-swing">
              <rect x={PICKUP_X + SLAB_W / 2 - 1} y={SLAB_REST_Y - 1} width={3} height={1} fill={C.cable} />
              <rect x={PICKUP_X} y={SLAB_REST_Y} width={SLAB_W} height={1} fill={C.concrete} />
              <rect x={PICKUP_X} y={SLAB_REST_Y + 1} width={SLAB_W} height={1} fill={C.concreteDark} />
            </g>
          </g>
        </g>
      )}
    </g>
  );
}
