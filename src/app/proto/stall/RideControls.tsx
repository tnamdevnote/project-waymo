"use client";

// PROTOTYPE (stall): the normal ride controls, with the rider's own way in. Troubleshoot →
// "Waymo is stalled" skips the car's wait and jumps straight to status. Shared by every variant;
// once the stall UI is up, the variant owns the screen and this bar steps aside.
import { BottomSheet, MenuBar, useCabinScreen } from "@/components/features/cabin-screen";
import { Button } from "@heroui/react";
import { useState } from "react";
import { Hold911Button, SupportControl } from "./shared";
import type { StallState } from "./useStall";

const svg = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-8",
} as const;

function MusicIcon() {
  return (
    <svg {...svg}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function Tile(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      variant="outline"
      {...props}
      className="h-32 w-full px-8 text-body text-balance whitespace-normal"
    />
  );
}

export function RideControls({ s }: { s: StallState }) {
  const { state, actions } = useCabinScreen();
  const [open, setOpen] = useState(false);
  const stopped = state.motion === "stopped";

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="absolute inset-x-0 bottom-12 flex flex-col items-end gap-4 px-12">
      <SupportControl support={s.support} onCall={s.callSupport} />
      <MenuBar aria-label="Ride controls">
        <MenuBar.Toggle>
          {({ isSelected }) => (
            <>
              <MusicIcon />
              {isSelected ? "Pause music" : "Play music"}
            </>
          )}
        </MenuBar.Toggle>
        <MenuBar.Separator />
        <MenuBar.Item aria-label="Climate, 70 degrees" className="tabular-nums">
          70°
        </MenuBar.Item>
        <MenuBar.Separator />
        {/* During an unexplained stop the car is holding itself: "Resume ride" would promise a
            control the rider doesn't have, so Pull over stays put and disabled. */}
        <MenuBar.Item
          isDisabled={s.stage === "stopping"}
          onPress={state.driving ? actions.pullOver : actions.resume}
        >
          {state.driving || s.stage === "stopping" ? "Pull over" : "Resume ride"}
        </MenuBar.Item>
        <MenuBar.Separator />
        <BottomSheet isOpen={open} onOpenChange={setOpen}>
          <MenuBar.Item>
            <QuestionIcon />
            Troubleshoot
          </MenuBar.Item>
          <BottomSheet.Content>
            <BottomSheet.Header>
              <BottomSheet.Heading>Troubleshoot</BottomSheet.Heading>
              <BottomSheet.Description>What’s happening?</BottomSheet.Description>
            </BottomSheet.Header>
            <BottomSheet.Body>
              <div className="grid grid-cols-3 gap-8">
                {/* Only offered while the car is actually stopped: a moving car isn't stalled. */}
                <Tile isDisabled={!stopped} onPress={() => choose(s.reportStall)}>
                  Waymo is stalled
                </Tile>
                <Tile onPress={() => choose(s.callSupport)}>Wrong route</Tile>
                <Tile onPress={() => choose(s.callSupport)}>Something else</Tile>
              </div>
            </BottomSheet.Body>
            <div className="flex items-center justify-between gap-8 border-t border-separator pt-8">
              <SupportControl support={s.support} onCall={s.callSupport} className="shadow-none" />
              <Hold911Button />
            </div>
          </BottomSheet.Content>
        </BottomSheet>
      </MenuBar>
    </div>
  );
}
