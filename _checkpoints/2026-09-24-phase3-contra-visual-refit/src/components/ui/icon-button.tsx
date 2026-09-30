import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
} as const;

/**
 * Shared icon-only button primitive (see DESIGN_SYSTEM.md — Components —
 * "Icon buttons"). Purely presentational: it renders a button and takes the
 * same onClick/type/aria props any <button> would, so it can drop in
 * anywhere an ad hoc icon button exists today without changing behaviour.
 */
export function IconButton({
  children,
  size = "md",
  className,
  label,
  ...props
}: {
  children: React.ReactNode;
  size?: keyof typeof SIZE_CLASS;
  label: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-charcoal/60 transition-colors hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
        SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
