import { useEffect, useRef } from 'react';
import { cls } from './ui';

/**
 * Decorative hero background: a calm sea under a field of stars, drawn on one <canvas>.
 * - Stars drift slowly, twinkle, and join their neighbours with thin lines (a constellation / network look).
 *   The pointer joins the stars near it.
 * - Four layers of waves, from pale blue to deep blue, roll along the bottom with a white crest line.
 * - Palette (Yemayá): deep blue, light blue and white.
 * - Cost control: the loop only runs while the hero is on screen and the tab is visible, the pixel ratio is
 *   capped at 2, and with `prefers-reduced-motion` a single still frame is painted and nothing moves.
 */

const TAU = Math.PI * 2;
const DEEP = [21, 39, 81];
const MID = [58, 126, 196];
const LIGHT = [147, 197, 238];
const WHITE = [255, 255, 255];

const LINK_DISTANCE = 120;
const POINTER_DISTANCE = 170;
const MAX_STARS = 120;
const STAR_SKY = 0.72; // stars live in the top part of the canvas, above the waves

const WAVES = [
  { base: 0.74, amp: 16, length: 520, speed: 0.00042, phase: 0.0, color: LIGHT, alpha: 0.32, crest: 0.0 },
  { base: 0.8, amp: 18, length: 430, speed: -0.0005, phase: 1.7, color: MID, alpha: 0.3, crest: 0.0 },
  { base: 0.86, amp: 15, length: 360, speed: 0.00062, phase: 3.1, color: DEEP, alpha: 0.5, crest: 0.55 },
  { base: 0.93, amp: 12, length: 300, speed: -0.0007, phase: 4.6, color: DEEP, alpha: 0.92, crest: 0.8 },
];

const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a})`;

/** Small seeded generator: the same sky every time, so a resize does not reshuffle it. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStars(width, height) {
  const random = seeded(2024);
  const count = Math.min(MAX_STARS, Math.round((width * height) / 11000));
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height * STAR_SKY,
    radius: 0.7 + random() * 1.6,
    phase: random() * TAU,
    speed: 0.4 + random() * 1.2,
    tone: random() < 0.55 ? DEEP : MID,
    sparkle: random() < 0.12,
  }));
}

function waveY(layer, x, time, height) {
  const t = time * layer.speed;
  return (
    layer.base * height +
    Math.sin((x / layer.length) * TAU + t + layer.phase) * layer.amp +
    Math.sin((x / (layer.length * 0.47)) * TAU - t * 1.3) * layer.amp * 0.4
  );
}

function drawStars(ctx, stars, time, pointer) {
  const positions = stars.map((star) => ({
    x: star.x + Math.sin(time * 0.00018 * star.speed + star.phase) * 9,
    y: star.y + Math.cos(time * 0.00014 * star.speed + star.phase) * 6,
  }));

  ctx.lineWidth = 1;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance > LINK_DISTANCE) continue;
      ctx.strokeStyle = rgba(MID, (1 - distance / LINK_DISTANCE) * 0.3);
      ctx.beginPath();
      ctx.moveTo(positions[i].x, positions[i].y);
      ctx.lineTo(positions[j].x, positions[j].y);
      ctx.stroke();
    }
    if (pointer) {
      const distance = Math.hypot(positions[i].x - pointer.x, positions[i].y - pointer.y);
      if (distance < POINTER_DISTANCE) {
        ctx.strokeStyle = rgba(DEEP, (1 - distance / POINTER_DISTANCE) * 0.45);
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
  }

  stars.forEach((star, i) => {
    const { x, y } = positions[i];
    const twinkle = 0.55 + 0.45 * Math.sin(time * 0.0016 * star.speed + star.phase);
    ctx.fillStyle = rgba(WHITE, 0.9 * twinkle);
    ctx.beginPath();
    ctx.arc(x, y, star.radius * 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(star.tone, 0.35 + 0.65 * twinkle);
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, TAU);
    ctx.fill();
    if (star.sparkle) {
      const arm = star.radius * (4 + 3 * twinkle);
      ctx.strokeStyle = rgba(star.tone, 0.55 * twinkle);
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();
    }
  });
}

function drawWaves(ctx, width, height, time) {
  for (const layer of WAVES) {
    ctx.fillStyle = rgba(layer.color, layer.alpha);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 8; x += 8) ctx.lineTo(x, waveY(layer, x, time, height));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    if (layer.crest > 0) {
      ctx.strokeStyle = rgba(WHITE, layer.crest);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width + 8; x += 8) {
        const y = waveY(layer, x, time, height);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function paint(ctx, width, height, time, stars, pointer) {
  ctx.clearRect(0, 0, width, height);
  drawStars(ctx, stars, time, pointer);
  drawWaves(ctx, width, height, time);
}

export default function HeroOcean({ className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const host = canvas.parentElement ?? canvas;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    let width = 0;
    let height = 0;
    let stars = [];
    let pointer = null;
    let frame = 0;
    let onScreen = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = createStars(width, height);
      if (reduced || !frame) paint(ctx, width, height, 0, stars, null);
    };

    const tick = (time) => {
      paint(ctx, width, height, time, stars, pointer);
      frame = onScreen && !document.hidden ? window.requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (reduced || frame || !onScreen || document.hidden) return;
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener('resize', resize);

    const visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) start();
            else stop();
          });
    visibilityObserver?.observe(canvas);

    if (!reduced) {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={cls('hero-ocean pointer-events-none absolute inset-0 size-full', className)} />;
}
