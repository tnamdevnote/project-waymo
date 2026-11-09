"use client";

// BottomSheet: a panel that slides up over the map. HeroUI's Drawer, pinned to the bottom edge,
// with the cabin's padding and type sizes. The root pairs a trigger with the sheet, so it opens
// on press and gives focus back to the trigger on close:
//   <BottomSheet>
//     <MenuBar.Item>Troubleshoot</MenuBar.Item>
//     <BottomSheet.Content>
//       <BottomSheet.Header>
//         <BottomSheet.Heading>Troubleshoot</BottomSheet.Heading>
//         <BottomSheet.Description>Get help with your ride</BottomSheet.Description>
//       </BottomSheet.Header>
//       <BottomSheet.Body>…</BottomSheet.Body>
//     </BottomSheet.Content>
//   </BottomSheet>
// Open state is uncontrolled by default; pass `isOpen` + `onOpenChange` (or `defaultOpen`) on
// the root to drive it from outside.
import { Drawer, type DrawerBackdropProps, type DrawerRootProps } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

export type BottomSheetProps = DrawerRootProps;

function BottomSheetRoot(props: BottomSheetProps) {
  return <Drawer {...props} />;
}

export type BottomSheetContentProps = Pick<
  DrawerBackdropProps,
  "variant" | "isDismissable" | "isKeyboardDismissDisabled"
> & {
  children?: ReactNode;
  className?: string;
  /** Name for screen readers when the sheet has no BottomSheet.Heading. */
  "aria-label"?: string;
};

/** The sheet itself: backdrop, slide-up panel and drag handle. Tap outside, drag down or Esc closes it. */
function BottomSheetContent({
  variant,
  isDismissable,
  isKeyboardDismissDisabled,
  className,
  children,
  "aria-label": ariaLabel,
}: BottomSheetContentProps) {
  return (
    <Drawer.Backdrop
      variant={variant}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={isKeyboardDismissDisabled}
    >
      <Drawer.Content placement="bottom">
        <Drawer.Dialog aria-label={ariaLabel} className={cx("gap-12 p-12 pt-0", className)}>
          {/* HeroUI's bar is 4×36px, too faint to find from the back seat. The strip is a tall
              grab area; `*:` styles the bar HeroUI renders inside it. */}
          <Drawer.Handle className="h-16 pb-0 *:h-2 *:w-24 *:rounded-full *:bg-border" />
          {children}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function BottomSheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <Drawer.Header className={cx("gap-2", className)} {...props} />;
}

function BottomSheetHeading({ className, ...props }: ComponentProps<typeof Drawer.Heading>) {
  return <Drawer.Heading className={cx("text-heading", className)} {...props} />;
}

/** One line under the heading. */
function BottomSheetDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cx("text-caption text-muted", className)} {...props} />;
}

/** Scrolls when the content is taller than the sheet. */
function BottomSheetBody({ className, ...props }: ComponentProps<"div">) {
  return <Drawer.Body className={cx("text-body text-foreground", className)} {...props} />;
}

function BottomSheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <Drawer.Footer className={cx("gap-8", className)} {...props} />;
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Content: BottomSheetContent,
  Header: BottomSheetHeader,
  Heading: BottomSheetHeading,
  Description: BottomSheetDescription,
  Body: BottomSheetBody,
  Footer: BottomSheetFooter,
});
