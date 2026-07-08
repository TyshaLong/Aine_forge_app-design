/**
 * shapeGrid.js
 *
 * Animated shape-grid background engine.
 * Ported from the standalone HTML prototype.
 *
 * Usage:
 *   const destroy = createShapeGrid(canvasElement, options);
 *   // later, e.g. in a React useEffect teardown:
 *   return destroy;
 */

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Initialises the animated shape grid on the given canvas element, wires up
 * all window event listeners, and starts the render loop.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}  [options]
 * @param {number}  [options.gap=40]            - Grid spacing in px.
 * @param {number}  [options.radiusVmin=30]      - Pointer influence radius as % of vmin.
 * @param {number}  [options.speedIn=0.5]        - Seconds to animate a shape in.
 * @param {number}  [options.speedOut=0.6]       - Seconds to animate a shape out.
 * @param {number}  [options.restScale=0.09]     - Scale of idle (unaffected) shapes.
 * @param {number}  [options.minHoverScale=0.7]  - Minimum scale when hovered/waved.
 * @param {number}  [options.maxHoverScale=2]    - Maximum scale when hovered/waved.
 * @param {number}  [options.waveSpeed=1200]     - Wave propagation speed in px/s.
 * @param {number}  [options.waveWidth=180]      - Wave ring thickness in px.
 *
 * @returns {() => void} A `destroy` function that cancels the animation,
 *   removes event listeners, and clears pending timers.
 */
export function createShapeGrid(canvas, options = {}) {

  // --- Options (with defaults) -------------------------------------------

  const gap           = options.gap           ?? 40;
  const radiusVmin    = options.radiusVmin    ?? 30;
  const speedIn       = options.speedIn       ?? 0.5;
  const speedOut      = options.speedOut      ?? 0.6;
  const restScale     = options.restScale     ?? 0.09;
  const minHoverScale = options.minHoverScale ?? 0.7;
  const maxHoverScale = options.maxHoverScale ?? 2;
  const waveSpeed     = options.waveSpeed     ?? 1200;
  const waveWidth     = options.waveWidth     ?? 180;

  // --- Constants ------------------------------------------------------------

  /**
   * Colour palette used when randomly assigning a colour to each shape.
   * Each entry is either a solid hex colour or a two-stop radial gradient.
   */
  const PALETTE = [
    { type: 'solid', value: '#22c55e' },
    { type: 'solid', value: '#06b6d4' },
    { type: 'solid', value: '#f97316' },
    { type: 'solid', value: '#ef4444' },
    { type: 'solid', value: '#facc15' },
    { type: 'solid', value: '#ec4899' },
    { type: 'solid', value: '#9ca3af' },
    { type: 'solid', value: '#a78bfa' },
    { type: 'solid', value: '#60a5fa' },
    { type: 'solid', value: '#34d399' },
    { type: 'gradient', stops: ['#6366f1', '#3b82f6'] },
    { type: 'gradient', stops: ['#06b6d4', '#6366f1'] },
    { type: 'gradient', stops: ['#22c55e', '#06b6d4'] },
    { type: 'gradient', stops: ['#f97316', '#ef4444'] },
    { type: 'gradient', stops: ['#8b5cf6', '#06b6d4'] },
    { type: 'gradient', stops: ['#3b82f6', '#8b5cf6'] },
    { type: 'gradient', stops: ['#34d399', '#3b82f6'] },
  ];

  /**
   * Pool of shape types. 'star' appears twice to increase its probability.
   */
  const SHAPE_TYPES = ['circle', 'pill', 'star', 'star'];

  // --- Canvas context -------------------------------------------------------

  const ctx = canvas.getContext('2d');

  // --- Mutable state --------------------------------------------------------

  /** @type {{ shapes: object[], width: number, height: number } | null} */
  let grid = null;

  /** @type {number | null} requestAnimationFrame handle */
  let rafId = null;

  /** @type {{ x: number, y: number } | null} Last known pointer position */
  let pointer = null;

  /** Decays toward 0 each frame; set to 1 on pointermove to drive influence. */
  let activity = 0;

  /** Active wave rings, each with an origin and a start timestamp. */
  let waves = [];

  /** Cached bounding rects of masked UI elements (refreshed every 10 frames). */
  let maskRects = [];

  /** Frame counter used to throttle the mask-rect refresh. */
  let frameCount = 0;

  /**
   * When true, masking is suspended so a wave can visually pass through
   * elements that would otherwise hide shapes.
   */
  let maskOverride = false;

  /** setTimeout handles for maskOverride resets — cleared on destroy. */
  const waveTimers = [];

  // --- Math helpers ---------------------------------------------------------

  /** Returns a random float in [min, max). */
  function rnd(min, max) { return Math.random() * (max - min) + min; }

  /** Returns a random integer in [min, max]. */
  function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

  /** Returns a random element from an array. */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /**
   * Smooth Hermite interpolation — maps t ∈ [0,1] to a smooth S-curve.
   * Values outside [0,1] are clamped.
   */
  function smoothstep(t) {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  }

  /**
   * Converts an animation duration (seconds) into a per-frame lerp factor
   * suitable for `value += (target - value) * factor`.
   *
   * At 60 fps the value reaches ~95 % of its target in `seconds` seconds.
   */
  function durationToFactor(seconds) {
    if (seconds <= 0) return 1;
    return 1 - Math.pow(0.05, 1 / (60 * seconds));
  }

  // --- Draw helpers ---------------------------------------------------------

  /** Draws a filled circle of the given radius, centred on the current origin. */
  function drawCircle(c, size) {
    c.beginPath();
    c.arc(0, 0, size, 0, Math.PI * 2);
    c.fill();
  }

  /** Draws a vertical pill (rounded rectangle) centred on the current origin. */
  function drawPill(c, size) {
    const w = size * 0.48;
    const h = size;
    c.beginPath();
    c.roundRect(-w, -h, w * 2, h * 2, w);
    c.fill();
  }

  /**
   * Draws a star polygon centred on the current origin.
   *
   * @param {CanvasRenderingContext2D} c
   * @param {number} size       - Outer radius.
   * @param {number} points     - Number of points.
   * @param {number} innerRatio - Inner radius as a fraction of `size`.
   */
  function drawStar(c, size, points, innerRatio) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * innerRatio;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  }

  /** Dispatches to the correct draw function based on `shape.type`. */
  function drawShape(c, shape) {
    switch (shape.type) {
      case 'circle': return drawCircle(c, shape.size / 1.5);
      case 'pill':   return drawPill(c, shape.size / 1.4);
      case 'star':   return drawStar(c, shape.size, shape.points, shape.innerRatio);
    }
  }

  /**
   * Resolves a colour definition to a CSS colour string or a
   * CanvasGradient, ready to assign to `ctx.fillStyle`.
   *
   * @param {CanvasRenderingContext2D} c
   * @param {{ type: 'solid', value: string } | { type: 'gradient', stops: string[] }} colorDef
   * @param {number} size - Shape size, used to scale the gradient.
   * @returns {string | CanvasGradient}
   */
  function resolveFill(c, colorDef, size) {
    if (colorDef.type === 'solid') return colorDef.value;

    const grad = c.createRadialGradient(0, -size * 0.3, 0, 0, size * 0.3, size * 1.5);
    grad.addColorStop(0, colorDef.stops[0]);
    grad.addColorStop(1, colorDef.stops[1]);
    return grad;
  }

  /**
   * Returns a random `{ points, innerRatio }` object for star shapes.
   * Called both at creation time and when a star enters the hover state.
   */
  function randomStarProps() {
    return { points: rndInt(4, 10), innerRatio: rnd(0.1, 0.5) };
  }

  // --- Grid -----------------------------------------------------------------

  /**
   * Builds a fresh grid of shapes sized to fill the current viewport.
   * Each shape is placed on a regular `gap`-spaced lattice with randomised
   * type, colour, angle, and scale ceiling.
   *
   * @returns {{ shapes: object[], width: number, height: number }}
   */
  function buildGrid() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cols = Math.floor(W / gap);
    const rows = Math.floor(H / gap);

    // Centre the lattice within the viewport.
    const offsetX = (W - (cols - 1) * gap) / 2;
    const offsetY = (H - (rows - 1) * gap) / 2;

    const shapes = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const type = pick(SHAPE_TYPES);
        const shape = {
          x: offsetX + col * gap,
          y: offsetY + row * gap,
          type,
          color: pick(PALETTE),
          angle: rnd(0, Math.PI * 2),
          size: gap * 0.38,
          scale: restScale,
          maxScale: rnd(minHoverScale, maxHoverScale),
          hovered: false,
        };
        if (type === 'star') Object.assign(shape, randomStarProps());
        shapes.push(shape);
      }
    }

    return { shapes, width: W, height: H };
  }

  /**
   * (Re-)initialises the canvas dimensions and rebuilds the shape grid.
   * Called once on startup and again on every `resize` event.
   */
  function init() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Scale the backing buffer for high-DPI screens.
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    grid = buildGrid();
  }

  // --- Animation loop -------------------------------------------------------

  /**
   * Main render loop — called once per animation frame via rAF.
   *
   * Each frame:
   *  1. Clears and repaints the background.
   *  2. Decays pointer activity.
   *  3. Refreshes mask rects every 10 frames (cheap DOM read throttle).
   *  4. Prunes expired waves.
   *  5. For each shape: computes influence from pointer + waves, lerps the
   *     scale toward the target, then draws the shape.
   */
  function tick() {
    if (!grid) { rafId = requestAnimationFrame(tick); return; }

    const { shapes, width, height } = grid;
    const radius = Math.min(width, height) * (radiusVmin / 100);
    const now = performance.now();

    // Clear frame.
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, width, height);

    // Decay pointer activity toward zero.
    activity *= 0.93;

    // Throttled mask-rect refresh (every 10 frames ≈ 6 times/second at 60 fps).
    frameCount++;
    if (frameCount % 10 === 0) {
      maskRects = Array.from(document.querySelectorAll('[data-shape-mask]'))
        .map((el) => el.getBoundingClientRect());
    }

    // Remove waves that have fully propagated past the farthest corner.
    const maxDist = Math.sqrt(width * width + height * height);
    waves = waves.filter(
      (w) => (now - w.startTime) / 1000 * waveSpeed < maxDist + waveWidth
    );

    // Update and draw each shape.
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];

      // --- Masking ---
      // Shapes behind UI panels (sidebar, topbar, etc.) fade out unless a
      // wave is currently overriding the mask.
      const pad = gap / 2;
      const masked = !maskOverride && maskRects.some((r) =>
        shape.x >= r.left - pad && shape.x <= r.right  + pad &&
        shape.y >= r.top  - pad && shape.y <= r.bottom + pad
      );

      if (masked) {
        shape.scale += (0 - shape.scale) * durationToFactor(speedOut);
        if (shape.scale < 0.005) shape.scale = 0;
        continue;
      }

      // --- Pointer influence ---
      let pointerInfluence = 0;
      if (pointer && activity > 0.001) {
        const dx = shape.x - pointer.x;
        const dy = shape.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pointerInfluence = smoothstep(1 - dist / radius) * activity;

        // Randomise appearance when a shape first enters the hover zone.
        if (pointerInfluence > 0.05 && !shape.hovered) {
          shape.hovered = true;
          shape.maxScale = rnd(minHoverScale, maxHoverScale);
          shape.angle = rnd(0, Math.PI * 2);
          if (shape.type === 'star') Object.assign(shape, randomStarProps());
        } else if (pointerInfluence <= 0.05) {
          shape.hovered = false;
        }
      } else {
        shape.hovered = false;
      }

      // --- Wave influence ---
      // A shape is influenced by the strongest wave ring currently passing
      // through its position.
      let waveInfluence = 0;
      for (let j = 0; j < waves.length; j++) {
        const wave = waves[j];
        const waveRadius = (now - wave.startTime) / 1000 * waveSpeed;
        const wdx = shape.x - wave.x;
        const wdy = shape.y - wave.y;
        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        const t = 1 - Math.abs(wdist - waveRadius) / waveWidth;
        if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
      }

      // --- Scale lerp ---
      const pointerTarget = restScale + pointerInfluence * (shape.maxScale - restScale);
      const waveTarget    = restScale + waveInfluence    * (shape.maxScale - restScale);
      const target = Math.max(pointerTarget, waveTarget);

      const factor = target > shape.scale
        ? durationToFactor(speedIn)
        : durationToFactor(speedOut);
      shape.scale += (target - shape.scale) * factor;

      // Skip drawing shapes that are effectively invisible.
      if (shape.scale < restScale * 0.15) continue;

      // --- Draw ---
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.angle);
      ctx.scale(shape.scale, shape.scale);
      ctx.fillStyle = resolveFill(ctx, shape.color, shape.size);
      drawShape(ctx, shape);
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  }

  // --- Events & lifecycle ---------------------------------------------------

  /** Tracks the pointer position and marks activity as full. */
  function onMove(e) {
    pointer = { x: e.clientX, y: e.clientY };
    activity = 1;
  }

  /** Triggers a wave ring at the click position. */
  function onClick(e) {
    triggerWave(e.clientX, e.clientY);
  }

  /**
   * Emits a new wave ring originating at (x, y).
   *
   * Also sets `maskOverride = true` for the duration of the wave's travel so
   * the ring visually passes through masked UI elements, then resets it once
   * the wave has reached the farthest corner of the viewport.
   *
   * @param {number} [x] - Defaults to the horizontal centre of the viewport.
   * @param {number} [y] - Defaults to the vertical centre of the viewport.
   */
  function triggerWave(x, y) {
    x = x !== undefined ? x : window.innerWidth  / 2;
    y = y !== undefined ? y : window.innerHeight / 2;

    waves.push({ x, y, startTime: performance.now() });

    maskOverride = true;
    const travelTime = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / waveSpeed;
    const timer = setTimeout(() => { maskOverride = false; }, travelTime * 1000);
    waveTimers.push(timer);
  }

  // Kick everything off.
  init();
  rafId = requestAnimationFrame(tick);
  window.addEventListener('resize', init);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('click', onClick);
  triggerWave(); // Initial wave on load for a welcoming entrance animation.

  /**
   * Tears down the animation: cancels the rAF loop, removes all event
   * listeners, and clears any pending maskOverride timers.
   */
  return function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', init);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('click', onClick);
    waveTimers.forEach(clearTimeout);
  };
}
