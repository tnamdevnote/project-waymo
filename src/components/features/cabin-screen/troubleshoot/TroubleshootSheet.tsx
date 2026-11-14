"use client";

// The Troubleshoot sheet's content. Placeholder actions for now; place it inside a <BottomSheet>
// next to the button that opens it.
import { Button, type ButtonProps } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet, type BottomSheetContentProps } from "@/components/ui/BottomSheet";

// The tile's outline and label color. Neutral reports, accent reaches Support, danger is the
// emergency line. Outlined rather than filled so none of the three reads as the screen's main action.
const tone = {
  default: "",
  accent: "border-accent text-accent",
  danger: "border-danger text-danger",
} as const;

type ActionTileProps = Omit<ButtonProps, "variant"> & { tone?: keyof typeof tone };

// A large outlined tile, sized for a moving car rather than a toolbar.
function ActionTile({ tone: t = "default", className, ...props }: ActionTileProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      className={[
        "h-40 w-full border-2 px-6 text-caption font-normal text-balance whitespace-normal",
        tone[t],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

/** How long the rider holds "Hold for 911" before the call goes out. Matches `.hold-gauge` in globals.css. */
const HOLD_MS = 1500;

/**
 * The emergency tile. Press and hold, so a bump in a moving car can't place the call: a gauge
 * fills across the tile while held and the call goes out when it's full. Letting go early drains
 * it. Keyboard: hold Enter or Space.
 */
function Hold911Tile({ onCall }: { onCall?: () => void }) {
  const [holding, setHolding] = useState(false);
  const [calling, setCalling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ActionTile
      tone="danger"
      aria-label={calling ? "Calling 911" : "Hold to call 911"}
      data-holding={holding || undefined}
      data-done={calling || undefined}
      className="hold-gauge relative isolate overflow-hidden"
      onPressStart={() => {
        if (calling) return;
        setHolding(true);
        timer.current = setTimeout(() => {
          setHolding(false);
          setCalling(true);
          onCall?.();
        }, HOLD_MS);
      }}
      onPressEnd={() => {
        clearTimeout(timer.current);
        setHolding(false);
      }}
    >
      <span aria-hidden className="hold-gauge__fill absolute inset-0 -z-10 bg-danger opacity-20" />
      {calling ? "Calling 911…" : "Hold for 911"}
    </ActionTile>
  );
}

export const rideIssues = ["Waymo is stuck", "Waymo seems lost", "Something else"] as const;
export type RideIssue = (typeof rideIssues)[number];

export const stuckReasons = ["Obstacles ahead", "None of these"] as const;
export type StuckReason = (typeof stuckReasons)[number];

export const lostReasons = ["Try Another Path", "None of these"] as const;
export type LostReason = (typeof lostReasons)[number];

export type TroubleshootSheetProps = Omit<BottomSheetContentProps, "children"> & {
  onReport?: () => void;
  onReportIssue?: (issue: RideIssue) => void;
  /** The rider's answer to the follow-up question after "Waymo is stuck". */
  onStuckReason?: (reason: StuckReason) => void;
  /** The rider's answer to the follow-up question after "Waymo seems lost". */
  onLostReason?: (reason: LostReason) => void;
  onCallSupport?: () => void;
  onCallEmergency?: () => void;
};

type TroubleshootBodyProps = Omit<TroubleshootSheetProps, keyof BottomSheetContentProps>;

// Lives inside the dialog, which unmounts on close, so the sheet always reopens on the first step.
function TroubleshootBody({
  onReport,
  onReportIssue,
  onStuckReason,
  onLostReason,
  onCallSupport,
  onCallEmergency,
}: TroubleshootBodyProps) {
  const [step, setStep] = useState<"actions" | "report" | "stuck" | "lost">("actions");

  return (
    <>
      {step === "stuck" ? (
        // The follow-up question leads; "Troubleshoot" drops to context.
        <BottomSheet.Header>
          <BottomSheet.Heading>Tell us what’s happening</BottomSheet.Heading>
          <BottomSheet.Description>Troubleshoot</BottomSheet.Description>
        </BottomSheet.Header>
      ) : (
        <BottomSheet.Header>
          <BottomSheet.Heading>Troubleshoot</BottomSheet.Heading>
          <BottomSheet.Description>Tell us what’s happening</BottomSheet.Description>
        </BottomSheet.Header>
      )}
      <BottomSheet.Body>
        {step === "actions" && (
          <div className="grid grid-cols-3 gap-4">
            <ActionTile
              onPress={() => {
                setStep("report");
                onReport?.();
              }}
            >
              Report ride issue
            </ActionTile>
            <ActionTile tone="accent" onPress={onCallSupport}>
              Call support
            </ActionTile>
            <Hold911Tile onCall={onCallEmergency} />
          </div>
        )}
        {step === "report" && (
          <div className="grid grid-cols-3 gap-4">
            {rideIssues.map((issue) => (
              <ActionTile
                key={issue}
                onPress={() => {
                  if (issue === "Waymo is stuck") setStep("stuck");
                  if (issue === "Waymo seems lost") setStep("lost");
                  onReportIssue?.(issue);
                }}
              >
                {issue}
              </ActionTile>
            ))}
          </div>
        )}
        {step === "stuck" && (
          <div className="grid grid-cols-2 gap-4">
            {stuckReasons.map((reason) => (
              <ActionTile key={reason} onPress={() => onStuckReason?.(reason)}>
                {reason}
              </ActionTile>
            ))}
          </div>
        )}
        {step === "lost" && (
          <div className="grid grid-cols-2 gap-4">
            {lostReasons.map((reason) => (
              <ActionTile key={reason} onPress={() => onLostReason?.(reason)}>
                {reason}
              </ActionTile>
            ))}
          </div>
        )}
      </BottomSheet.Body>
    </>
  );
}

export function TroubleshootSheet({
  onReport,
  onReportIssue,
  onStuckReason,
  onLostReason,
  onCallSupport,
  onCallEmergency,
  ...props
}: TroubleshootSheetProps) {
  return (
    <BottomSheet.Content {...props}>
      <TroubleshootBody
        onReport={onReport}
        onReportIssue={onReportIssue}
        onStuckReason={onStuckReason}
        onLostReason={onLostReason}
        onCallSupport={onCallSupport}
        onCallEmergency={onCallEmergency}
      />
    </BottomSheet.Content>
  );
}
