"use client";

// PROTOTYPE (stall) — Board 1, Timeline (the picked Status board, unchanged): a full-height panel beside the map that keeps the
// whole story. Axis: maximum reassurance. Nothing is replaced; each step is added to a timeline,
// so a rider who looks away can catch up at a glance.
import { Button, Chip } from "@heroui/react";
import type { ReactNode } from "react";
import { CheckIcon, Hold911Button, StepList, SupportControl } from "./shared";
import {
  ANSWERS,
  arrivalAt,
  CAUSE,
  carAsks,
  etaLabel,
  isActive,
  type StallState,
} from "./useStall";

type RowState = "done" | "current";

function Row({ state, title, children }: { state: RowState; title: string; children?: ReactNode }) {
  return (
    <li className="proto-row flex gap-6">
      <span className="flex w-10 shrink-0 flex-col items-center pt-2">
        {state === "done" ? (
          <CheckIcon className="size-7 text-success" />
        ) : (
          <span className="size-4 rounded-full bg-accent" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-4">
        <p className={state === "current" ? "text-body" : "text-caption text-muted"}>{title}</p>
        {children}
      </div>
    </li>
  );
}

function Choice(props: React.ComponentProps<typeof Button>) {
  return <Button size="lg" {...props} className="h-20 px-8 text-caption" />;
}

export function BoardVariant({ s }: { s: StallState }) {
  if (!isActive(s.stage)) return null;
  const st = s.stage;
  const past = (...stages: string[]) => !stages.includes(st);
  const after = ["cause", "ask", "working", "resolved", "options", "newcar", "endhere"];

  const headline =
    st === "resolved"
      ? "We’re moving again"
      : st === "newcar"
        ? "Another car is coming"
        : st === "endhere"
          ? "Ending the ride here"
          : "We’ve paused. You’re safe.";
  const moving = st === "resolved";

  return (
    <section
      aria-live="polite"
      className="proto-board absolute inset-y-0 left-0 flex w-3/5 flex-col gap-8 overflow-y-auto bg-background p-12"
    >
      <header className="flex flex-col gap-2">
        <Chip
          size="lg"
          color={moving ? "success" : "warning"}
          variant="primary"
          className="self-start"
        >
          <Chip.Label className="text-caption">{moving ? "Moving" : "Paused"}</Chip.Label>
        </Chip>
        <h1 className="text-heading text-balance">{headline}</h1>
        {st !== "endhere" && (
          <p className="text-body text-muted tabular-nums">
            {st === "newcar"
              ? `New car ${etaLabel(s.eta).toLowerCase()}`
              : `${moving ? "" : etaLabel(s.eta) + " · "}Arriving ${arrivalAt(s.eta)}`}
          </p>
        )}
      </header>

      <ol className="flex flex-col gap-6">
        <Row state="done" title={`Car stopped at ${s.stoppedAt}`} />
        {s.reported && <Row state="done" title="You reported the stall. Thanks." />}
        <Row
          state={st === "safety" ? "current" : "done"}
          title="Hazards on, doors locked. Please stay inside."
        />
        {after.includes(st) &&
          (carAsks(s.scenario) ? (
            <Row
              state={st === "ask" ? "current" : "done"}
              title={st === "ask" ? "Can you see what’s blocking us?" : `You said “${s.answer}”`}
            >
              {st === "ask" && (
                <>
                  <p className="text-caption text-muted">
                    Your answer goes to the specialist. It won’t move the car.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {ANSWERS.map((a) => (
                      <Choice key={a} variant="outline" onPress={() => s.answerAsk(a)}>
                        {a}
                      </Choice>
                    ))}
                  </div>
                </>
              )}
            </Row>
          ) : (
            <Row state={st === "cause" ? "current" : "done"} title={CAUSE.title}>
              {st === "cause" && <p className="max-w-prose text-body text-muted">{CAUSE.detail}</p>}
            </Row>
          ))}
        {past("safety", "cause", "ask") && (
          <Row
            state={st === "working" ? "current" : "done"}
            title={st === "working" ? "A specialist is helping the car" : "Specialist helped"}
          >
            {st === "working" && <StepList step={s.step} />}
          </Row>
        )}
        {st === "resolved" && <Row state="current" title="Back on the route" />}
        {(st === "options" || st === "newcar" || st === "endhere") && (
          <Row
            state={st === "options" ? "current" : "done"}
            title={
              st === "options"
                ? "This is taking longer than usual"
                : st === "newcar"
                  ? "You chose another car"
                  : "You chose to end the ride"
            }
          >
            {st === "options" && (
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
            )}
          </Row>
        )}
        {st === "newcar" && (
          <Row state="current" title="Stay inside until it pulls up behind us">
            <p className="text-body text-muted">Then exit on the right, to the sidewalk.</p>
          </Row>
        )}
        {st === "endhere" && (
          <Row
            state="current"
            title={
              s.exitReady ? "Exit on the right, to the sidewalk" : "Checking it’s safe to get out…"
            }
          >
            {s.exitReady && (
              <p className="text-body text-muted">
                The right rear door is unlocked. Your fare has been refunded.
              </p>
            )}
          </Row>
        )}
      </ol>

      <footer className="sticky bottom-0 mt-auto flex items-center gap-8 bg-background pt-4">
        <SupportControl support={s.support} onCall={s.callSupport} />
        <Hold911Button />
      </footer>
    </section>
  );
}
