import { initials } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";

const DIMENSION_CLASSES = { md: "h-11 w-11", lg: "h-16 w-16" };
const TEXT_CLASSES = { md: "text-sm", lg: "text-lg" };

/** A circular avatar for a child: their uploaded photo if there is one,
 * otherwise a room-coloured initials circle — there's no stock or
 * placeholder photo used in place of a real one. */
export function ChildAvatar({
  fullName,
  roomColor,
  photoUrl,
  size = "md",
}: {
  fullName: string;
  roomColor?: string | null;
  photoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const dim = DIMENSION_CLASSES[size];

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static/optimizable asset
    return <img src={photoUrl} alt={fullName} className={`shrink-0 rounded-full object-cover ${dim}`} />;
  }

  const colors = getRoomColorClasses(roomColor);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${dim} ${TEXT_CLASSES[size]} ${colors.bg} ${colors.text}`}
    >
      {initials(fullName)}
    </span>
  );
}
