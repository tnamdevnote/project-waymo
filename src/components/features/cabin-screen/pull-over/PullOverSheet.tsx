"use client";

// The Pull over confirmation (Figma node 575:14395). Place it inside a <BottomSheet> next to the
// button that opens it, and close the sheet from both callbacks. Asks before stopping, since a
// stray press in a moving car shouldn't pull the car out of traffic.
import { Button } from "@heroui/react";
import { BottomSheet, type BottomSheetContentProps } from "@/components/ui/BottomSheet";

// Two big tiles side by side, sized for a moving car rather than a toolbar.
const tile = "h-40 flex-1 rounded-3xl text-caption font-normal";

export type PullOverSheetProps = Omit<BottomSheetContentProps, "children"> & {
  /** The rider changed their mind. */
  onCancel: () => void;
  /** The rider confirmed: stop the car. */
  onConfirm: () => void;
};

export function PullOverSheet({ onCancel, onConfirm, ...props }: PullOverSheetProps) {
  return (
    <BottomSheet.Content {...props}>
      <BottomSheet.Header>
        <BottomSheet.Heading>Would you like your car to pull over?</BottomSheet.Heading>
        <BottomSheet.Description>
          It may take up to a minute or so for your car to find a spot
        </BottomSheet.Description>
      </BottomSheet.Header>
      <BottomSheet.Footer className="gap-4">
        <Button variant="outline" size="lg" className={`${tile} border-2`} onPress={onCancel}>
          Cancel
        </Button>
        {/* The sheet's one action, so primary here even though Pull over on the bar isn't. */}
        <Button size="lg" className={tile} onPress={onConfirm}>
          Pull over
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  );
}
