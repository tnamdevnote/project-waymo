// ThoughtIcon: one of the 3D glyphs from the Figma icon set (High-Fi, node 491:3694), shown inside
// the thinking bubble as what the car is thinking about. Rendered images, not SVG: the shading and
// masks don't survive vector export. Each file is 256px, 2x the 128px it's shown at.
import Image from "next/image";
import back from "./thoughts/back.webp";
import chat from "./thoughts/chat.webp";
import check from "./thoughts/check.webp";
import done from "./thoughts/done.webp";
import help from "./thoughts/help.webp";
import idea from "./thoughts/idea.webp";
import map from "./thoughts/map.webp";
import navigate from "./thoughts/navigate.webp";
import pin from "./thoughts/pin.webp";
import search from "./thoughts/search.webp";
import settings from "./thoughts/settings.webp";
import support from "./thoughts/support.webp";
import warning from "./thoughts/warning.webp";

// Named by meaning, not by Figma layer: "R-Send" is the headphones, "L-Share" the back arrow,
// "L-Location" the navigation arrow, "L-Tick Square" is `done`.
const THOUGHTS = {
  back,
  chat,
  check,
  done,
  help,
  idea,
  map,
  navigate,
  pin,
  search,
  settings,
  support,
  warning,
};

export type Thought = keyof typeof THOUGHTS;

export type ThoughtIconProps = {
  name: Thought;
  className?: string;
};

/** Decorative: the bubble's status is announced separately, like the orb. */
export function ThoughtIcon({ name, className }: ThoughtIconProps) {
  return (
    <Image
      src={THOUGHTS[name]}
      alt=""
      aria-hidden
      // Already sized and compressed for 2x; the bubble pops open, so don't wait to lazy-load.
      unoptimized
      loading="eager"
      draggable={false}
      className={["size-32", className].filter(Boolean).join(" ")}
    />
  );
}
