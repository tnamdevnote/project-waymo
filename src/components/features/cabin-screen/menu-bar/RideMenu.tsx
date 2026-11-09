"use client";

// CabinScreen.RideMenu: the floating menu bar shown during the ride. Pull over is wired to the
// cabin state; the rest report presses so the screen can open its own panels.
import { BottomSheet } from "../bottom-sheet/BottomSheet";
import { useCabinScreen } from "../CabinScreenRoot";
import { TroubleshootSheet } from "../troubleshoot/TroubleshootSheet";
import { MenuBar, type MenuBarProps } from "./MenuBar";

function MusicIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export type RideMenuProps = Omit<MenuBarProps, "children"> & {
  /** Cabin temperature in °F. */
  temperature?: number;
  /** Controlled: whether music is playing. */
  musicPlaying?: boolean;
  /** Uncontrolled starting value for `musicPlaying`. */
  defaultMusicPlaying?: boolean;
  onMusicPlayingChange?: (playing: boolean) => void;
  onClimate?: () => void;
  onTroubleshoot?: () => void;
};

export function RideMenu({
  temperature = 70,
  musicPlaying,
  defaultMusicPlaying,
  onMusicPlayingChange,
  onClimate,
  onTroubleshoot,
  className,
  "aria-label": ariaLabel = "Ride controls",
  ...props
}: RideMenuProps) {
  const { state, actions } = useCabinScreen();
  const hidden = state.phase !== "riding";

  // The wrapper floats and fades the bar; it stays mounted so the fade can play, `inert` while
  // boarding. React Aria's Toolbar doesn't forward `inert`, hence the div.
  return (
    <div
      inert={hidden}
      data-hidden={hidden || undefined}
      className={[
        "absolute inset-x-0 bottom-12 flex justify-end px-12",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:pointer-events-none data-[hidden]:opacity-0",
      ].join(" ")}
    >
      <MenuBar aria-label={ariaLabel} className={className} {...props}>
        <MenuBar.Toggle
          isSelected={musicPlaying}
          defaultSelected={defaultMusicPlaying}
          onChange={onMusicPlayingChange}
        >
          {({ isSelected }) => (
            <>
              <MusicIcon />
              {isSelected ? "Pause music" : "Play music"}
            </>
          )}
        </MenuBar.Toggle>
        <MenuBar.Separator />
        <MenuBar.Item
          aria-label={`Climate, ${temperature} degrees`}
          className="tabular-nums"
          onPress={onClimate}
        >
          {temperature}°
        </MenuBar.Item>
        <MenuBar.Separator />
        <MenuBar.Item onPress={state.driving ? actions.pullOver : actions.resume}>
          {state.driving ? "Pull over" : "Resume ride"}
        </MenuBar.Item>
        <MenuBar.Separator />
        {/* The item is the sheet's trigger: it opens the sheet and gets focus back on close. */}
        <BottomSheet>
          <MenuBar.Item onPress={onTroubleshoot}>
            <QuestionIcon />
            Troubleshoot
          </MenuBar.Item>
          <TroubleshootSheet />
        </BottomSheet>
      </MenuBar>
    </div>
  );
}
