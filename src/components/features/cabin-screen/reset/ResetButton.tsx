"use client";

// CabinScreen.Reset: an icon-only demo control in the top-right corner that starts the prototype
// over. Hidden under the Start ride takeover, where there's nothing to reset yet.
import { Button } from "@heroui/react";
import { useCabinScreen } from "../CabinScreenRoot";

function ResetIcon() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function Reset() {
  const { actions } = useCabinScreen();
  return (
    <Button
      variant="tertiary"
      size="lg"
      isIconOnly
      aria-label="Reset"
      onPress={actions.reset}
      className="absolute top-12 right-12 size-20 rounded-full bg-surface text-foreground shadow-float"
    >
      <ResetIcon />
    </Button>
  );
}
