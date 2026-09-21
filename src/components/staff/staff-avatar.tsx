import { initials } from "@/lib/utils";

const DIMENSION_CLASSES = { xs: "h-4 w-4", sm: "h-5 w-5", md: "h-11 w-11", lg: "h-16 w-16" };
const TEXT_CLASSES = { xs: "text-[0.5rem]", sm: "text-[0.6rem]", md: "text-sm", lg: "text-lg" };

/** A circular avatar for a staff member: their uploaded photo if there is
 * one, otherwise a brand-coloured initials circle — there's no stock or
 * placeholder photo used in place of a real one (same convention as
 * ChildAvatar for children). */
export function StaffAvatar({
  fullName,
  photoUrl,
  size = "md",
}: {
  fullName: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const dim = DIMENSION_CLASSES[size];

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static/optimizable asset
    return <img src={photoUrl} alt={fullName} className={`shrink-0 rounded-full object-cover ${dim}`} />;
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-burgundy-100 font-semibold text-burgundy-600 ${dim} ${TEXT_CLASSES[size]}`}
    >
      {initials(fullName)}
    </span>
  );
}
