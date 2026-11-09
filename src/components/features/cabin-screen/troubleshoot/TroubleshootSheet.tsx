"use client";

// The Troubleshoot sheet's content. Placeholder actions for now; place it inside a <BottomSheet>
// next to the button that opens it.
import { Button, type ButtonProps } from "@heroui/react";
import { BottomSheet, type BottomSheetContentProps } from "@/components/ui/BottomSheet";

// A large tile, sized for a moving car rather than a toolbar.
function ActionTile({ className, ...props }: ButtonProps) {
  return (
    <Button
      size="lg"
      className={["h-40 w-full px-8 text-body text-balance whitespace-normal", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export type TroubleshootSheetProps = Omit<BottomSheetContentProps, "children"> & {
  onReport?: () => void;
  onCallSupport?: () => void;
  onCallEmergency?: () => void;
};

export function TroubleshootSheet({
  onReport,
  onCallSupport,
  onCallEmergency,
  ...props
}: TroubleshootSheetProps) {
  return (
    <BottomSheet.Content {...props}>
      <BottomSheet.Header>
        <BottomSheet.Heading>Troubleshoot</BottomSheet.Heading>
        <BottomSheet.Description>Get help with your ride</BottomSheet.Description>
      </BottomSheet.Header>
      <BottomSheet.Body>
        <div className="grid grid-cols-3 gap-8">
          <ActionTile variant="outline" onPress={onReport}>
            Tell us what’s wrong
          </ActionTile>
          <ActionTile onPress={onCallSupport}>Call Support</ActionTile>
          <ActionTile variant="danger-soft" onPress={onCallEmergency}>
            Call 911
          </ActionTile>
        </div>
      </BottomSheet.Body>
    </BottomSheet.Content>
  );
}
