"use client";

// PROTOTYPE (stall) — Variant 3, Ambient: the map stays full screen. One compact status card in
// the corner updates in place and only grows when the rider has a choice to make.
// Axis: minimum interruption. The car's state is glanceable, never in the way.
import { Button, Card, Chip, Spinner } from "@heroui/react";
import { Hold911Button, ShieldIcon, SupportControl } from "./shared";
import { ANSWERS, arrivalAt, CAUSE, etaLabel, isActive, STEPS, type StallState } from "./useStall";

function Choice(props: React.ComponentProps<typeof Button>) {
  return <Button size="lg" {...props} className="h-20 px-8 text-caption" />;
}

export function AmbientVariant({ s }: { s: StallState }) {
  if (!isActive(s.stage)) return null;
  const st = s.stage;

  let chip: { color: "warning" | "success" | "accent"; label: string } = {
    color: "warning",
    label: "Paused",
  };
  let title = "";
  let detail = "";
  let actions: React.ReactNode = null;
  let busy = false;

  switch (st) {
    case "safety":
      title = s.reported ? "Thanks for telling us. You’re safe." : "You’re safe";
      detail = "Hazards on · doors locked · please stay inside";
      break;
    case "cause":
      title = CAUSE.title;
      detail = `${etaLabel(s.eta)} · arriving ${arrivalAt(s.eta)}`;
      break;
    case "ask":
      title = "Can you see what’s blocking us?";
      detail = "Goes to the specialist. It won’t move the car.";
      actions = ANSWERS.map((a) => (
        <Choice key={a} variant="outline" onPress={() => s.answerAsk(a)}>
          {a}
        </Choice>
      ));
      break;
    case "working":
      busy = true;
      title = STEPS[Math.min(s.step, STEPS.length - 1)];
      detail = `${etaLabel(s.eta)} · arriving ${arrivalAt(s.eta)}`;
      break;
    case "resolved":
      chip = { color: "success", label: "Moving" };
      title = "We’re moving again";
      detail = `Arriving ${arrivalAt(s.eta)}`;
      break;
    case "options":
      title = "Taking longer than usual";
      detail = "Support is joining.";
      actions = (
        <>
          <Choice variant="outline" onPress={s.keepWaiting}>
            Keep waiting
          </Choice>
          <Choice variant="primary" onPress={s.sendNewCar}>
            Send another car
          </Choice>
          <Choice variant="danger-soft" onPress={s.endHere}>
            End ride here
          </Choice>
        </>
      );
      break;
    case "newcar":
      chip = { color: "accent", label: "New car" };
      title = `Another car ${etaLabel(s.eta).toLowerCase()}`;
      detail = "Stay inside. Then exit on the right.";
      break;
    case "endhere":
      busy = !s.exitReady;
      title = s.exitReady ? "Exit on the right" : "Checking the curb…";
      detail = s.exitReady
        ? "Right rear door unlocked · fare refunded"
        : "Doors stay locked until it’s safe";
      break;
  }

  return (
    <>
      <Card
        aria-live="polite"
        className="proto-ambient absolute top-12 left-12 w-xl gap-6 p-8 shadow-float"
      >
        {/* Keyed so each new state fades in instead of text swapping under the rider's eyes. */}
        <div
          key={st + s.step + String(s.exitReady)}
          className="proto-ambient-content flex flex-col gap-6"
        >
          <div className="flex items-center gap-4">
            <Chip size="lg" color={chip.color} variant="primary">
              <Chip.Label className="text-caption">{chip.label}</Chip.Label>
            </Chip>
            {st === "safety" && <ShieldIcon className="size-8 text-muted" />}
            {busy && <Spinner size="md" color="accent" />}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-heading text-balance">{title}</p>
            <p className="text-caption text-muted tabular-nums">{detail}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-4">{actions}</div>}
        </div>
      </Card>
      <div className="absolute right-12 bottom-12 flex items-center gap-4">
        <SupportControl support={s.support} onCall={s.callSupport} />
        <Hold911Button className="rounded-full shadow-float" />
      </div>
    </>
  );
}
