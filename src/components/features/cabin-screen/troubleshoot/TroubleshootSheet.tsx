'use client';

// The Troubleshoot sheet's content. Placeholder actions for now; place it inside a <BottomSheet>
// next to the button that opens it.
import { Button, type ButtonProps } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import {
  BottomSheet,
  type BottomSheetContentProps,
} from '@/components/ui/BottomSheet';

// The tile's outline and label color. Neutral reports, accent reaches Support, danger is the
// emergency line. Outlined rather than filled so none of the three reads as the screen's main action.
const tone = {
  default: '',
  accent: 'border-accent text-accent',
  danger: 'border-danger text-danger',
} as const;

type ActionTileProps = Omit<ButtonProps, 'variant'> & {
  tone?: keyof typeof tone;
};

// A large outlined tile, sized for a moving car rather than a toolbar.
function ActionTile({
  tone: t = 'default',
  className,
  ...props
}: ActionTileProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      className={[
        'h-40 w-full border-2 px-6 text-caption font-normal text-balance whitespace-normal',
        tone[t],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
      aria-label={calling ? 'Calling 911' : 'Hold to call 911'}
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
      <span
        aria-hidden
        className="hold-gauge__fill absolute inset-0 -z-10 bg-danger opacity-20"
      />
      {calling ? 'Calling 911…' : 'Hold for 911'}
    </ActionTile>
  );
}

/** One column per issue tile, up to three. */
const COLS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

export const rideIssues = [
  'Waymo is stuck',
  'Waymo seems lost',
  'Something else',
] as const;
export type RideIssue = (typeof rideIssues)[number];

export const lostReasons = ['Try Another Path', 'None of these'] as const;
export type LostReason = (typeof lostReasons)[number];

export type TroubleshootSheetProps = Omit<
  BottomSheetContentProps,
  'children'
> & {
  /** Which issues Troubleshoot offers, in order. Defaults to all of `rideIssues`. */
  issues?: readonly RideIssue[];
  onReport?: () => void;
  onReportIssue?: (issue: RideIssue) => void;
  /** The rider's answer to the follow-up question after "Waymo seems lost". */
  onLostReason?: (reason: LostReason) => void;
  onCallSupport?: () => void;
  onCallEmergency?: () => void;
};

type TroubleshootBodyProps = Omit<
  TroubleshootSheetProps,
  keyof BottomSheetContentProps
>;

// Lives inside the dialog, which unmounts on close, so the sheet always reopens on the first step.
function TroubleshootBody({
  issues = rideIssues,
  onReport,
  onReportIssue,
  onLostReason,
  onCallSupport,
  onCallEmergency,
}: TroubleshootBodyProps) {
  const [step, setStep] = useState<'actions' | 'report' | 'lost'>('actions');

  return (
    <>
      <BottomSheet.Header>
        <BottomSheet.Heading>Tell us whats happening</BottomSheet.Heading>
        <BottomSheet.Description>
          {step === 'actions'
            ? 'Choose an option below to resolve the issue'
            : 'Share what you’re experiencing so we can assist.'}
        </BottomSheet.Description>
      </BottomSheet.Header>
      <BottomSheet.Body>
        {step === 'actions' && (
          <div className="grid grid-cols-3 gap-4">
            <ActionTile
              onPress={() => {
                setStep('report');
                onReport?.();
              }}
            >
              Troubleshoot
            </ActionTile>
            <ActionTile tone="accent" onPress={onCallSupport}>
              Call support
            </ActionTile>
            <Hold911Tile onCall={onCallEmergency} />
          </div>
        )}
        {step === 'report' && (
          <div
            className={[
              'grid gap-4',
              COLS[Math.min(issues.length, 3) - 1],
            ].join(' ')}
          >
            {issues.map((issue) => (
              <ActionTile
                key={issue}
                onPress={() => {
                  if (issue === 'Waymo seems lost') setStep('lost');
                  onReportIssue?.(issue);
                }}
              >
                {issue}
              </ActionTile>
            ))}
          </div>
        )}
        {step === 'lost' && (
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
  issues,
  onReport,
  onReportIssue,
  onLostReason,
  onCallSupport,
  onCallEmergency,
  ...props
}: TroubleshootSheetProps) {
  return (
    <BottomSheet.Content {...props}>
      <TroubleshootBody
        issues={issues}
        onReport={onReport}
        onReportIssue={onReportIssue}
        onLostReason={onLostReason}
        onCallSupport={onCallSupport}
        onCallEmergency={onCallEmergency}
      />
    </BottomSheet.Content>
  );
}
