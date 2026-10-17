/**
 * The "Local model" diesel generator outside the door. Draws within x 296..320, y 105..140:
 * smoke above, the set in the middle, a "LOCAL MODEL" plate at its base.
 */

type GeneratorState = 'off' | 'starting' | 'running' | 'failed';

const CSS = `
.so-gen-shake{animation:so-gen-shake .3s steps(1,end) infinite}
.so-gen-hum{animation:so-gen-hum .5s steps(1,end) infinite}
.so-gen-blink{animation:so-gen-blink 1s steps(1,end) infinite}
.so-gen-puff{opacity:0;animation:so-gen-puff 1.2s steps(4,end) infinite}
.so-gen-puff.so-gen-slow{animation-duration:2.4s}
.so-gen-d1{animation-delay:-.4s}.so-gen-d2{animation-delay:-.8s}
.so-gen-slow.so-gen-d1{animation-delay:-.8s}.so-gen-slow.so-gen-d2{animation-delay:-1.6s}
@keyframes so-gen-shake{0%{transform:translate(0,0)}25%{transform:translate(1px,0)}50%{transform:translate(0,-1px)}75%{transform:translate(-1px,0)}}
@keyframes so-gen-hum{0%{transform:translate(0,0)}50%{transform:translate(0,1px)}}
@keyframes so-gen-blink{0%{opacity:1}50%{opacity:.35}}
@keyframes so-gen-puff{0%{opacity:.9;transform:translate(0,0)}100%{opacity:.1;transform:translate(-2px,-6px)}}
@media (prefers-reduced-motion: reduce){.so-gen-shake,.so-gen-hum,.so-gen-blink{animation:none}.so-gen-puff{display:none}}
`;

const BODY: Record<GeneratorState, { light: string; main: string; dark: string; lamp: string }> = {
  off: { light: '#a9afb4', main: '#8a9096', dark: '#5c6268', lamp: '#4a4f54' },
  starting: { light: '#f0a64a', main: '#d9862b', dark: '#8f5317', lamp: '#f2c230' },
  running: { light: '#f0a64a', main: '#d9862b', dark: '#8f5317', lamp: '#3bd16f' },
  failed: { light: '#c98a4a', main: '#a8692c', dark: '#6b4119', lamp: '#e0443a' },
};

// 5-row pixel glyphs, rows top to bottom (M is wider so it doesn't read as H).
const GLYPHS: Record<string, string[]> = {
  L: ['100', '100', '100', '100', '111'],
  O: ['111', '101', '101', '101', '111'],
  C: ['111', '100', '100', '100', '111'],
  A: ['010', '101', '111', '101', '101'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
};

function PixelText({ text, x, y, fill }: { text: string; x: number; y: number; fill: string }) {
  const px = [];
  let left = x;
  for (let i = 0; i < text.length; i++) {
    const g = GLYPHS[text[i]];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (g[r][c] === '1') px.push(<rect key={`${i}-${r}-${c}`} x={left + c} y={y + r} width={1} height={1} fill={fill} />);
      }
    }
    left += g[0].length + 1;
  }
  return <g>{px}</g>;
}

export default function Generator({ state }: { state: GeneratorState }) {
  const c = BODY[state];
  const motion = state === 'starting' ? 'so-gen-shake' : state === 'running' ? 'so-gen-hum' : undefined;
  const smoke = state === 'failed' ? '#3a3a3a' : '#e4e7ea';
  const puffs = state === 'starting' || state === 'failed';
  const slow = state === 'failed' ? ' so-gen-slow' : '';

  return (
    <g shapeRendering="crispEdges" role="img" aria-label={`Local model generator: ${state}`}>
      <style>{CSS}</style>
      {/* ground shadow */}
      <rect x={298} y={126} width={21} height={1} fill="#00000033" />

      <g className={motion}>
        {/* exhaust */}
        <rect x={313} y={110} width={2} height={4} fill="#3b3f42" />
        <rect x={312} y={110} width={4} height={1} fill="#2a2d30" />
        {/* top face, front face, skid */}
        <rect x={298} y={113} width={20} height={3} fill={c.light} />
        <rect x={301} y={114} width={2} height={1} fill={c.dark} />
        <rect x={298} y={116} width={20} height={9} fill={c.main} />
        <rect x={298} y={116} width={20} height={1} fill={c.dark} />
        <rect x={297} y={125} width={22} height={1} fill="#3b3f42" />
        {/* grille */}
        {[118, 120, 122].map(y => (
          <rect key={y} x={307} y={y} width={9} height={1} fill={c.dark} />
        ))}
        {/* lamp in a dark bezel */}
        <rect x={300} y={118} width={4} height={4} fill="#2a2d30" />
        <rect
          className={state === 'failed' || state === 'starting' ? 'so-gen-blink' : undefined}
          x={301}
          y={119}
          width={2}
          height={2}
          fill={c.lamp}
        />
      </g>

      {puffs &&
        [0, 1, 2].map(i => (
          <rect
            key={i}
            className={`so-gen-puff${slow}${i ? ` so-gen-d${i}` : ''}`}
            x={312 + (i % 2)}
            y={107}
            width={i === 1 ? 2 : 3}
            height={2}
            fill={smoke}
          />
        ))}

      {/* "LOCAL MODEL" plate */}
      <rect x={297} y={128} width={23} height={12} fill="#1f2a33" />
      <rect x={297} y={128} width={23} height={1} fill="#3d4b57" />
      <PixelText text="LOCAL" x={299} y={129} fill="#f2e6c9" />
      <PixelText text="MODEL" x={298} y={135} fill="#f2e6c9" />
    </g>
  );
}
