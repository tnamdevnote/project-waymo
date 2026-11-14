# Obstruction marker: decided from /proto/obstruction

Date: 2026-11-14. How the cabin map marks what the car is stuck behind once diagnosis reaches "detected" (Figma: Cabin Screen / Stalled — 3 Cones detected). Lives in `CabinMap.Obstruction` (`src/components/features/cabin-screen/map/Obstruction.tsx`).

## Picked: Heat

The closure reads as an area of heat painted on the road, like a sensor heatmap, instead of a box floating over the screen.

- Drawn in the 3D scene, flat on the road, so it follows the camera's perspective and sits under the cones like the rest of the map.
- One soft radial blob per cone (4.4m across, 60% opacity) plus one wide, faint blob over the whole closure (its extent + 7m, 40%). Overlap reads hottest where the cones bunch up.
- Color: `--danger`, resolved through `cssVar` like the rest of the map.
- Height 0.08m and `renderOrder` 3: above and after the route ribbon (0.06m, order 2), so the heat sits on top of the route instead of under it.
- Which cones: the row nearest the car and anything within 4m past it.
- Enter: opacity fade, 300ms, ease-out (quartic, standing in for `cubic-bezier(0.32, 0.72, 0, 1)`). Exit: 200ms. Then it holds still: no pulse or breathing, for the same reason the thinking bubble doesn't float (see `thinking-bubble-motion.md`).
- Reduced motion: appears and disappears with no fade.

## Rejected

- **Current** (flat screen-space box, `bg-danger/40` with a 2px danger border, sized to the cones' projected bounds): matched the Figma frame literally, but it floated over the map instead of sitting in it, ignored perspective, and read like a UI annotation rather than something the car sensed.
- **Mark** (a crisp danger ring on the road around each cone, popping in nearest-first at a 40ms stagger): precise about each object, but at the cabin camera's height the rings came out about one cone wide. Too small to read from the back seat.
- **Trace** (a forward scan wave from the car's nose that lights each cone as it reaches it, ~900ms, once): told the best cause-and-effect story, but it was the one moving element on a screen that should settle, and its payoff was the same glow Heat shows without the wait.

## Open

- The green route still runs through the closure, so the heat tints it where they overlap. Whether the route should stop at, or reroute around, a blocked lane is a separate decision.
