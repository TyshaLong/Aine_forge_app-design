# Forge — Ask Mode design prototype

`forge-ask-page.html` is a single, self-contained design prototype for the
"Ask Mode" screen of Forge (a git-native agentic coding tool). No build step,
no dependencies to install — open it directly in a browser.

## What's inside
- **Layout:** left sidebar (logo, New Chat, repo list, nav, upgrade card) and a
  main panel (Ask/Wiki tabs, knowledge-repo selector, hero empty-state, chat input).
- **Animated background:** a full-screen Canvas 2D shape grid (`#water-canvas` +
  the final `<script>`). Shapes idle as small dots and bloom into color near the
  pointer and on click-triggered ripple waves.
- **Masking:** any element with the `data-shape-mask` attribute hides the
  background shapes behind it (applied to the sidebar, top bar, repo bar, input box).

## Tunable animation constants (top of the final `<script>`)
`gap`, `restScale`, `minHoverScale`, `maxHoverScale`, `waveSpeed`, `waveWidth`.

## Notes for implementation
- Styling uses the Tailwind Play CDN + an inline `<style>` block. Swap the CDN for
  a compiled Tailwind build in production.
- Fonts: Inter (body) + Space Grotesk (display). Palette: yellow `#f5c800`,
  near-black `#080808`.
- The chat send is a **static mock** that renders a placeholder bubble — wire it to
  a real backend at the marked integration point; do not invent an API.

## React app

A runnable React + Vite + Tailwind implementation lives in [`app/`](app/).

```bash
cd app
npm install
npm run dev   # http://localhost:5174
```
