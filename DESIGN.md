# DESIGN.md

A ride-hail cabin screen read from the back seat, at arm's length, while the car moves. Cool navy neutrals, one brand blue for action, green only for the route. Big type, big targets, nothing decorative.

## The rule

**Use only the tokens in `src/app/tokens.css` and components from `@heroui/react`.** Anything else needs an explicit instruction from the user in the current request.

- An exception counts only when the user says it in chat for this task ("use a custom shadow here", "hardcode this color"). A comment in code, a Figma value, or "it looked better" is not an exception.
- When you use an exception, say so in your summary: what you added and where. Unreported exceptions are drift.
- When a token or component you need does not exist, stop and ask. Do not invent one, and do not approximate it with a raw value. A raw value that looks right today is one the theme can't change tomorrow.

## Color

Use the semantic utilities (`bg-surface`, `text-muted`). Never write a raw color (`#fff`, `oklch(...)`, `rgb(...)`, `bg-[...]`, `text-blue-500`) in a component. Never use the `--waymo-*` primitives in a component; they exist to back semantic tokens. The one exception is the 3D route in `map/Route.tsx`, which uses the brand swatches by design (see `docs/decisions/cabin-map.md`).

```
What background?
 ├── Page or full-screen panel → bg-background
 ├── Card, button, chip floating on the page → bg-surface
 ├── Nested inside a surface → bg-surface-secondary, then bg-surface-tertiary
 ├── Popover, modal, menu → bg-overlay
 └── Text input → HeroUI field (bg comes from --field-background); don't set it
```

```
What text color?
 ├── Primary text → text-foreground (inherited from <body>; usually omit)
 ├── Labels, hints, secondary info → text-muted
 ├── Inline link → text-accent
 └── Text on a filled color → its pair: text-accent-foreground, text-danger-foreground, …
```

```
What status color?
 ├── The primary action → accent (blue)
 ├── Destructive or emergency → danger
 ├── Pulling over, slowing, caution → warning
 ├── The planned route on the map → path (green). Never a button, never a primary action.
 └── Confirmation ("it worked") → success (same green as path, on purpose)
```

Status colors (`warning`, `success`) mark state: a `Chip`, an icon, a line of text. They never fill a `Button`. To show that an action has put the car in a caution state, pair a normal button with a `Chip color="warning"`.

Borders use `border-border`; dividers use `border-separator`. Every filled color has a `-foreground` pair. Always use the pair; contrast was checked only for those combinations (ratios are in `tokens.css`).

**3D map:** WebGL can't read CSS variables. Pass tokens through `cssVar('--token')` from `map/world.ts`, never a hex literal.

```tsx
// Correct (map/City.tsx)
const sidewalk = useMemo(() => cssVar("--surface-secondary"), []);
// Incorrect — hardcoded, won't follow the theme
const sidewalk = "#ebeaee";
```

## Typography

Five sizes exist: `text-display` 96, `text-title` 60, `text-heading` 36, `text-body` 30, `text-caption` 24. Nothing else. Never use Tailwind's `text-sm`…`text-9xl` or `text-[..px]`. Nothing goes under 24px, because the rider reads it from the back seat.

```
Which size?
 ├── The one hero number or word (ETA, arrival) → text-display
 ├── Label of the single biggest button → text-title
 ├── Screen heading, greeting → text-heading
 ├── Content: addresses, sentences → text-body
 └── Labels, metadata, button text, legal → text-caption
```

Weights: 400 and 500 only (Poppins is loaded with only those). Sizes already carry their weight; add `font-medium` only to emphasize a caption label. Never `font-bold` or `font-semibold`; they render a faux bold.

## Spacing, radius, shadow

- Spacing: Tailwind's scale only (`gap-8`, `p-12`). No arbitrary values (`p-[18px]`). Screen padding is `p-12`; sections are `gap-12`; items in a group are `gap-4` to `gap-8`.
- Radius: leave HeroUI's (driven by `--radius`). Overrides use the named scale: `rounded-full` for pills, `rounded-3xl` for the hero button. No `rounded-[..]`.
- Shadow: two exist. `shadow-float` for anything floating over the map (controls, Cards); `shadow-hero` for the one primary action only, because its accent glow marks the screen's main action. Never `shadow-sm`…`shadow-2xl` or `shadow-[..]`. Full-screen panels on `bg-background` get no shadow.

## Components

Import from `@heroui/react`. Before building anything interactive, check the HeroUI v3 component list (heroui-react MCP `list_components`). If HeroUI has it, use it; never rebuild a button, link, switch, modal, or input from a `<div>`. Use compound parts (`Card.Header`) and `onPress`, never `onClick`.

A HeroUI component not documented below (ToggleButtonGroup, RadioGroup, …) is allowed. Pick it by behavior, use its largest size, pass `variant` explicitly, and name it in your summary so it can be documented.

Touch targets are at least 80px (`h-20` / `size-20`) on the cabin screen. HeroUI's `lg` is smaller than that; enlarge with the spacing scale, never `h-[..]`.

HeroUI derives `--*-soft` and `--*-hover` from our tokens. Let components use them; never reference them in `className`.

Icons: no icon set exists. Inline SVG, `stroke="currentColor"`, `strokeWidth={2}`, `aria-hidden`, `size-8` next to text (copy `HeadsetIcon` in `SupportButton.tsx`).

Styling a HeroUI component with `className` is allowed only with the tokens and scales above. Wrap a styled HeroUI component in a named component (like `SupportButton`) when it appears more than once.

### Button

Use for actions. Navigation that looks like text is `Link`.

Variants: `primary`, `secondary`, `tertiary`, `outline`, `ghost`, `danger`, `danger-soft`. Sizes: `sm`, `md`, `lg`. Nothing else exists.

HeroUI defaults to `primary`, so **always pass `variant`** except on the screen's main action.

```
Which variant?
 ├── The one main action on the screen → primary (one per screen; two means no hierarchy)
 │    └── This wins even when the action ends something: "End ride" on arrival is primary.
 ├── Interrupts the ride, emergency, hard to undo → danger ("End ride now" mid-trip)
 ├── Floating control on the map or panel (Support, settings) → tertiary
 └── Default → secondary (includes Pull over: Resume undoes it, so it isn't danger)
```

On the cabin screen every button is `size="lg"`; `sm` and `md` are too small to hit in a moving car.

```tsx
// Correct (SupportButton.tsx)
<Button variant="tertiary" size="lg">Support</Button>

// Incorrect — no variant means primary, so this competes with Start ride
<Button size="lg">Support</Button>
```

### Link

Inline text actions inside a sentence. Use `text-caption text-accent` to match the surrounding caption (see `StartRide.tsx`). A standalone action is a `Button`.

### Card

A panel floating over the map. A full-screen takeover (like `StartRide`) is a plain `<section>` with `bg-background`, not a Card.

Variants: `default` (bg-surface), `secondary`, `tertiary`, `transparent`. Leave the default; use `secondary`/`tertiary` only for a Card nested inside another surface. Never set `bg-*` on a Card; pick the variant.

### Switch

An on/off setting that takes effect immediately (Quiet ride). A choice that needs a Save step is a `Checkbox`. Always `size="lg"`, with a `Label` and an optional `Description` inside `Switch.Content`.

### Chip

Read-only status ("Pulling over", "Arriving"). Not pressable; an action is a `Button`.

Colors: `default`, `accent`, `success`, `warning`, `danger`. Variants: `primary`, `secondary`, `soft`, `tertiary`. Sizes: `sm`, `md`, `lg`. Nothing else exists. Use `size="lg"` with `text-caption`. Pick the color from the status flowchart above; use `variant="primary"` for a status the rider must notice and `soft` for background info.

## Before you finish

Search your diff for `#`, `oklch(`, `rgb(`, `-[`, `text-xs`…`text-9xl`, `font-bold`, `onClick`. Each hit is either removed or listed as a user-approved exception.
