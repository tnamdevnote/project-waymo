"use client";

// MenuBar: a floating pill of ride controls over the map. Built on HeroUI's Toolbar, so arrow
// keys move between items. Parts are plain HeroUI components with the cabin's sizing:
//   <MenuBar aria-label="Ride controls">
//     <MenuBar.Item onPress={…}>Pull over</MenuBar.Item>
//     <MenuBar.Separator />
//     <MenuBar.Toggle onChange={…}>Play music</MenuBar.Toggle>
//   </MenuBar>
import {
  Button,
  type ButtonProps,
  Separator,
  ToggleButton,
  type ToggleButtonProps,
  Toolbar,
  type ToolbarProps,
} from "@heroui/react";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

// Shared by Item and Toggle: an 80px pill target with caption text, flat until hovered.
const itemClass = "h-20 gap-4 rounded-full px-8 text-caption";

export type MenuBarProps = Omit<ToolbarProps, "className"> & { className?: string };

function MenuBarRoot({ className, ...props }: MenuBarProps) {
  return (
    <Toolbar
      isAttached
      className={cx("gap-2 rounded-full bg-surface p-3 shadow-float", className)}
      {...props}
    />
  );
}

export type MenuBarItemProps = Omit<ButtonProps, "className"> & { className?: string };

/** An action: opens something or does something once (Troubleshoot, Pull over). */
function MenuBarItem({ className, ...props }: MenuBarItemProps) {
  return (
    <Button
      variant="ghost"
      size="lg"
      className={cx(itemClass, "text-foreground", className)}
      {...props}
    />
  );
}

export type MenuBarToggleProps = Omit<ToggleButtonProps, "className"> & { className?: string };

/** An on/off control that takes effect immediately (music). Fills with accent while on. */
function MenuBarToggle({ className, ...props }: MenuBarToggleProps) {
  return <ToggleButton variant="ghost" size="lg" className={cx(itemClass, className)} {...props} />;
}

/** Hairline between items. Decorative: the Toolbar already groups the items for screen readers. */
function MenuBarSeparator({ className }: { className?: string }) {
  return <Separator isDecorative orientation="vertical" className={className} />;
}

export const MenuBar = Object.assign(MenuBarRoot, {
  Item: MenuBarItem,
  Toggle: MenuBarToggle,
  Separator: MenuBarSeparator,
});
