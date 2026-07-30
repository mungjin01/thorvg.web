import { ShowcaseExample } from './types';

export const orbitLoaderExample: ShowcaseExample = {
  id: 'orbit-loader',
  title: 'Orbit Loader',
  description: 'Animated concentric loader combining trimPath sweeps, gradient strokes, additive blending and a blurred glow Scene',
  category: 'advanced',
  thumbnail: '/assets/orbit-loader-thumbnail.png',
  useDarkCanvas: true,
  code: `// Custom example: an animated "orbit" spinner.
// Combines four ThorVG features in one render loop:
//   1. trimPath()          - sweeping arcs carved out of full circles
//   2. LinearGradient      - gradient strokes on each arc
//   3. Scene + gaussianBlur - a blurred copy of the arcs used as a glow pass
//   4. BlendMethod.Add     - additive compositing so the glow reads as light

import { init } from '@thorvg/webcanvas';

const TVG = await init({
  renderer: 'gl',
  locateFile: (path) => '/webcanvas/' + path.split('/').pop()
});

const canvas = new TVG.Canvas('#canvas', {
  width: 600,
  height: 600,
});

const CX = 300;
const CY = 300;
const TAU = Math.PI * 2;

// Each ring sweeps at its own speed. Negative speed spins counter-clockwise.
const RINGS = [
  { radius: 220, width: 16, speed:  0.34, from: [ 64, 224, 255], to: [124,  92, 255] },
  { radius: 168, width: 12, speed: -0.52, from: [255, 106, 193], to: [255, 196,  92] },
  { radius: 118, width:  9, speed:  0.78, from: [ 92, 255, 188], to: [ 64, 224, 255] },
];

// appendCircle() starts its path at (cx, cy - ry) and runs clockwise,
// so a trim position u maps onto the circle like this.
function pointAt(radius, u) {
  return {
    x: CX + radius * Math.sin(u * TAU),
    y: CY - radius * Math.cos(u * TAU),
  };
}

// Arc length of the visible sweep, breathing between ~4% and ~28% of the ring.
function sweepLength(ring, t) {
  return 0.16 + 0.12 * Math.sin(t * 1.7 + ring.radius * 0.01);
}

// trimPath() only wraps offsets by a single period, so an ever-growing
// (or negative) offset must be folded back into [0, 1) by hand.
function sweepStart(ring, t) {
  return ((ring.speed * t) % 1 + 1) % 1;
}

function buildArc(ring, t, widthBoost) {
  const arc = new TVG.Shape();
  arc.appendCircle(CX, CY, ring.radius, ring.radius);

  const pos = sweepStart(ring, t);
  const len = sweepLength(ring, t);
  // end may exceed 1 — ThorVG then draws the segment that wraps past the seam.
  arc.trimPath(pos, pos + len);

  const gradient = new TVG.LinearGradient(
    CX - ring.radius, CY - ring.radius,
    CX + ring.radius, CY + ring.radius
  );
  gradient.setStops(
    [0, [ring.from[0], ring.from[1], ring.from[2], 255]],
    [1, [ring.to[0], ring.to[1], ring.to[2], 255]]
  );

  arc.stroke({
    width: ring.width + widthBoost,
    gradient: gradient,
    cap: TVG.StrokeCap.Round,
  });

  return arc;
}

// A dot riding the leading tip of each sweep.
function buildSatellite(ring, t) {
  const pos = sweepStart(ring, t);
  const len = sweepLength(ring, t);
  const tip = ring.speed > 0 ? pos + len : pos;

  const p = pointAt(ring.radius, tip);
  const r = ring.width * 0.62;

  const dot = new TVG.Shape();
  dot.appendCircle(p.x, p.y, r, r);
  dot.fill(ring.to[0], ring.to[1], ring.to[2], 255);
  dot.blend(TVG.BlendMethod.Add);
  return dot;
}

// Pulsing core: radial gradient fading to transparent at the rim.
function buildCore(t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  const radius = 34 + 10 * pulse;

  const core = new TVG.Shape();
  core.appendCircle(CX, CY, radius, radius);

  const glow = new TVG.RadialGradient(CX, CY, radius);
  glow.setStops(
    [0, [255, 255, 255, 255]],
    [0.35, [140, 220, 255, 210]],
    [1, [90, 120, 255, 0]]
  );
  core.fill(glow);

  // NOTE: deliberately left on the default Normal blend. On @thorvg/webcanvas
  // 1.1.0 the WebGL backend fails shader creation ("attachShader: parameter 2
  // is not of type 'WebGLShader'") for any non-Normal BlendMethod applied to a
  // RadialGradient fill. LinearGradient and solid fills blend fine, and the SW
  // backend handles every combination — so the workaround is renderer-agnostic:
  // keep radial fills on Normal. The white core over a dark background already
  // reads as a glow without additive compositing.
  return core;
}

const startTime = performance.now();

function animate(now) {
  const t = (now - startTime) / 1000;

  canvas.clear();

  // Pass 1 - glow: fatter arcs, heavily blurred, added on top of the background.
  const glowPass = new TVG.Scene();
  for (const ring of RINGS) {
    glowPass.add(buildArc(ring, t, 10));
  }
  glowPass.gaussianBlur(14);
  glowPass.blend(TVG.BlendMethod.Add);
  glowPass.opacity(200);
  canvas.add(glowPass);

  // Pass 2 - crisp arcs and their leading dots.
  const sharpPass = new TVG.Scene();
  for (const ring of RINGS) {
    sharpPass.add(buildArc(ring, t, 0));
    sharpPass.add(buildSatellite(ring, t));
  }
  canvas.add(sharpPass);

  // Pass 3 - the pulsing core.
  canvas.add(buildCore(t));

  canvas.render();
  requestAnimationFrame(animate);
}

animate(performance.now());
`
};
