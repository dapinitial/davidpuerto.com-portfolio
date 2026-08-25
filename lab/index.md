# Component Lab — davidpuerto.com-portfolio

UI pieces lifted out of the site into self-contained, shareable artifacts. Each
piece has a standalone HTML (all assets inlined, zero network deps), a one-click
CodePen launcher, and a `meta.json` with provenance. Managed by the
[`component-lab`](file:///Users/dpuerto/.claude/skills/component-lab/SKILL.md) skill.

**Front door on CodePen:** "The Lab" index pen → [codepen.io/dapinitial/pen/yyMyewe ↗](https://codepen.io/dapinitial/pen/yyMyewe) (links to every component pen; regenerate with `node ~/.claude/skills/component-lab/hub.mjs lab <galleryUrl> <profileUrl>`).
**Live gallery Artifact:** [The Lab ↗](https://claude.ai/code/artifact/15020758-6a4b-4dfd-88e6-0bfd9b6a55d4)

**Re-bundle any piece:** `node ~/.claude/skills/component-lab/bundle.mjs lab/<name>/<name>.config.json`
**Preview:** serve over localhost (`python3 -m http.server`) — `file://` is blocked in Claude-in-Chrome.

> Visibility: `yyMyewe` (hub), `gbmbPZZ` (loaders) were saved **Private**. For the
> hub's links to work for visitors, flip those pens (and `qErEOYd`) to **Public** in
> each pen's settings, then pin `yyMyewe` to your CodePen showcase.

| Component | What it is | Source | Artifact | CodePen |
|-----------|------------|--------|----------|---------|
| **neon-text** | Reactive two-tier neon sign header (`bright`/`dim` attrs, themeable via `--neon-bright`/`--neon-dim`); random letters short out on an interval. Zero-dep light-DOM web component, NeonTubes face inlined. | `site/js/elements/neon-text.js` + `site/css/elements/neon-text.css` | [Neon Bench ↗](https://claude.ai/code/artifact/c2d2027d-519c-48a7-baf1-c38c964fab7a) · local [`.artifact.html`](neon-text/neon-text.artifact.html) · [`.html`](neon-text/neon-text.html) | **[live pen ↗](https://codepen.io/dapinitial/pen/qErEOYd)** · [showcase launcher](neon-text/neon-text.showcase.codepen.html) · [bare component](neon-text/neon-text.codepen.html) |
| **neon-grid-loaders** | Four pure-CSS neon loaders — 5×5 dot matrices pulsing on staggered delays (center pulse, full-field, bottom + left sweeps). No JS, no images. **Pulled** from a 2015 Pug+SCSS pen and compiled to clean vanilla HTML+CSS. | pulled from [codepen.io/dapinitial/pen/NrLmoB ↗](https://codepen.io/dapinitial/pen/NrLmoB) | local [`.html`](neon-grid-loaders/neon-grid-loaders.html) | [origin pen ↗](https://codepen.io/dapinitial/pen/NrLmoB) · [remade launcher](neon-grid-loaders/neon-grid-loaders.codepen.html) (clean HTML+CSS) |
| **infinity-loader** | Continuous ∞ stroke-dash SVG spinner with a springy hop-away exit. Reduced-motion aware; exports a class (loads as a module). | `site/js/elements/infinity-loader.js` + `.css` | local [`.html`](infinity-loader/infinity-loader.html) | [launcher](infinity-loader/infinity-loader.codepen.html) |
| **rain-fall** | Ambient falling drips with splash rings, spawned on rAF up to `max-drips`; reduced-motion aware. Zero deps. | `site/js/elements/rain-fall.js` + `.css` | local [`.html`](rain-fall/rain-fall.html) | [launcher](rain-fall/rain-fall.codepen.html) |
| **glass-button** | Liquid-glass pill CTA — pure CSS, animated sheen sweep, graceful fallback. Bench with live label + size controls. | `site/css/elements/glass-button.css` (CSS-only) | [bench ↗](https://claude.ai/code/artifact/862c94fb-1aa3-4ad5-b0be-4046e5bd0b82) · local [`.html`](glass-button/glass-button.html) | [bench launcher](glass-button/glass-button.showcase.codepen.html) · [bare](glass-button/glass-button.codepen.html) |

> Note: `<neon-text>` is styled left-anchored for its contact-page slot
> (`margin:… auto 0 0`), so it hugs the left even in a centered demo — faithful to
> production. Wrap it if you want it centered for a showcase pen.
