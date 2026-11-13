"use client";

// PROTOTYPE (stall): one scripted stall shared by every variant, so the variants differ only in
// how they present it. Real timings are in the comments; the prototype runs them compressed.
import { useCabinScreen } from "@/components/features/cabin-screen";
import { useCallback, useEffect, useState } from "react";

export type Scenario = "known" | "unsure" | "stuck" | "rider";

export const SCENARIOS: { key: Scenario; name: string }[] = [
  { key: "known", name: "Cause known" },
  { key: "unsure", name: "Car unsure" },
  { key: "stuck", name: "Not resolved" },
  // The car thinks this is a normal stop and never flags it; only Troubleshoot starts the flow.
  { key: "rider", name: "Rider notices" },
];

export type Stage =
  | "driving" // ride under way, no UI
  | "stopping" // car braking / stopped, still under the "is this normal?" threshold
  | "safety" // car speaks first
  | "cause" // car knows why
  | "ask" // car doesn't know: one question for the rider
  | "working" // remote assistance, live progress
  | "resolved" // moving again, UI closes itself
  | "options" // over ~5 min: a way out
  | "newcar" // replacement car dispatched
  | "endhere" // ending the ride here, safe-exit check
  | "done"; // stall over, back to normal ride

export const STEPS = ["Stop reported", "Specialist reviewing the scene", "Planning a safe path"];

export const ANSWERS = ["Something’s blocking", "Nothing I can see", "I can’t tell"] as const;

export const CAUSE = {
  title: "A truck is blocking our lane",
  detail:
    "A delivery truck is double-parked on East Cesar Chavez Street with its hazards on. The car is planning a way around it.",
};

// Compressed timings (ms). Real values in comments.
const T = {
  cruise: 3000, // ride before the stall
  detect: 3000, // real: ~10 s stopped before the car says anything
  safety: 4000, // safety message holds before the next step
  cause: 4500,
  step: 3500, // each remote-assist step
  resolvedHold: 5000, // "moving again" before the UI closes itself
  exitCheck: 2500, // curb-side check before unlocking
  supportConnect: 3000,
};

const ARRIVAL_BASE = { h: 3, m: 30 }; // planned arrival 3:30 PM

export function arrivalAt(delaySec: number) {
  const total = ARRIVAL_BASE.h * 60 + ARRIVAL_BASE.m + Math.ceil(delaySec / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")} PM`;
}

export function etaLabel(sec: number) {
  if (sec < 60) return "Under a minute";
  return `About ${Math.ceil(sec / 60)} min`;
}

export type Support = "idle" | "connecting" | "connected";

export function useStall(scenario: Scenario) {
  const { state, actions } = useCabinScreen();
  const [stage, setStage] = useState<Stage>("driving");
  const [step, setStep] = useState(0);
  const [eta, setEta] = useState(120); // seconds until moving (or until the new car arrives)
  const [answer, setAnswer] = useState<string | null>(null);
  const [exitReady, setExitReady] = useState(false);
  const [support, setSupport] = useState<Support>("idle");
  // The rider flagged the stall from Troubleshoot before the car did.
  const [reported, setReported] = useState(false);
  const stoppedAt = "3:21 PM"; // matches the 3:30 PM planned arrival

  // Car motion follows the stage.
  useEffect(() => {
    if (stage === "driving" || stage === "resolved" || stage === "done") actions.resume();
    else actions.pullOver();
  }, [stage, actions]);

  // Stage timers.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const after = (ms: number, fn: () => void) => {
      id = setTimeout(fn, ms);
    };
    switch (stage) {
      case "driving":
        after(T.cruise, () => setStage("stopping"));
        break;
      case "stopping":
        if (state.motion === "stopped" && scenario !== "rider")
          after(T.detect, () => setStage("safety"));
        break;
      case "safety":
        after(T.safety, () => setStage(carAsks(scenario) ? "ask" : "cause"));
        break;
      case "cause":
        after(T.cause, () => setStage("working"));
        break;
      case "working":
        if (step < STEPS.length) after(T.step, () => setStep((s) => s + 1));
        else
          after(T.step / 2, () => {
            if (scenario !== "stuck") return setStage("resolved");
            // Over ~5 min, support joins on its own.
            setSupport((x) => (x === "idle" ? "connecting" : x));
            setStage("options");
          });
        break;
      case "resolved":
        after(T.resolvedHold, () => setStage("done"));
        break;
      case "endhere":
        if (!exitReady) after(T.exitCheck, () => setExitReady(true));
        break;
    }
    return () => clearTimeout(id);
  }, [stage, step, scenario, state.motion, exitReady]);

  // ETA ticks 10 s per real second so the countdown is visible.
  useEffect(() => {
    if (!["cause", "ask", "working", "newcar"].includes(stage)) return;
    const id = setInterval(() => setEta((e) => Math.max(15, e - 10)), 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (support !== "connecting") return;
    const id = setTimeout(() => setSupport("connected"), T.supportConnect);
    return () => clearTimeout(id);
  }, [support]);

  const answerAsk = useCallback((a: string) => {
    setAnswer(a);
    setStage("working");
  }, []);

  const keepWaiting = useCallback(() => {
    setStep(1);
    setEta(180);
    setStage("working");
  }, []);

  const sendNewCar = useCallback(() => {
    setEta(360);
    setStage("newcar");
  }, []);

  const endHere = useCallback(() => {
    setExitReady(false);
    setStage("endhere");
  }, []);

  // Troubleshoot → "Waymo is stalled". Skips the car's wait and goes straight to status.
  // If the car has already spoken, there's nothing to ask: the status is already on screen.
  const reportStall = useCallback(() => {
    if (stage !== "driving" && stage !== "stopping") return;
    setReported(true);
    setStage("safety");
  }, [stage]);

  const callSupport = useCallback(() => setSupport((s) => (s === "idle" ? "connecting" : s)), []);

  return {
    stage,
    step,
    eta,
    answer,
    exitReady,
    support,
    stoppedAt,
    scenario,
    reported,
    reportStall,
    answerAsk,
    keepWaiting,
    sendNewCar,
    endHere,
    callSupport,
  };
}

export type StallState = ReturnType<typeof useStall>;

/** Scenarios where the car doesn't know the cause and asks the rider. */
export const carAsks = (sc: Scenario) => sc === "unsure" || sc === "rider";

/** Stages where the stall UI is on screen. */
export const isActive = (s: Stage) => s !== "driving" && s !== "stopping" && s !== "done";
