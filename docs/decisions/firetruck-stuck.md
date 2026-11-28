# Stuck behind a fire truck: decided from /proto/firetruck

Date: 2026-11-28. What the cabin screen shows after the rider reports "Waymo is stuck" while a fire truck is parked in the car's lane, taking up 2/3 of it. The car scans, then offers the two ways past: a bypass (one lane left, on up Comal St) or a detour (U-turn, back via Lake St).

Lives in `CabinScreen.Pass` (`src/components/features/cabin-screen/pass/Pass.tsx`) and `CabinMap.PassArrows` (`map/PassArrows.tsx`), driven by `state.pass` in `CabinScreenRoot.tsx` (`startPass`, `focusPassWay`, `choosePassWay`). The prototype was deleted on promotion.

## Picked: Panel, car decides

Variant 2's split view with Variant 3's content. The car proposes, and the rider can override or just let it go.

- Layout: a solid `bg-surface` column on the left holds all the content, with a separate 96px fade strip (`w-24 bg-linear-to-r from-surface to-transparent`) beside it. Content never sits on the gradient. The map stays visible on the right with the truck and both ways drawn on the road.
- Responsive:
  - Column width: 28rem, then 32rem from `xl`, then 36rem from `2xl`.
  - Padding and gaps: `p-8 pr-4 pb-12`, gap 8 below `xl`; `p-12 pr-6`, gap 12 from `xl`.
  - Buttons: pinned to the bottom of the column (`mt-auto`), 48px up, level with the ride controls. Below `2xl`, each button's seconds or cost sits under its label, so the label stays on one line. From `2xl` they sit side by side. Buttons are at least 96px tall and grow if a label wraps; the value never wraps or clips.
- Scanning (3.5s): heading "Scanning the road ahead…", "Your Waymo stopped for something ahead.", and a large square `ScanIndicator` (max-w-80, rounded-3xl).
- Then: the warning icon (yellow `fill-warning` triangle, `stroke-warning-foreground` mark, size-12) with "Obstruction detected", and "There's room to pass on the left. Your Waymo will go on its own."
- Primary button, "Pass on the left", `shadow-hero`, with a 10s countdown shown as "{n} s" and a fill bar sweeping left to right behind the label (`bg-accent-foreground`, opacity 20%). When it reaches zero, the car takes the bypass. The countdown holds while the rider has pulled over or the tab is hidden, and picks up where it left off. Under reduced motion the fill steps once a second.
- Choosing either way is the go-ahead: the car drives off even if the rider had pulled over. The bypass adds 1 minute to the arrival time; the detour adds 4 and ends the trip at the U-turn route's end, like a confirmed reroute.
- Secondary button, "Detour instead", showing "+4 min".
- On the road: both ways are drawn as arrows painted flat on the road in `--foreground` at 85% opacity (not accent, since the route already uses blue for the part driven). The proposed bypass is bright and the detour faint (30%). Hovering or focusing Detour swaps them. They fade with a ~250ms damp.
- Panel enter: 220ms `cubic-bezier(0.32, 0.72, 0, 1)`, rising 8px. Exit: 160ms ease-in. Buttons stagger in 60ms apart.
- Camera: while the panel shows (scanning and choosing), `CabinMap.Camera` treats it as a split view and moves sideways by `splitOffset` (0.4), so the car sits about 70% across the screen. It also pulls up to 46m, aimed 6m ahead of the car (`PASS_VIEW`), so the truck clears the top edge, the U-turn arrowhead stays on screen, and the car clears the menu bar. It eases back to the ride view once the car moves.
- The green route ahead stays drawn under the arrows. The car's thinking bubble hides while the panel shows and turns to the green arrow when the car sets off.
- While the panel shows, the menu bar keeps only Pull over and Call support, as in the other split views.
- No eyebrow above the heading: "Obstruction detected" leads.
- Both buttons share shape and alignment: icon on the left, then the label with its seconds or cost.
- Focus moves to "Pass on the left" when the buttons appear. Screen readers hear one announcement per stage, not every second of the countdown.
- Once moving: a note at the bottom left, level with the ride controls and clear of the arrival pill, reads "Passing on the left · +1 min" or "Turning around · +4 min" for 5 seconds.

## Rejected

- **On the road** (no panel: a scan card pinned beside the truck, then a button at the end of each arrow on the map): the most direct link between button and path, but the buttons had to dodge the truck, the car and the picker, and there was no room to say why or what each option costs.
- **Panel** (the same split view, but both ways as equal rows with name, action, detail and a cost chip): clear and complete, but it makes the rider decide every time, even when the car already knows the bypass is fine.
- **Car decides** (Variant 3's content in a card at the bottom left): the right behavior, but the small card competed with the map and felt like a notification rather than the screen's focus.

## Replaced

- **Help Waymo pick a path** (`CabinScreen.PathPick` and `CabinMap.PathChoices`, from f35106d): the rider tapped Go around or U-turn on the map, Waymo "checked" it for 5 seconds with Cancel, and a U-turn needed confirming on the reroute overview within 15 seconds or Ride Support was called. Removed with this decision, along with `state.pick`, `state.confirmingPick` and the U-turn confirmation in `CabinScreen.Reroute`. The car now proposes, and the rider overrides or lets it go.
