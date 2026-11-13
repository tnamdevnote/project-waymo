"use client";

// PROTOTYPE (stall) — Variant 1, Step sheet: the existing bottom sheet, one step at a time.
// Axis: interruptive. Each stage replaces the last; the map is dimmed behind it.
import { BottomSheet } from "@/components/features/cabin-screen";
import { Button, Chip } from "@heroui/react";
import { useState } from "react";
import { Hold911Button, ShieldIcon, StepList, SupportControl } from "./shared";
import { ANSWERS, arrivalAt, CAUSE, etaLabel, isActive, type StallState } from "./useStall";

function Tile(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      {...props}
      className="h-32 w-full px-8 text-body text-balance whitespace-normal"
    />
  );
}

export function SheetVariant({ s }: { s: StallState }) {
  const active = isActive(s.stage);
  // Re-open on every stage change, so a rider who closed it still sees news.
  const [open, setOpen] = useState(active);
  const [lastStage, setLastStage] = useState(s.stage);
  if (s.stage !== lastStage) {
    setLastStage(s.stage);
    setOpen(active);
  }

  return (
    <>
      <BottomSheet isOpen={open} onOpenChange={setOpen}>
        <BottomSheet.Content isDismissable={false}>
          <SheetBody s={s} />
        </BottomSheet.Content>
      </BottomSheet>
      {/* While the sheet is closed mid-stall, one control brings it back. */}
      {active && !open && (
        <div className="absolute inset-x-0 bottom-12 flex justify-end px-12">
          <Button
            variant="tertiary"
            size="lg"
            onPress={() => setOpen(true)}
            className="h-20 gap-3 rounded-full bg-surface px-8 text-caption text-foreground shadow-float"
          >
            <Chip size="lg" color="warning" variant="primary">
              <Chip.Label className="text-caption">Paused</Chip.Label>
            </Chip>
            Show status
          </Button>
        </div>
      )}
    </>
  );
}

function Footer({ s }: { s: StallState }) {
  return (
    <div className="flex items-center justify-between gap-8 border-t border-separator pt-8">
      <SupportControl support={s.support} onCall={s.callSupport} className="shadow-none" />
      <Hold911Button />
    </div>
  );
}

function SheetBody({ s }: { s: StallState }) {
  const eta = (
    <Chip size="lg" color="warning" variant="soft">
      <Chip.Label className="text-caption tabular-nums">
        {etaLabel(s.eta)} · arriving {arrivalAt(s.eta)}
      </Chip.Label>
    </Chip>
  );

  switch (s.stage) {
    case "safety":
      return (
        <>
          <BottomSheet.Header>
            <div className="flex items-center gap-4 text-danger">
              <ShieldIcon className="size-10" />
              <BottomSheet.Heading className="text-foreground">We’ve paused</BottomSheet.Heading>
            </div>
            <BottomSheet.Description className="text-body">
              {s.reported && "Thanks for telling us. "}You’re safe. Hazards are on and the doors are
              locked. Please stay inside.
            </BottomSheet.Description>
          </BottomSheet.Header>
          <Footer s={s} />
        </>
      );
    case "cause":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>{CAUSE.title}</BottomSheet.Heading>
            <BottomSheet.Description className="max-w-prose text-body">
              {CAUSE.detail}
            </BottomSheet.Description>
          </BottomSheet.Header>
          <BottomSheet.Body>{eta}</BottomSheet.Body>
          <Footer s={s} />
        </>
      );
    case "ask":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>Can you see what’s blocking us?</BottomSheet.Heading>
            <BottomSheet.Description>
              The car isn’t sure what’s ahead. Your answer goes to the specialist helping it. It
              won’t move the car.
            </BottomSheet.Description>
          </BottomSheet.Header>
          <BottomSheet.Body>
            <div className="grid grid-cols-3 gap-8">
              {ANSWERS.map((a) => (
                <Tile key={a} variant="outline" onPress={() => s.answerAsk(a)}>
                  {a}
                </Tile>
              ))}
            </div>
          </BottomSheet.Body>
          <Footer s={s} />
        </>
      );
    case "working":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>A specialist is helping the car</BottomSheet.Heading>
            <BottomSheet.Description>
              {s.answer ? `Thanks. We passed on “${s.answer}”.` : CAUSE.title}
            </BottomSheet.Description>
          </BottomSheet.Header>
          <BottomSheet.Body className="flex flex-col gap-8">
            <StepList step={s.step} />
            {eta}
          </BottomSheet.Body>
          <Footer s={s} />
        </>
      );
    case "resolved":
      return (
        <BottomSheet.Header>
          <div className="flex items-center gap-4">
            <Chip size="lg" color="success" variant="primary">
              <Chip.Label className="text-caption">Moving</Chip.Label>
            </Chip>
            <BottomSheet.Heading>We’re moving again</BottomSheet.Heading>
          </div>
          <BottomSheet.Description className="text-body">
            Thanks for waiting. New arrival {arrivalAt(s.eta)}.
          </BottomSheet.Description>
        </BottomSheet.Header>
      );
    case "options":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>This is taking longer than usual</BottomSheet.Heading>
            <BottomSheet.Description>
              Keep waiting, get another car, or end the ride here. Support is joining.
            </BottomSheet.Description>
          </BottomSheet.Header>
          <BottomSheet.Body>
            <div className="grid grid-cols-3 gap-8">
              <Tile variant="outline" onPress={s.keepWaiting}>
                Keep waiting
              </Tile>
              <Tile onPress={s.sendNewCar}>Send another car</Tile>
              <Tile variant="danger-soft" onPress={s.endHere}>
                End ride here
              </Tile>
            </div>
          </BottomSheet.Body>
          <Footer s={s} />
        </>
      );
    case "newcar":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>Another car is on the way</BottomSheet.Heading>
            <BottomSheet.Description className="max-w-prose text-body">
              It will pull up behind us. Stay inside until it arrives, then exit on the right, to
              the sidewalk.
            </BottomSheet.Description>
          </BottomSheet.Header>
          <BottomSheet.Body>
            <Chip size="lg" color="accent" variant="soft">
              <Chip.Label className="text-caption tabular-nums">
                New car {etaLabel(s.eta).toLowerCase()}
              </Chip.Label>
            </Chip>
          </BottomSheet.Body>
          <Footer s={s} />
        </>
      );
    case "endhere":
      return (
        <>
          <BottomSheet.Header>
            <BottomSheet.Heading>
              {s.exitReady
                ? "Exit on the right, to the sidewalk"
                : "Checking it’s safe to get out…"}
            </BottomSheet.Heading>
            <BottomSheet.Description className="text-body">
              {s.exitReady
                ? "The right rear door is unlocked. Your fare has been refunded."
                : "The car is checking traffic and the curb before it unlocks a door."}
            </BottomSheet.Description>
          </BottomSheet.Header>
          <Footer s={s} />
        </>
      );
    default:
      return null;
  }
}
