import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

/**
 * Button — Anti-generic, editorially-informed action primitive.
 * Uses Radix Slot for `asChild` polymorphism and cva for variant discipline.
 *
 * PRD §4.1–4.2: "Editorial Dispatch" design system.
 * PAD §5.5: Design System Reference — dispatch-ember accent, focus ring.
 */

const buttonVariants = cva(
  /* Base styles — shared across all variants */
  "inline-flex items-center justify-center gap-2 rounded-sm font-ui font-medium text-sm transition-all duration-150 ease-out " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dispatch-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* Primary — dispatch-ember; the main CTA */
        primary:
          "bg-dispatch-ember text-paper-50 hover:bg-dispatch-ember/90 active:scale-[0.98]",
        /* Secondary — ink on paper; lower emphasis */
        secondary:
          "bg-ink-900 text-paper-50 hover:bg-ink-700 active:scale-[0.98]",
        /* Outline — bordered ghost */
        outline:
          "border border-ink-100 bg-transparent text-ink-900 hover:bg-paper-100 hover:border-ink-300 active:scale-[0.99]",
        /* Ghost — no border, minimal */
        ghost:
          "bg-transparent text-ink-600 hover:bg-paper-100 hover:text-ink-900",
        /* Destructive — for dangerous actions (Phase 19 / M15: design-system danger tokens) */
        destructive:
          "bg-dispatch-danger text-paper-50 hover:bg-dispatch-danger-dark active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

/* ─── Spinner Sub-component ─────────────────────────────────────────────── */
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-4 w-4", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ─── Component Interface ─────────────────────────────────────────────── */
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

/* ─── Component ───────────────────────────────────────────────────────── */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <ButtonSpinner />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
