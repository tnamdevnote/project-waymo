# Thinking bubble motion: decided from /proto/bubble-motion

Date: 2026-11-12. How `ThinkingBubble` (`src/components/features/cabin-screen/thinking-bubble/ThinkingBubble.tsx`) opens, closes and swaps its glyph. The styles live in `src/app/globals.css` under the `.thinking-bubble` rules.

## Picked: Pop

One shape grows out of the car with a small overshoot, so the thought reads as coming from the vehicle.

- Enter: `opacity` 0 → 1, `scale` 0.6 → 1, 320ms, `cubic-bezier(0.34, 1.4, 0.64, 1)` (overshoots to about 102%, then settles)
- Exit: `opacity` → 0, `scale` → 0.94, 140ms, `cubic-bezier(0.4, 0, 1, 1)`
- Origin: `20% 83%` of the bubble, the centre of the puff, which is the part nearest the car. Not HeroUI's trigger anchor point.
- Glyph swap (warning → navigate): both glyphs stay mounted, stacked in one cell. The outgoing one shrinks to `scale` 0.3 with `blur(3px)` and fades; the incoming one does the reverse. 300ms, `cubic-bezier(0.25, 0.1, 0, 1)`. Transitions rather than keyframes, so a swap that reverses mid-way retargets cleanly.
- Reduced motion: no enter, exit or swap motion; the bubble and glyph appear and disappear.

## Rejected

- **Current** (HeroUI tooltip default, 150ms fade from 90%, 100ms exit, glyph cut with no transition): fine as a tooltip, but the bubble appeared from nowhere rather than from the car, and the hard cut between warning and navigate read as a glitch.
- **Form** (puff, then cloud, then glyph, about 420ms in sequence; glyph swap slides up): the most "thinking" story, but the glyph, which is the actual answer, arrived last.
- **Breathe** (280ms fade-and-rise, then a 5px float on a 3.2s loop while open): the only variant that never sat still. Constant motion in the rider's peripheral view, in a moving car, costs more than it tells them.
