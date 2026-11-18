import { initials } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";

const DIMENSION_CLASSES = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-11 w-11",
  lg: "h-16 w-16",
  // Directory cards use "card" so every photo is the same size.
  card: "h-14 w-14",
  list: "h-9 w-9",
  xl: "h-20 w-20",
};
const TEXT_CLASSES = {
  xs: "text-[0.5rem]",
  sm: "text-[0.6rem]",
  md: "text-sm",
  lg: "text-lg",
  card: "text-base",
  list: "text-xs",
  xl: "text-2xl",
};

/** A circular avatar for a child: their uploaded photo if there is one,
 * otherwise their initials on a pale room-coloured circle — there's no
 * stock or placeholder photo used in place of a real one. Initials are
 * charcoal (not the room colour) so they stay readable on every room tint.
 * Pass `decorative` when the child's name is already shown right beside it,
 * so screen readers don't hear the name twice. */
export function ChildAvatar({
  fullName,
  roomColor,
  photoUrl,
  size = "md",
  decorative = false,
}: {
  fullName: string;
  roomColor?: string | null;
  photoUrl?: string | null;
  size?: keyof typeof DIMENSION_CLASSES;
  decorative?: boolean;
}) {
  const dim = DIMENSION_CLASSES[size];

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static/optimizable asset
    return <img src={photoUrl} alt={decorative ? "" : fullName} className={`shrink-0 rounded-full bg-charcoal/5 object-cover ${dim}`} />;
  }

  const colors = getRoomColorClasses(roomColor);
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : fullName}
      aria-hidden={decorative ? true : undefined}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-charcoal ${dim} ${TEXT_CLASSES[size]} ${colors.bg}`}
    >
      {initials(fullName)}
    </span>
  );
}
