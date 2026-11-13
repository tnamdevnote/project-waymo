"use client";

// PROTOTYPE (stall) — Board 3, Track: the board docked along the bottom, full width.
// Axis: orientation. Steps run left to right like the trip itself, and the map keeps the top
// half, so the rider sees the road and the explanation together.
import { Chip } from "@heroui/react";
import { heroTime, phases, StageActions, stageCopy } from "./boardShared";
import { CheckIcon, Hold911Button, StepList, SupportControl } from "./shared";
import { isActive, type StallState } from "./useStall";

export function TrackBoard({ s }: { s: StallState }) {
  if (!isActive(s.stage)) return null;
  const moving = s.stage === "resolved";
  const ph = phases(s);
  const at = ph.findIndex((p) => p.state === "current");
  const hero = heroTime(s);
  const copy = stageCopy(s);

  return (
    <section
      aria-live="polite"
      className="proto-track absolute inset-x-0 bottom-0 flex max-h-full flex-col gap-10 overflow-y-auto rounded-t-3xl bg-background p-12 shadow-float"
    >
      {/* The track: a dot per step on one line; the line fills up to the current step. */}
      <div className="relative">
        <span aria-hidden className="absolute top-5 right-1/10 left-1/10 h-1 bg-border" />
        <span
          aria-hidden
          className={`proto-track-fill absolute top-5 left-1/10 h-1 w-4/5 ${moving ? "bg-success" : "bg-accent"}`}
          style={{ transform: `scaleX(${at / (ph.length - 1)})` }}
        />
        <ol className="relative grid grid-cols-5">
          {ph.map((p) => (
            <li
              key={p.label}
              aria-current={p.state === "current" ? "step" : undefined}
              className="relative flex flex-col items-center gap-3 text-center"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-full ${
                  p.state === "upcoming"
                    ? "bg-surface-tertiary"
                    : moving
                      ? "bg-success text-success-foreground"
                      : "bg-accent text-accent-foreground"
                }`}
              >
                {p.state === "done" ? (
                  <CheckIcon className="size-6" />
                ) : p.state === "current" ? (
                  <span className="size-3 rounded-full bg-accent-foreground" />
                ) : null}
              </span>
              <span
                className={`text-caption ${p.state === "upcoming" ? "text-muted" : "text-foreground"}`}
              >
                {p.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-12">
        <div key={s.stage + String(s.exitReady)} className="proto-row flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <Chip size="lg" color={moving ? "success" : "warning"} variant="primary">
                <Chip.Label className="text-caption">{moving ? "Moving" : "Paused"}</Chip.Label>
              </Chip>
              {s.reported && <span className="text-caption text-muted">You reported it</span>}
            </div>
            <h1 className="text-heading text-balance">{copy.title}</h1>
            {copy.body && <p className="max-w-prose text-body text-muted">{copy.body}</p>}
          </div>
          {s.stage === "working" && <StepList step={s.step} />}
          <StageActions s={s} />
        </div>

        <aside className="flex w-80 shrink-0 flex-col items-end justify-between gap-8">
          {hero && (
            <div className="flex flex-col items-end gap-1 text-right">
              <p className="text-title tabular-nums">{hero.value}</p>
              <p className="text-caption text-muted tabular-nums">{hero.caption}</p>
            </div>
          )}
          <div className="mt-auto flex flex-col items-end gap-4">
            <SupportControl support={s.support} onCall={s.callSupport} />
            <Hold911Button />
          </div>
        </aside>
      </div>
    </section>
  );
}
