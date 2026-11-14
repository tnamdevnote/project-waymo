"use client";

// CabinScreen.RideMenu: the floating menu bar shown during the ride. Pull over is wired to the
// cabin state; the rest report presses so the screen can open its own panels.
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useCabinScreen } from "../CabinScreenRoot";
import { TroubleshootSheet } from "../troubleshoot/TroubleshootSheet";
import { MenuBar, type MenuBarProps } from "@/components/ui/MenuBar";

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

function HeadsetIcon() {
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
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M19 20a4 4 0 0 1-4 3h-2" />
    </svg>
  );
}

/** How long the rider has been talking to Support, as m:ss. Starts at 0:00 when it mounts. */
function CallTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="inline-flex">
      {[...`${mm}:${ss}`].map((char, i) =>
        char === ":" ? <span key={i}>:</span> : <TimerDigit key={i} digit={char} />,
      )}
    </span>
  );
}

/**
 * One digit in a slot as wide as the widest digit, so the pill doesn't change width or jiggle
 * every second. `tabular-nums` can't do this: Poppins has no tabular figures, and its "1" is
 * about half as wide as its "4" (the widest).
 */
function TimerDigit({ digit }: { digit: string }) {
  return (
    <span className="inline-grid justify-items-center">
      <span aria-hidden className="invisible col-start-1 row-start-1">
        4
      </span>
      <span className="col-start-1 row-start-1">{digit}</span>
    </span>
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
  onCallSupport?: () => void;
};

export function RideMenu({
  temperature = 70,
  musicPlaying,
  defaultMusicPlaying,
  onMusicPlayingChange,
  onClimate,
  onTroubleshoot,
  onCallSupport,
  className,
  "aria-label": ariaLabel = "Ride controls",
  ...props
}: RideMenuProps) {
  const { state, actions } = useCabinScreen();
  const hidden = state.phase !== "riding";
  // While the car diagnoses a stall or reroutes, the bar keeps only what the rider might need now.
  const onCall = state.support !== null;
  const diagnosing = state.diagnosis !== null || state.reroute !== null || onCall;
  const [sheetOpen, setSheetOpen] = useState(false);
  // "Call support", "Something else" and "None of these" in the sheet, and the bar's own Support
  // item during diagnosis or rerouting, all put the rider through to Support.
  const callSupport = () => {
    setSheetOpen(false);
    actions.startSupport();
    onCallSupport?.();
  };

  // The wrapper floats and fades the bar; it stays mounted so the fade can play, `inert` while
  // boarding. React Aria's Toolbar doesn't forward `inert`, hence the div. The div spans the whole
  // width to right-align the bar, so it lets presses through to what's under it (the Support
  // panel's Proceed button) and only the bar takes them; `inert` still blocks the bar when hidden.
  return (
    <div
      inert={hidden}
      data-hidden={hidden || undefined}
      className={[
        "pointer-events-none absolute inset-x-0 bottom-12 flex justify-end px-12",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:pointer-events-none data-[hidden]:opacity-0",
      ].join(" ")}
    >
      <MenuBar
        aria-label={ariaLabel}
        className={["pointer-events-auto", className].filter(Boolean).join(" ")}
        {...props}
      >
        {!diagnosing && (
          <>
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
          </>
        )}
        <MenuBar.Item onPress={state.driving ? actions.pullOver : actions.resume}>
          {state.driving ? "Pull over" : "Resume ride"}
        </MenuBar.Item>
        <MenuBar.Separator />
        {state.support === "connecting" && (
          <MenuBar.Item tone="danger" onPress={actions.endSupport}>
            End call
          </MenuBar.Item>
        )}
        {/* Once connected the call is a toggle that's on, filled with accent and showing how long
            it's been going (Figma node 558:4795). Turning it off hangs up. */}
        {state.support === "connected" && (
          <MenuBar.Toggle
            aria-label="Support call"
            // Solid accent, not HeroUI's soft selected fill: a live call is the one thing on the
            // bar that's happening right now. Only this toggle; Play music keeps the soft fill.
            className="bg-accent text-accent-foreground"
            isSelected
            onChange={(on) => {
              if (!on) actions.endSupport();
            }}
          >
            <HeadsetIcon />
            <CallTimer />
          </MenuBar.Toggle>
        )}
        {diagnosing && !onCall && (
          <MenuBar.Item onPress={callSupport}>
            <HeadsetIcon />
            {/* Per the Figma frames: "Call support" while scanning or rerouting, "Support" once detected. */}
            {state.diagnosis === "scanning" || state.reroute ? "Call support" : "Support"}
          </MenuBar.Item>
        )}
        {/* The item is the sheet's trigger: it opens the sheet and gets focus back on close. The
            sheet stays mounted after the item is gone, so it can still slide out. */}
        <BottomSheet isOpen={sheetOpen} onOpenChange={setSheetOpen}>
          {!diagnosing && (
            <MenuBar.Item onPress={onTroubleshoot}>
              <QuestionIcon />
              Troubleshoot
            </MenuBar.Item>
          )}
          <TroubleshootSheet
            onCallSupport={callSupport}
            onReportIssue={(issue) => {
              if (issue === "Something else") callSupport();
            }}
            onStuckReason={(reason) => {
              if (reason === "None of these") return callSupport();
              if (reason !== "Obstacles ahead") return;
              setSheetOpen(false);
              actions.startDiagnosis();
            }}
            onLostReason={(reason) => {
              if (reason === "None of these") return callSupport();
              if (reason !== "Try Another Path") return;
              setSheetOpen(false);
              actions.startReroute();
            }}
          />
        </BottomSheet>
      </MenuBar>
    </div>
  );
}
