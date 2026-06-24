import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

/**
 * Badge — Metadata/status indicator with strict "Editorial Dispatch" discipline.
 *
 * Uses `font-mono text-[10px] uppercase tracking-widest` per MEP §Phase 3.
 * All colours come from the design token system (no raw hexes).
 *
 * PRD §4.2: Colour tokens — dispatch-ember, dispatch-slate, dispatch-sage,
 * dispatch-clay, dispatch-violet.
 */

const badgeVariants = cva(
  /* ── Base: editorial monospace, micro-size, tracked ── */
  "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest leading-none",
  {
    variants: {
      variant: {
        /* Ember — breaking news, AI badge, primary accent */
        ember:
          "bg-dispatch-ember/10 text-dispatch-ember border border-dispatch-ember/20 px-2 py-1",
        /* Slate — tech / neutral */
        slate:
          "bg-dispatch-slate/10 text-dispatch-slate border border-dispatch-slate/20 px-2 py-1",
        /* Sage — positive / finance */
        sage: "bg-dispatch-sage/10 text-dispatch-sage border border-dispatch-sage/20 px-2 py-1",
        /* Clay — politics / culture */
        clay: "bg-dispatch-clay/10 text-dispatch-clay border border-dispatch-clay/20 px-2 py-1",
        /* Violet — science / culture */
        violet:
          "bg-dispatch-violet/10 text-dispatch-violet border border-dispatch-violet/20 px-2 py-1",
        /* Muted — placeholder / disabled state */
        muted: "bg-paper-100 text-ink-300 border border-ink-100 px-2 py-1",
        /* Plain — no border, no background, for inline metadata */
        plain: "text-ink-300",
      },
    },
    defaultVariants: {
      variant: "ember",
    },
  },
);

/* ─── Component Interface ─────────────────────────────────────────────── */
export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /* Optional: show a small coloured dot before the text */
  dot?: boolean;
  /* Optional: override the dot colour (defaults to variant text colour) */
  dotColorClass?: string;
}

/* ─── Component ───────────────────────────────────────── */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, dot = false, dotColorClass, children, ...props },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "block h-1.5 w-1.5 rounded-full shrink-0",
              dotColorClass ??
                ((variant === "ember" && "bg-dispatch-ember") ||
                  (variant === "slate" && "bg-dispatch-slate") ||
                  (variant === "sage" && "bg-dispatch-sage") ||
                  (variant === "clay" && "bg-dispatch-clay") ||
                  (variant === "violet" && "bg-dispatch-violet") ||
                  "bg-ink-300"),
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
