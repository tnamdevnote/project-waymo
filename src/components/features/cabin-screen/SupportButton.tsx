"use client";

// Rider support. Shown on every cabin screen, so it lives next to the Root, not in a screen folder.
import { Button, type ButtonProps } from "@heroui/react";

function HeadsetIcon() {
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
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M19 20a4 4 0 0 1-4 3h-2" />
    </svg>
  );
}

export function SupportButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="tertiary"
      size="lg"
      className={[
        "h-20 gap-3 rounded-full bg-surface px-8 text-caption text-foreground shadow-float",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <HeadsetIcon />
      Support
    </Button>
  );
}
