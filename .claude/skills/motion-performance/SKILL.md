---
name: motion-performance
description: Make scroll-driven, snapping, layered web motion feel buttery. Use when animating slides, decks, carousels, scrubbed GSAP timelines, WebGL pieces, video heroes or text effects, when something "blinks", stutters or drops frames, or before shipping any new effect on davidpuerto.com. Includes a measure-first workflow and the fixes that took the decks from 4 fps to 47 fps.
---

# Motion performance

Every rule here was learned on davidpuerto.com in October 2026: a homepage that blinked when a trackpad swipe settled, and decks that dropped to 4 fps between slides. Measure first, fix the biggest cost, measure again.

## The model in one paragraph

A frame has three costs: **script** (your JS), **paint** (turning elements into pixels) and **composite** (the GPU stacking layers). Only `transform` and `opacity` can change without repainting, because the GPU moves an existing layer. Everything else (size, position, `filter`, `box-shadow`, colors, `background-position`, clip changes) repaints. Smooth motion is mostly the art of animating only transform and opacity, and keeping layers stable while they move.

## Measure first

Never guess. Run a frame-time probe in a headless browser, idle and while moving, before and after every change:

```js
// frames over a window: fps, p95 frame time, frames over 34 ms
await page.evaluate(() => new Promise((res) => {
  const d = []; let last = performance.now(); const t0 = last;
  const f = (t) => { d.push(t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else res(d); };
  requestAnimationFrame(f);
}));
```

- Measure **idle** on one slide and **moving** across 8 slides. Idle cost means something renders every frame for no reason.
- Isolate by elimination: turn off one effect at a time (remove the video, stop the sheen, hide the rain) and re-measure. The biggest delta is the culprit.
- Headless uses software rendering, so absolute numbers are low. Compare before and after on the same machine; the ratio is what matters.

## The fixes, biggest first

1. **Hidden is not off.** In a deck, every slide is a fixed layer that "intersects" the viewport even while `visibility: hidden`. `IntersectionObserver` says it is visible, so WebGL pieces and rAF loops keep rendering behind the slide you see. Gate every loop on the slide actually being active (`el.closest('.deck-beat')?.classList.contains('active')`).
2. **Never animate `filter: blur()` on images or video.** Blurring a large bitmap every frame is the single most expensive thing a page can do. Blur headlines only; images scale and fade. (A blurred image also flashes when its blur hits zero and the browser drops the filter layer.)
3. **Pause what nobody sees.** Off-screen slides pause their CSS animations: `.deck-beat:not(.active) * { animation-play-state: paused }`.
4. **No infinite loops that repaint.** A looping `background-position` sheen on clipped text repaints the text and its shadow every frame, forever. Play it once on arrival, then hold.
5. **Hold layers steady while a gesture is in flight.** Snap points make the scroll wobble across a boundary; each wobble flips a scrubbed tween between "at rest" (2D, layer demoted, big repaint) and "moving" (3D, layer promoted). That reads as a blink. Add `will-change: transform, opacity` only while scrolling (`is-scrolling` class on scroll, removed on `scrollend` plus a 220 ms fallback), so the layer settles once, at rest.
6. **But no permanent `will-change`.** A layer kept forever caches its soft mid-animation raster and looks blurry at rest. Promote for the motion, demote at rest.
7. **Decode images before they appear.** `img.decode()` on load, so the first frame a slide shows is not spent decoding a 20 MB bitmap.
8. **Images cost memory, not just bandwidth.** A 3 MB 2880 x 1800 PNG is about 20 MB decoded. Six of them invite eviction and re-decode (another blink). Prefer AVIF or WebP sized to the largest display size times device pixel ratio.
9. **Snap scaled values to exact rest values.** A scale of 0.999 at rest leaves the layer permanently bitmap-soft; quantize the scrub (`snap: { scale: 0.01 }`) so rest lands on exactly 1.
10. **Video is cheap when it is small and hardware-decoded.** A 360 x 640 H.264 clip is fine as a hero. A large ProRes or HEVC file, or a video under a per-frame filter, is not.

## Before shipping any new effect

- Does it animate anything other than transform or opacity? If so, why, and only while visible?
- Does it run when its slide or section is hidden?
- Does it loop forever? Could it play once?
- Is there a `filter` on anything large?
- Does it work with `prefers-reduced-motion: reduce` (static, no loop)?
- Measured: idle fps on its slide, and moving fps across it, before and after.

## Talking about it

The principle for a UX engineering room: personality is allowed where it costs the visitor nothing. Effects that run only on hover, only on the active slide, only once, on GPU-friendly properties, and stand still for reduced motion are restraint, not decoration.
