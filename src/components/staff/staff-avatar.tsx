import { initials } from "@/lib/utils";

const DIMENSION_CLASSES = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-11 w-11",
  lg: "h-16 w-16",
  list: "h-10 w-10",
  xl: "h-20 w-20",
};
const TEXT_CLASSES = {
  xs: "text-[0.5rem]",
  sm: "text-[0.6rem]",
  md: "text-sm",
  lg: "text-lg",
  list: "text-sm",
  xl: "text-2xl",
};

/** A circular avatar for a staff member: their uploaded photo if there is
 * one, otherwise their initials on a pale lilac circle — there's no stock
 * or placeholder photo used in place of a real one (same convention as
 * ChildAvatar). Pass `decorative` when the name is shown right beside it,
 * so screen readers don't hear the name twice. */
export function StaffAvatar({
  fullName,
  photoUrl,
  size = "md",
  decorative = false,
}: {
  fullName: string;
  photoUrl?: string | null;
  size?: keyof typeof DIMENSION_CLASSES;
  decorative?: boolean;
}) {
  const dim = DIMENSION_CLASSES[size];

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static/optimizable asset
    return <img src={photoUrl} alt={decorative ? "" : fullName} className={`shrink-0 rounded-full bg-charcoal/5 object-cover ${dim}`} />;
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : fullName}
      aria-hidden={decorative ? true : undefined}
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-lilac-100 font-semibold text-charcoal ${dim} ${TEXT_CLASSES[size]}`}
    >
      {initials(fullName)}
    </span>
  );
}
