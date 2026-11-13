"use client";

// PROTOTYPE (stall) — Board 2, Countdown: same panel as Timeline, organized around one number.
// Axis: hierarchy. The time until we move is the hero; history shrinks to a thin progress bar,
// and only the current step gets words.
import { Chip, Spinner } from "@heroui/react";
import { heroTime, phases, StageActions, stageCopy } from "./boardShared";
import { Hold911Button, SupportControl } from "./shared";
import { isActive, type StallState, STEPS } from "./useStall";

export function CountdownBoard({ s }: { s: StallState }) {
  if (!isActive(s.stage)) return null;
  const moving = s.stage === "resolved";
  const ph = phases(s);
  const current = ph.find((p) => p.state === "current");
  const hero = heroTime(s);
  const copy = stageCopy(s);

  return (
    <section
      aria-live="polite"
      className="proto-board absolute inset-y-0 left-0 flex w-3/5 flex-col gap-10 overflow-y-auto bg-background p-12"
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Chip size="lg" color={moving ? "success" : "warning"} variant="primary">
            <Chip.Label className="text-caption">{moving ? "Moving" : "Paused"}</Chip.Label>
          </Chip>
          <span className="text-caption text-muted">
            Step {ph.indexOf(current ?? ph[0]) + 1} of {ph.length} · {current?.label}
          </span>
        </div>
        {/* Thin segmented bar: past steps without the words. */}
        <div className="flex gap-2" aria-hidden>
          {ph.map((p) => (
            <span
              key={p.label}
              className={`proto-seg h-2 flex-1 rounded-full ${
                p.state === "upcoming" ? "bg-border" : moving ? "bg-success" : "bg-accent"
              }`}
              data-current={p.state === "current" || undefined}
            />
          ))}
        </div>
      </header>

      {hero && (
        <div className="flex flex-col gap-2">
          <p className="text-display tabular-nums">{hero.value}</p>
          <p className="text-caption text-muted tabular-nums">{hero.caption}</p>
        </div>
      )}

      {/* Keyed so each step's words fade in rather than swap under the rider's eyes. */}
      <div key={s.stage + String(s.exitReady)} className="proto-row flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading text-balance">{copy.title}</h1>
          {copy.body && <p className="max-w-prose text-body text-muted">{copy.body}</p>}
        </div>
        {s.stage === "working" && (
          <p className="flex items-center gap-4 text-body">
            <Spinner size="md" color="accent" />
            {STEPS[Math.min(s.step, STEPS.length - 1)]}
          </p>
        )}
        <StageActions s={s} />
      </div>

      <footer className="sticky bottom-0 mt-auto flex items-center gap-8 bg-background pt-4">
        <SupportControl support={s.support} onCall={s.callSupport} />
        <Hold911Button />
      </footer>
    </section>
  );
}
