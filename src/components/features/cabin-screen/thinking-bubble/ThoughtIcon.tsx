// ThoughtIcon: one of the 3D glyphs from the Figma icon set (High-Fi, node 491:3694), shown inside
// the thinking bubble as what the car is thinking about. Rendered images, not SVG: the shading and
// masks don't survive vector export. Each file is 256px, 2x the 128px it's shown at.
import Image from "next/image";
import alert from "./thoughts/alert.webp";
import back from "./thoughts/back.webp";
import chat from "./thoughts/chat.webp";
import check from "./thoughts/check.webp";
import done from "./thoughts/done.webp";
import headset from "./thoughts/headset.webp";
import help from "./thoughts/help.webp";
import idea from "./thoughts/idea.webp";
import map from "./thoughts/map.webp";
import navigate from "./thoughts/navigate.webp";
import pin from "./thoughts/pin.webp";
import remote from "./thoughts/remote.webp";
import search from "./thoughts/search.webp";
import settings from "./thoughts/settings.webp";
import support from "./thoughts/support.webp";
import warning from "./thoughts/warning.webp";

// Named by meaning, not by Figma layer: "R-Send" is the headphones, "L-Share" the back arrow,
// "L-Location" the navigation arrow, "L-Tick Square" is `done`. `help` is the muted (grey) variant
// from the Stalled frame (node 561:111), not the blue one in the icon set. `alert` is the muted
// "!" from the Stalled — 3 frame: Figma's R-Info Circle turned 180° (node 558:8337). `remote` is
// the VR headset (L-VR Glasses, node 573:13727): a remote agent is looking at the car's view.
// `headset` is the muted R-Send (headphones) from the Ride Support frame (node 571:9813); `support`
// is the blue one from the icon set.
const THOUGHTS = {
  alert,
  back,
  chat,
  check,
  done,
  headset,
  help,
  idea,
  map,
  navigate,
  pin,
  remote,
  search,
  settings,
  support,
  warning,
};

export type Thought = keyof typeof THOUGHTS;

/**
 * The longest side of each glyph's artwork (its opaque bounding box) in px, on the 256px canvas.
 * The files are all 256px but the artwork in them isn't the same size (the headset fills 204px,
 * the VR glasses 151px), so each glyph is scaled to bring its artwork to ARTWORK px and they all
 * read as one size in the bubble.
 */
const EXTENT: Record<Thought, number> = {
  alert: 173,
  back: 170,
  chat: 159,
  check: 164,
  done: 177,
  headset: 204,
  help: 173,
  idea: 172,
  map: 186,
  navigate: 174,
  pin: 173,
  remote: 151,
  search: 176,
  settings: 174,
  support: 170,
  warning: 173,
};
/** The artwork size every glyph is brought to: the common size across the set. */
const ARTWORK = 173;

export type ThoughtIconProps = {
  name: Thought;
  /** Sizes the icon. Replaces the default rather than adding to it. @default "size-32" */
  className?: string;
};

/** Decorative: the bubble's status is announced separately, like the orb. Every glyph's artwork
 *  renders at the same size; `className` sizes them all alike. */
export function ThoughtIcon({ name, className = "size-32" }: ThoughtIconProps) {
  return (
    <Image
      src={THOUGHTS[name]}
      alt=""
      aria-hidden
      // Already sized and compressed for 2x; the bubble pops open, so don't wait to lazy-load.
      unoptimized
      loading="eager"
      draggable={false}
      className={className}
      style={{ scale: ARTWORK / EXTENT[name] }}
    />
  );
}
