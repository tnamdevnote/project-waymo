"use client";

// The Troubleshoot sheet's content. Placeholder actions for now; place it inside a <BottomSheet>
// next to the button that opens it.
import { Button, type ButtonProps } from "@heroui/react";
import { BottomSheet, type BottomSheetContentProps } from "@/components/ui/BottomSheet";

// The tile's outline and label color. Neutral reports, accent reaches Support, danger is the
// emergency line. Outlined rather than filled so none of the three reads as the screen's main action.
const tone = {
  default: "",
  accent: "border-accent text-accent",
  danger: "border-danger text-danger",
} as const;

type ActionTileProps = Omit<ButtonProps, "variant"> & { tone?: keyof typeof tone };

// A large outlined tile, sized for a moving car rather than a toolbar.
function ActionTile({ tone: t = "default", className, ...props }: ActionTileProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      className={[
        "h-40 w-full border-2 px-6 text-caption font-normal text-balance whitespace-normal",
        tone[t],
        className,
      ]
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
        <BottomSheet.Description>Tell us what’s happening</BottomSheet.Description>
      </BottomSheet.Header>
      <BottomSheet.Body>
        <div className="grid grid-cols-3 gap-4">
          <ActionTile onPress={onReport}>Report ride issue</ActionTile>
          <ActionTile tone="accent" onPress={onCallSupport}>
            Call support
          </ActionTile>
          <ActionTile tone="danger" onPress={onCallEmergency}>
            Hold for 911
          </ActionTile>
        </div>
      </BottomSheet.Body>
    </BottomSheet.Content>
  );
}
