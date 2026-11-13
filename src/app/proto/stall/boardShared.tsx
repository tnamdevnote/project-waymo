"use client";

// PROTOTYPE (stall): what the Countdown and Track boards both say, so they differ only in layout.
import { Button } from "@heroui/react";
import { ANSWERS, arrivalAt, CAUSE, carAsks, type StallState } from "./useStall";

export type PhaseState = "done" | "current" | "upcoming";
export type Phase = { label: string; state: PhaseState };

/** The stall as five phases, for a progress track. */
export function phases(s: StallState): Phase[] {
  const st = s.stage;
  const order = ["safety", "middle", "working", "end"] as const;
  const at = st === "safety" ? 0 : st === "cause" || st === "ask" ? 1 : st === "working" ? 2 : 3; // resolved, options, newcar, endhere
  const state = (i: number): PhaseState => (i < at ? "done" : i === at ? "current" : "upcoming");
  const endLabel =
    st === "options"
      ? "Your choice"
      : st === "newcar"
        ? "New car"
        : st === "endhere"
          ? "Getting out"
          : "Moving again";
  const labels: Record<(typeof order)[number], string> = {
    safety: "You’re safe",
    middle: carAsks(s.scenario) ? "What you see" : "Cause found",
    working: "Specialist",
    end: endLabel,
  };
  return [
    { label: "Stopped", state: "done" },
    ...order.map((k, i) => ({ label: labels[k], state: state(i) })),
  ];
}

/** The one thing to say right now. */
export function stageCopy(s: StallState): { title: string; body?: string } {
  switch (s.stage) {
    case "safety":
      return {
        title: s.reported ? "Thanks for telling us. You’re safe." : "We’ve paused. You’re safe.",
        body: "Hazards are on and the doors are locked. Please stay inside.",
      };
    case "cause":
      return { title: CAUSE.title, body: CAUSE.detail };
    case "ask":
      return {
        title: "Can you see what’s blocking us?",
        body: "Your answer goes to the specialist. It won’t move the car.",
      };
    case "working":
      return {
        title: "A specialist is helping the car",
        body: s.answer
          ? `We passed on “${s.answer}”.`
          : carAsks(s.scenario)
            ? undefined
            : CAUSE.title,
      };
    case "resolved":
      return { title: "We’re moving again", body: "Thanks for waiting." };
    case "options":
      return {
        title: "This is taking longer than usual",
        body: "Keep waiting, get another car, or end the ride here. Support is joining.",
      };
    case "newcar":
      return {
        title: "Another car is on the way",
        body: "Stay inside until it pulls up behind us, then exit on the right, to the sidewalk.",
      };
    case "endhere":
      return s.exitReady
        ? {
            title: "Exit on the right, to the sidewalk",
            body: "The right rear door is unlocked. Your fare has been refunded.",
          }
        : {
            title: "Checking it’s safe to get out…",
            body: "Doors stay locked until traffic and the curb are clear.",
          };
    default:
      return { title: "" };
  }
}

/** The headline number and what it means. `null` when there's no time to show. */
export function heroTime(s: StallState): { value: string; caption: string } | null {
  const min = Math.ceil(s.eta / 60);
  switch (s.stage) {
    case "resolved":
      return { value: arrivalAt(s.eta), caption: "New arrival time" };
    case "newcar":
      return {
        value: s.eta < 60 ? "<1 min" : `${min} min`,
        caption: "Until the new car arrives",
      };
    case "safety": // nothing diagnosed yet: no number to promise
    case "endhere":
    case "options":
      return null;
    default:
      return {
        value: s.eta < 60 ? "<1 min" : `${min} min`,
        caption: `Until we’re moving · arriving ${arrivalAt(s.eta)}`,
      };
  }
}

function Choice(props: React.ComponentProps<typeof Button>) {
  return <Button size="lg" {...props} className="h-20 px-8 text-caption" />;
}

/** The rider's choices at this stage, if any. */
export function StageActions({ s }: { s: StallState }) {
  if (s.stage === "ask") {
    return (
      <div className="flex flex-wrap gap-4">
        {ANSWERS.map((a) => (
          <Choice key={a} variant="outline" onPress={() => s.answerAsk(a)}>
            {a}
          </Choice>
        ))}
      </div>
    );
  }
  if (s.stage === "options") {
    return (
      <div className="flex flex-wrap gap-4">
        <Choice variant="outline" onPress={s.keepWaiting}>
          Keep waiting
        </Choice>
        <Choice variant="primary" onPress={s.sendNewCar}>
          Send another car
        </Choice>
        <Choice variant="danger-soft" onPress={s.endHere}>
          End ride here
        </Choice>
      </div>
    );
  }
  return null;
}
