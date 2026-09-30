import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-base",
} as const;

/**
 * Shared initials-based avatar primitive (see DESIGN_SYSTEM.md — Components
 * — "Avatars"). This is a small display chip for showing a person compactly
 * in lists/cards/the sidebar footer — separate from, and not a replacement
 * for, the existing staff/child photo-upload components, which manage real
 * uploaded photos and their own storage logic.
 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-burgundy-50 font-semibold text-burgundy-600",
        SIZE_CLASS[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Overlapping stack of up to `max` avatars with a "+N" overflow chip (see
 * DESIGN_SYSTEM.md — Components — "Avatar groups").
 */
export function AvatarGroup({
  names,
  max = 4,
  size = "sm",
}: {
  names: (string | null | undefined)[];
  max?: number;
  size?: keyof typeof SIZE_CLASS;
}) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((name, i) => (
        <Avatar key={i} name={name} size={size} className="ring-2 ring-white" />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-charcoal/10 font-semibold text-charcoal/60 ring-2 ring-white",
            SIZE_CLASS[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
