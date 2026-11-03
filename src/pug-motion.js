/**
 * Homepage-only puppet for the supplied pug illustration.
 *
 * The original Nuxt/Lottie container remains in place: the source site's
 * entrance and scroll choreography can continue to move that container.
 * Inside it, a small canvas mesh gently deforms the actual transparent PNG.
 * Head, ears, tongue, tail and leash use separate, smoothly blended fields;
 * there are no cutout seams or substitute drawings.
 */
const IMAGE_URL = '/assets/hero-pug.png';
const HOST_SELECTOR = '#white-dog__anim.main-page__white-dog';
const VIEW_SIZE = 1700;
// The supplied pug has wider ears than the original shaggy white dog.
// Fit its actual silhouette between the unchanged left/right headlines.
const DESKTOP_LAYOUT = { scale: 0.82, x: 188, y: 190 };
const MOBILE_LAYOUT = { scale: 0.86, x: 75, y: 135 };
const COLUMNS = 24;
const ROWS = 22;
const FRAME_INTERVAL = 1000 / 30;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let currentPuppet = null;
let mountQueued = false;

function bell(x, y, centerX, centerY, radiusX, radiusY) {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  return Math.exp(-2 * (dx * dx + dy * dy));
}

function smoothstep(start, end, value) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Affine mapping from one source-image triangle to one canvas triangle. */
function paintTriangle(context, image, source, destination) {
  const [a, b, c] = source;
  const [p, q, r] = destination;
  const determinant = a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y);
  if (Math.abs(determinant) < 0.0001) return;

  const m11 = (p.x * (b.y - c.y) + q.x * (c.y - a.y) + r.x * (a.y - b.y)) / determinant;
  const m12 = (p.y * (b.y - c.y) + q.y * (c.y - a.y) + r.y * (a.y - b.y)) / determinant;
  const m21 = (p.x * (c.x - b.x) + q.x * (a.x - c.x) + r.x * (b.x - a.x)) / determinant;
  const m22 = (p.y * (c.x - b.x) + q.y * (a.x - c.x) + r.y * (b.x - a.x)) / determinant;
  const dx = (p.x * (b.x * c.y - c.x * b.y) + q.x * (c.x * a.y - a.x * c.y) + r.x * (a.x * b.y - b.x * a.y)) / determinant;
  const dy = (p.y * (b.x * c.y - c.x * b.y) + q.y * (c.x * a.y - a.x * c.y) + r.y * (a.x * b.y - b.x * a.y)) / determinant;

  // A subpixel overlap prevents fine cracks between antialiased triangles.
  const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 };
  const expanded = destination.map(point => {
    const vx = point.x - center.x;
    const vy = point.y - center.y;
    const length = Math.hypot(vx, vy) || 1;
    return { x: point.x + vx / length * 0.55, y: point.y + vy / length * 0.55 };
  });
  context.save();
  context.beginPath();
  context.moveTo(expanded[0].x, expanded[0].y);
  context.lineTo(expanded[1].x, expanded[1].y);
  context.lineTo(expanded[2].x, expanded[2].y);
  context.closePath();
  context.clip();
  context.transform(m11, m12, m21, m22, dx, dy);
  context.drawImage(image, 0, 0);
  context.restore();
}

function createPuppet(host) {
  const element = document.createElement('div');
  element.className = 'hero-pug';
  element.dataset.character = 'pug';
  const fallback = document.createElement('img');
  fallback.className = 'hero-pug__fallback';
  fallback.src = IMAGE_URL;
  fallback.alt = 'A happy beige pug holding a red leash';
  fallback.decoding = 'async';
  fallback.fetchPriority = 'high';

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-pug__canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', fallback.alt);
  element.append(fallback, canvas);
  host.classList.add('has-hero-pug');
  host.append(element);

  const context = canvas.getContext('2d', { alpha: true });
  const image = new Image();
  image.decoding = 'async';
  let animationFrame = 0;
  let lastFrame = -Infinity;
  let visible = true;
  let disposed = false;
  let loaded = false;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let renderingScale = 1;
  let characterLayout = DESKTOP_LAYOUT;
  let sourcePoints = [];

  function resize() {
    characterLayout = window.matchMedia('(max-width: 1024px)').matches ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
    const width = element.getBoundingClientRect().width || VIEW_SIZE;
    // Cap backing resolution to avoid huge canvases on high-density displays.
    const resolution = Math.min(1700, Math.max(700, Math.round(width * Math.min(window.devicePixelRatio || 1, 1.3))));
    canvas.width = resolution;
    canvas.height = resolution;
    renderingScale = resolution / VIEW_SIZE;
    if (loaded) render(performance.now());
  }

  function deform(point, time, animate) {
    const x = point.x;
    const y = point.y;
    const phase = animate ? time / 1000 : 0;
    const wiggle = animate ? 1 : 0;
    const headWeight = (1 - smoothstep(375, 565, y)) * smoothstep(270, 430, x) * (1 - smoothstep(1030, 1160, x));
    const headAngle = (Math.sin(phase * 1.15) * 0.009 + easedX * 0.017) * wiggle;
    const breath = Math.sin(phase * 1.7) * wiggle;
    const earLeft = bell(x, y, 485, 220, 135, 160);
    const earRight = bell(x, y, 975, 300, 130, 160);
    const tongue = bell(x, y, 710, 400, 65, 56);
    const tail = bell(x, y, 1070, 745, 110, 140);
    const leash = bell(x, y, 460, 915, 110, 210);
    const torso = bell(x, y, 735, 660, 360, 370);
    const pivotX = 735;
    const pivotY = 445;
    const cosine = Math.cos(headAngle);
    const sine = Math.sin(headAngle);
    const rotatedX = (x - pivotX) * cosine - (y - pivotY) * sine + pivotX;
    const rotatedY = (x - pivotX) * sine + (y - pivotY) * cosine + pivotY;
    let dx = (rotatedX - x + easedX * 4 * wiggle) * headWeight;
    let dy = (rotatedY - y + easedY * 3 * wiggle + breath * 1.5) * headWeight;
    dx += Math.sin(phase * 2.2 + 0.6) * 2.8 * wiggle * earLeft;
    dx -= Math.sin(phase * 2.2 + 1.1) * 2.8 * wiggle * earRight;
    dy += Math.sin(phase * 2.5) * 1.8 * wiggle * tongue;
    dx += Math.sin(phase * 2.8) * 4.5 * wiggle * tail;
    dy -= Math.cos(phase * 2.8) * 1.7 * wiggle * tail;
    dx += Math.sin(phase * 1.15 - 0.7) * 3.2 * wiggle * leash;
    dy -= breath * 1.8 * torso;
    dx += (x - 735) * 0.0018 * breath * torso;
    const scale = VIEW_SIZE / image.naturalWidth * characterLayout.scale;
    return { x: characterLayout.x + (x + dx) * scale, y: characterLayout.y + (y + dy) * scale };
  }

  function render(now) {
    if (!context || !loaded || disposed) return;
    const animate = !reduceMotion.matches;
    easedX += (pointerX - easedX) * 0.09;
    easedY += (pointerY - easedY) * 0.09;
    context.setTransform(renderingScale, 0, 0, renderingScale, 0, 0);
    context.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);
    if (!animate) {
      const scale = VIEW_SIZE / image.naturalWidth * characterLayout.scale;
      context.drawImage(image, characterLayout.x, characterLayout.y, VIEW_SIZE * characterLayout.scale, image.naturalHeight * scale);
    } else {
      const destination = sourcePoints.map(point => deform(point, now, true));
      for (let row = 0; row < ROWS; row++) {
        for (let column = 0; column < COLUMNS; column++) {
          const topLeft = row * (COLUMNS + 1) + column;
          const topRight = topLeft + 1;
          const bottomLeft = topLeft + COLUMNS + 1;
          const bottomRight = bottomLeft + 1;
          for (const indices of [[topLeft, topRight, bottomLeft], [topRight, bottomRight, bottomLeft]]) {
            paintTriangle(context, image, indices.map(index => sourcePoints[index]), indices.map(index => destination[index]));
          }
        }
      }
    }
    element.classList.add('is-rendered');
  }

  function tick(now) {
    animationFrame = 0;
    if (disposed || !visible || document.hidden) return;
    if (now - lastFrame >= FRAME_INTERVAL) {
      lastFrame = now;
      render(now);
    }
    if (!reduceMotion.matches) animationFrame = requestAnimationFrame(tick);
  }

  function resume() {
    if (!animationFrame && loaded && visible && !disposed && !document.hidden) {
      animationFrame = requestAnimationFrame(tick);
    }
  }

  function onPointer(event) {
    pointerX = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
  }

  function resetPointer() { pointerX = 0; pointerY = 0; }
  function onMotionChange() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (loaded) render(performance.now());
    resume();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    if (!visible) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else resume();
  }, { rootMargin: '200px' });
  visibilityObserver.observe(element);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', resetPointer);
  document.addEventListener('visibilitychange', resume);
  reduceMotion.addEventListener('change', onMotionChange);

  image.onload = () => {
    if (disposed || !context) return;
    sourcePoints = [];
    for (let row = 0; row <= ROWS; row++) {
      for (let column = 0; column <= COLUMNS; column++) {
        sourcePoints.push({ x: column / COLUMNS * image.naturalWidth, y: row / ROWS * image.naturalHeight });
      }
    }
    loaded = true;
    resize();
    resume();
  };
  image.src = IMAGE_URL;

  return {
    host, element,
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', resume);
      reduceMotion.removeEventListener('change', onMotionChange);
      host.classList.remove('has-hero-pug');
      element.remove();
    },
  };
}

/** Idempotent; safe to call again after Nuxt route transitions. */
export function mountHeroPug() {
  const isHomepage = window.location.pathname.replace(/\/+$/, '') === '';
  const host = isHomepage ? document.querySelector(HOST_SELECTOR) : null;
  if (currentPuppet && (currentPuppet.host !== host || !currentPuppet.element.isConnected)) {
    currentPuppet.dispose();
    currentPuppet = null;
  }
  if (host && !currentPuppet) currentPuppet = createPuppet(host);
}

function scheduleMount() {
  if (mountQueued) return;
  mountQueued = true;
  requestAnimationFrame(() => { mountQueued = false; mountHeroPug(); });
}

const routeObserver = new MutationObserver(scheduleMount);
routeObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', scheduleMount);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountHeroPug, { once: true });
else mountHeroPug();
