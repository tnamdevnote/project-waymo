"use client";

// CabinScreen.RideMenu: the floating menu bar shown during the ride. Pull over asks first in a
// sheet, then stops the car; Resume ride drives on straight away. The rest report presses so the
// screen can open its own panels.
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MenuBar, type MenuBarProps } from "@/components/ui/MenuBar";
import { type RideScenario, useCabinScreen } from "../CabinScreenRoot";
import { useStoppingForTruck } from "../map/useStoppedAtTruck";
import { PullOverSheet } from "../pull-over/PullOverSheet";
import { type RideIssue, rideIssues, TroubleshootSheet } from "../troubleshoot/TroubleshootSheet";

/**
 * What "Report ride issue" offers in each demo scenario. Stalled and Looping offer the full set
 * so the rider picks what fits. Rerouting: it finds its own way round traffic.
 */
const ISSUES_BY_SCENARIO: Record<RideScenario, readonly RideIssue[]> = {
  stalled: rideIssues,
  looping: rideIssues,
  // The car reroutes round traffic on its own; nothing in its way to report.
  rerouting: ["Something else"],
};

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

/** A shield with an exclamation mark, for Get help (Figma node 780:389). */
function ShieldAlertIcon() {
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
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
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
  // While the car diagnoses a stall, takes a path suggestion or reroutes, the bar keeps only what
  // the rider might need now.
  const onCall = state.support !== null;
  const diagnosing =
    state.diagnosis !== null || state.pick !== null || state.reroute !== null || onCall;
  // Behind the fire truck, not yet round it: "Waymo is stuck" asks the rider to help pick a path.
  const canPickPath =
    state.world.blocked && state.course === state.world.loop && state.detour === null;
  // Stopping there on its own (not pulled over): ring Troubleshoot so the rider finds it, at the
  // same moment as the car's question mark.
  const stoppingForTruck = useStoppingForTruck();
  const stuck = canPickPath && stoppingForTruck && state.driving;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pullOverOpen, setPullOverOpen] = useState(false);
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
        {/* Pull over is the confirmation sheet's trigger, like Troubleshoot. The sheet stays
            mounted once the car stops and the item turns into Resume ride, so it can slide out. */}
        <BottomSheet isOpen={pullOverOpen} onOpenChange={setPullOverOpen}>
          {state.driving && <MenuBar.Item>Pull over</MenuBar.Item>}
          <PullOverSheet
            onCancel={() => setPullOverOpen(false)}
            onConfirm={() => {
              setPullOverOpen(false);
              actions.pullOver();
            }}
          />
        </BottomSheet>
        {!state.driving && <MenuBar.Item onPress={actions.resume}>Resume ride</MenuBar.Item>}
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
            {state.diagnosis === "scanning" || state.pick || state.reroute
              ? "Call support"
              : "Support"}
          </MenuBar.Item>
        )}
        {/* The item is the sheet's trigger: it opens the sheet and gets focus back on close. The
            sheet stays mounted after the item is gone, so it can still slide out. */}
        <BottomSheet isOpen={sheetOpen} onOpenChange={setSheetOpen}>
          {!diagnosing && (
            <MenuBar.Item className={stuck ? "stuck-ring" : undefined} onPress={onTroubleshoot}>
              <ShieldAlertIcon />
              Get help
            </MenuBar.Item>
          )}
          <TroubleshootSheet
            issues={ISSUES_BY_SCENARIO[state.scenario]}
            onCallSupport={callSupport}
            skipStuckReasons={canPickPath}
            onReportIssue={(issue) => {
              if (issue === "Something else") callSupport();
              if (issue === "Waymo is stuck" && canPickPath) {
                setSheetOpen(false);
                actions.startPathPick();
              }
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
