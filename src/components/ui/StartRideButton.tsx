'use client';

// The one big action on the boarding screen: a full-width danger-red button with a dot field
// that fades out toward the label, so the texture never sits behind the text.
// Red fill follows the Figma StartRideButton frame (node 365:59).
import { Button, type ButtonProps } from '@heroui/react';

export function StartRideButton({
  className,
  children = 'Start ride',
  ...props
}: ButtonProps) {
  return (
    <Button
      variant="primary"
      size="lg"
      fullWidth
      className={[
        'dot-field relative isolate h-44 rounded-3xl text-title shadow-hero',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Button>
  );
}
