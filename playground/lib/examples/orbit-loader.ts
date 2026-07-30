import { ShowcaseExample } from './types';

export const orbitLoaderExample: ShowcaseExample = {
  id: 'orbit-loader',
  title: 'Orbit Loader',
  description: 'Animated concentric loader combining trimPath sweeps, gradient strokes, additive blending and a blurred glow Scene',
  category: 'advanced',
  thumbnail: '/assets/orbit-loader-thumbnail.png',
  useDarkCanvas: true,
  code: `import { init } from '@thorvg/webcanvas';

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

const RINGS = [
  { radius: 220, width: 16, speed:  0.34, from: [ 64, 224, 255], to: [124,  92, 255] },
  { radius: 168, width: 12, speed: -0.52, from: [255, 106, 193], to: [255, 196,  92] },
  { radius: 118, width:  9, speed:  0.78, from: [ 92, 255, 188], to: [ 64, 224, 255] },
];

function pointAt(radius, u) {
  return {
    x: CX + radius * Math.sin(u * TAU),
    y: CY - radius * Math.cos(u * TAU),
  };
}

function sweepLength(ring, t) {
  return 0.16 + 0.12 * Math.sin(t * 1.7 + ring.radius * 0.01);
}

function sweepStart(ring, t) {
  return ((ring.speed * t) % 1 + 1) % 1;
}

function buildArc(ring, t, widthBoost) {
  const arc = new TVG.Shape();
  arc.appendCircle(CX, CY, ring.radius, ring.radius);

  const pos = sweepStart(ring, t);
  const len = sweepLength(ring, t);
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
  return core;
}

const startTime = performance.now();

function animate(now) {
  const t = (now - startTime) / 1000;

  canvas.clear();

  const glowPass = new TVG.Scene();
  for (const ring of RINGS) {
    glowPass.add(buildArc(ring, t, 10));
  }
  glowPass.gaussianBlur(14);
  glowPass.blend(TVG.BlendMethod.Add);
  glowPass.opacity(200);
  canvas.add(glowPass);

  const sharpPass = new TVG.Scene();
  for (const ring of RINGS) {
    sharpPass.add(buildArc(ring, t, 0));
    sharpPass.add(buildSatellite(ring, t));
  }
  canvas.add(sharpPass);

  canvas.add(buildCore(t));

  canvas.render();
  requestAnimationFrame(animate);
}

animate(performance.now());
`
};
