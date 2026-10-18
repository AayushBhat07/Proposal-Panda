import { memo } from 'react';
import { C, R } from './pixels';

/**
 * The static porta-cabin: floor, walls, window strip, wall boards and furniture that nobody sits at.
 * Desks are drawn separately (Desk.tsx) so they can overlap the people sitting behind them.
 * Layout, in scene px: back wall y 0-28 with the window at x 90-230; side walls x 0-4 and 286-290;
 * door in the right wall at y 110-134; outside yard x 290-320 (generator there); front wall y 174-180.
 */

const WALL_R = 286;
const DOOR = { top: 110, bottom: 134 };

function Plant({ x, y }: { x: number; y: number }) {
  // x, y = bottom centre of the pot
  return (
    <g>
      <R x={x - 5} y={y - 15} w={10} h={8} c={C.greenDark} />
      <R x={x - 4} y={y - 16} w={3} h={6} c={C.green} />
      <R x={x + 1} y={y - 17} w={3} h={7} c={C.green} />
      <R x={x - 6} y={y - 12} w={3} h={3} c={C.green} />
      <R x={x + 3} y={y - 13} w={3} h={3} c={C.green} />
      <R x={x - 1} y={y - 14} w={2} h={6} c="#6fae5f" />
      <R x={x - 4} y={y - 7} w={8} h={7} c={C.out} />
      <R x={x - 3} y={y - 6} w={6} h={5} c="#b0603a" />
      <R x={x - 3} y={y - 6} w={6} h={1} c="#c97a50" />
    </g>
  );
}

function FilingCabinet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <R x={x} y={y} w={11} h={14} c={C.out} />
      <R x={x + 1} y={y + 1} w={9} h={12} c="#7f8f8a" />
      <R x={x + 1} y={y + 1} w={9} h={1} c="#9fb0aa" />
      {[0, 4, 8].map(d => (
        <g key={d}>
          <R x={x + 1} y={y + 4 + d} w={9} h={1} c="#5d6b67" />
          <R x={x + 4} y={y + 2 + d} w={3} h={1} c={C.metalLight} />
        </g>
      ))}
    </g>
  );
}

function BackWall() {
  return (
    <g>
      <R x={0} y={0} w={WALL_R + 4} h={28} c={C.wall} />
      <R x={0} y={0} w={WALL_R + 4} h={2} c={C.out} />
      <R x={0} y={24} w={WALL_R + 4} h={3} c={C.wallShade} />
      <R x={0} y={27} w={WALL_R + 4} h={1} c={C.wallDark} />

      {/* Window strip: sky and site here; <Crane> paints over x 90-230, y 0-28, then WindowFrame goes on top. */}
      <R x={90} y={2} w={140} h={22} c={C.sky} />
      <R x={90} y={2} w={140} h={4} c="#bfe0ee" />
      <R x={100} y={8} w={10} h={2} c={C.white} />
      <R x={98} y={9} w={15} h={2} c={C.white} />
      <R x={190} y={6} w={12} h={2} c={C.white} />
      <R x={187} y={7} w={18} h={2} c={C.white} />
      <R x={90} y={19} w={140} h={5} c={C.gravel} />
      <R x={90} y={19} w={140} h={1} c={C.gravelDark} />

      {/* Foreman's whiteboard */}
      <R x={9} y={5} w={36} h={17} c={C.out} />
      <R x={10} y={6} w={34} h={15} c={C.white} />
      <R x={13} y={9} w={14} h={1} c={C.blue} />
      <R x={13} y={12} w={20} h={1} c={C.blue} />
      <R x={13} y={15} w={10} h={1} c={C.red} />
      <R x={31} y={14} w={8} h={4} c={C.red} />
      <R x={32} y={15} w={6} h={2} c={C.white} />
      <R x={12} y={21} w={30} h={1} c={C.metalDark} />
      <R x={36} y={20} w={3} h={1} c={C.red} />

      {/* Programme board: a Gantt chart */}
      <R x={50} y={4} w={34} h={19} c={C.out} />
      <R x={51} y={5} w={32} h={17} c="#d9b98a" />
      <R x={52} y={6} w={30} h={2} c={C.paper} />
      <R x={53} y={9} w={10} h={2} c={C.blue} />
      <R x={58} y={12} w={12} h={2} c={C.orange} />
      <R x={66} y={15} w={9} h={2} c="#4caf50" />
      <R x={72} y={18} w={9} h={2} c={C.red} />
      <R x={67} y={8} w={1} h={13} c={C.red} />

      {/* Safety board */}
      <R x={236} y={4} w={26} h={18} c={C.out} />
      <R x={237} y={5} w={24} h={16} c="#2f8a4e" />
      <R x={246} y={7} w={6} h={12} c={C.white} />
      <R x={243} y={10} w={12} h={6} c={C.white} />
      <R x={238} y={6} w={22} h={1} c="#3fa863" />

      {/* Wall calendar */}
      <R x={266} y={6} w={14} h={15} c={C.out} />
      <R x={267} y={7} w={12} h={13} c={C.paper} />
      <R x={267} y={7} w={12} h={3} c={C.red} />
      {[0, 1, 2].map(r =>
        [0, 1, 2].map(k => <R key={`${r}${k}`} x={268 + k * 4} y={11 + r * 3} w={2} h={2} c={r === 1 && k === 2 ? C.red : C.wallDark} />)
      )}
    </g>
  );
}

function Floor() {
  return (
    <g>
      <defs>
        <pattern id="so-tile" width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={16} height={16} fill={C.floor} />
          <rect width={16} height={1} fill={C.grout} />
          <rect width={1} height={16} fill={C.grout} />
          <rect x={1} y={1} width={15} height={1} fill={C.floorLight} />
          <rect x={1} y={1} width={1} height={15} fill={C.floorLight} />
          <rect x={7} y={7} width={2} height={2} fill={C.floorLight} />
        </pattern>
        <pattern id="so-gravel" width={8} height={8} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill={C.gravel} />
          <rect x={1} y={2} width={1} height={1} fill={C.gravelDark} />
          <rect x={5} y={5} width={2} height={1} fill={C.gravelDark} />
          <rect x={6} y={1} width={1} height={1} fill="#c8b38a" />
        </pattern>
      </defs>
      <rect x={WALL_R} y={0} width={320 - WALL_R} height={180} fill="url(#so-gravel)" />
      <rect x={0} y={28} width={WALL_R} height={152} fill="url(#so-tile)" />
    </g>
  );
}

function SideWalls() {
  return (
    <g>
      {/* left */}
      <R x={0} y={0} w={5} h={180} c={C.wallShade} />
      <R x={0} y={0} w={2} h={180} c={C.out} />
      {/* front */}
      <R x={0} y={173} w={WALL_R + 4} h={7} c={C.wallShade} />
      <R x={0} y={173} w={WALL_R + 4} h={1} c={C.wallDark} />
      <R x={0} y={178} w={WALL_R + 4} h={2} c={C.out} />
      {/* right, with the door gap */}
      <R x={WALL_R} y={0} w={5} h={DOOR.top} c={C.wallShade} />
      <R x={WALL_R + 3} y={0} w={2} h={DOOR.top} c={C.out} />
      <R x={WALL_R} y={DOOR.bottom} w={5} h={180 - DOOR.bottom} c={C.wallShade} />
      <R x={WALL_R + 3} y={DOOR.bottom} w={2} h={180 - DOOR.bottom} c={C.out} />
      {/* door frame and the door swung open against the wall */}
      <R x={WALL_R - 1} y={DOOR.top - 2} w={7} h={2} c={C.woodDark} />
      <R x={WALL_R - 1} y={DOOR.bottom} w={7} h={2} c={C.woodDark} />
      <R x={WALL_R - 18} y={DOOR.bottom} w={18} h={3} c={C.out} />
      <R x={WALL_R - 17} y={DOOR.bottom + 1} w={16} h={1} c={C.woodLight} />
      {/* hazard stripes and mat in the doorway */}
      <R x={WALL_R - 10} y={DOOR.top + 2} w={10} h={DOOR.bottom - DOOR.top - 4} c="#3d4a46" />
      {[0, 4, 8, 12, 16].map(d => (
        <R key={d} x={WALL_R - 1} y={DOOR.top + 1 + d} w={3} h={2} c={C.yellow} />
      ))}
    </g>
  );
}

function ChaiCorner() {
  return (
    <g>
      {/* counter along the back wall */}
      <R x={246} y={28} w={40} h={15} c={C.out} />
      <R x={247} y={29} w={39} h={9} c={C.metalLight} />
      <R x={247} y={38} w={39} h={4} c={C.woodShade} />
      <R x={246} y={39} w={6} h={2} c={C.woodDark} />
      <R x={262} y={39} w={6} h={2} c={C.woodDark} />
      {/* stove with a steel kettle */}
      <R x={248} y={30} w={10} h={6} c={C.metalDark} />
      <R x={250} y={29} w={6} h={5} c={C.out} />
      <R x={251} y={30} w={4} h={3} c="#d7dcdd" />
      <R x={256} y={30} w={2} h={1} c={C.out} />
      {/* glasses of chai */}
      {[262, 266, 270].map(x => (
        <g key={x}>
          <R x={x} y={31} w={3} h={4} c={C.out} />
          <R x={x} y={32} w={3} h={3} c="#c27a3a" />
          <R x={x} y={31} w={3} h={1} c={C.white} />
        </g>
      ))}
      {/* biscuit tin */}
      <R x={276} y={30} w={7} h={6} c={C.out} />
      <R x={277} y={31} w={5} h={4} c={C.red} />
      {/* water cooler, between the inspector's desk and the counter */}
      <R x={236} y={28} w={9} h={17} c={C.out} />
      <R x={237} y={36} w={7} h={8} c={C.white} />
      <R x={237} y={29} w={7} h={7} c="#7cc4e8" />
      <R x={238} y={30} w={2} h={4} c="#b5e1f4" />
      <R x={239} y={39} w={2} h={1} c={C.blue} />
      {/* fuse box by the door */}
      <R x={279} y={92} w={7} h={10} c={C.out} />
      <R x={280} y={93} w={5} h={8} c="#c9b25a" />
      <R x={281} y={95} w={3} h={1} c={C.out} />
      <R x={281} y={97} w={1} h={2} c={C.red} />
    </g>
  );
}

function Photocopier() {
  return (
    <g>
      <R x={4} y={124} w={16} h={18} c={C.out} />
      <R x={5} y={125} w={14} h={5} c={C.metalLight} />
      <R x={5} y={130} w={14} h={11} c={C.metal} />
      <R x={6} y={126} w={8} h={3} c="#2f3b44" />
      <R x={15} y={126} w={3} h={1} c="#4caf50" />
      <R x={6} y={133} w={12} h={1} c={C.metalDark} />
      <R x={6} y={137} w={12} h={1} c={C.metalDark} />
      <R x={7} y={131} w={8} h={2} c={C.paper} />
    </g>
  );
}

function SiteClutter() {
  return (
    <g>
      {/* hard-hat rack on the left wall */}
      <R x={4} y={84} w={4} h={22} c={C.woodDark} />
      {[
        [86, C.yellow],
        [93, C.white],
        [100, C.orange],
      ].map(([y, c]) => (
        <g key={y}>
          <R x={6} y={(y as number) - 1} w={6} h={5} c={C.out} />
          <R x={7} y={y as number} w={4} h={3} c={c as string} />
        </g>
      ))}
      {/* bin of rolled drawings */}
      <R x={56} y={60} w={10} h={12} c={C.out} />
      <R x={57} y={64} w={8} h={7} c={C.woodShade} />
      <R x={57} y={57} w={2} h={8} c={C.paper} />
      <R x={60} y={55} w={2} h={10} c="#cfe0f3" />
      <R x={63} y={58} w={2} h={7} c={C.paper} />
      {/* theodolite on its tripod beside the plan table */}
      <R x={155} y={48} w={1} h={8} c={C.woodDark} />
      <R x={152} y={52} w={1} h={5} c={C.woodDark} />
      <R x={158} y={52} w={1} h={5} c={C.woodDark} />
      <R x={153} y={44} w={5} h={4} c={C.out} />
      <R x={154} y={45} w={3} h={2} c={C.yellow} />
      {/* plotter against the front wall */}
      <R x={120} y={162} w={30} h={10} c={C.out} />
      <R x={121} y={163} w={28} h={8} c={C.metal} />
      <R x={123} y={160} w={24} h={3} c={C.paper} />
      <R x={143} y={165} w={3} h={2} c="#4caf50" />
      {/* cement bags */}
      {[
        [196, 160],
        [208, 160],
        [202, 154],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <R x={x} y={y} w={12} h={8} c={C.out} />
          <R x={x + 1} y={y + 1} w={10} h={6} c="#d8d2c4" />
          <R x={x + 3} y={y + 3} w={6} h={2} c={C.metalDark} />
        </g>
      ))}
      {/* red toolbox by the door */}
      <R x={262} y={140} w={14} h={8} c={C.out} />
      <R x={263} y={141} w={12} h={6} c={C.red} />
      <R x={263} y={143} w={12} h={1} c="#8e2f27" />
      <R x={267} y={139} w={4} h={2} c={C.out} />
      {/* waste bin */}
      <R x={104} y={158} w={7} h={9} c={C.out} />
      <R x={105} y={159} w={5} h={7} c={C.metalDark} />
    </g>
  );
}

function Yard() {
  return (
    <g>
      {/* bricks */}
      <R x={294} y={30} w={22} h={14} c={C.out} />
      {[0, 4, 8].map(r => (
        <g key={r}>
          <R x={295} y={31 + r} w={20} h={3} c="#b5523b" />
          <R x={295 + (r % 8 === 0 ? 6 : 3)} y={31 + r} w={1} h={3} c="#8a3a29" />
          <R x={295 + (r % 8 === 0 ? 14 : 11)} y={31 + r} w={1} h={3} c="#8a3a29" />
        </g>
      ))}
      {/* rebar bundle */}
      <R x={296} y={58} w={20} h={1} c="#6b4a3a" />
      <R x={296} y={60} w={20} h={1} c="#6b4a3a" />
      <R x={296} y={62} w={20} h={1} c="#6b4a3a" />
      {/* cones */}
      {[160, 168].map(y => (
        <g key={y}>
          <R x={303 + (y - 160)} y={y} w={1} h={1} c={C.orange} />
          <R x={302 + (y - 160)} y={y + 1} w={3} h={2} c={C.orange} />
          <R x={302 + (y - 160)} y={y + 3} w={3} h={1} c={C.white} />
          <R x={301 + (y - 160)} y={y + 4} w={5} h={2} c={C.orange} />
        </g>
      ))}
    </g>
  );
}

function OfficeBackground() {
  return (
    <g>
      <Floor />
      <BackWall />
      <SideWalls />
      <ChaiCorner />
      <FilingCabinet x={5} y={40} />
      <FilingCabinet x={5} y={55} />
      <Photocopier />
      <SiteClutter />
      <Yard />
      <Plant x={96} y={44} />
      <Plant x={12} y={170} />
      <Plant x={236} y={170} />
      <Plant x={194} y={44} />
    </g>
  );
}

export default memo(OfficeBackground);

/** Window frame and sill, drawn after <Crane> so the crane sits behind the glass. */
function WindowFrameImpl() {
  return (
    <g>
      <R x={88} y={1} w={144} h={2} c={C.out} />
      <R x={88} y={1} w={2} h={24} c={C.out} />
      <R x={230} y={1} w={2} h={24} c={C.out} />
      <R x={159} y={3} w={2} h={21} c={C.out} />
      <R x={88} y={24} w={144} h={2} c={C.white} />
      <R x={88} y={26} w={144} h={1} c={C.wallDark} />
    </g>
  );
}

export const WindowFrame = memo(WindowFrameImpl);
