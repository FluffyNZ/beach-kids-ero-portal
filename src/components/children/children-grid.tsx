import Link from "next/link";
import { ChildAvatar } from "./child-avatar";
import { StatusBadge } from "@/components/status-badge";
import { getRoomColorClasses, formatChildAge } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChildMember, RosterRoom } from "@/lib/types";

type RoomGroup = { key: string; name: string; color: string | null; children: ChildMember[] };

/** Card-per-child, grouped by room, six across on a wide screen — a
 * quicker visual scan than a flat list, and closer to what you'd want
 * pulled up on a tablet in a room. */
export function ChildrenGrid({ children, rooms }: { children: ChildMember[]; rooms: RosterRoom[] }) {
  if (children.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-charcoal/50">
        No children found. Try a different search, or add a child.
      </div>
    );
  }

  const groups: RoomGroup[] = rooms.map((r) => ({ key: r.id, name: r.name, color: r.color, children: [] }));
  const unassigned: RoomGroup = { key: "unassigned", name: "No room set", color: null, children: [] };
  const groupByRoomId = new Map(groups.map((g) => [g.key, g]));

  for (const c of children) {
    const group = (c.room_id && groupByRoomId.get(c.room_id)) || unassigned;
    group.children.push(c);
  }

  const populated = [...groups, unassigned].filter((g) => g.children.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {populated.map((group) => {
        const colors = getRoomColorClasses(group.color);
        return (
          <section key={group.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", colors.chip)} />
              <h2 className="font-display text-sm font-semibold text-charcoal">{group.name}</h2>
              <span className="text-xs text-charcoal/40">
                {group.children.length} {group.children.length === 1 ? "child" : "children"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {group.children.map((c) => (
                <Link
                  key={c.id}
                  href={`/children/${c.id}`}
                  className={cn(
                    "card flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-cream/60",
                    c.status === "left" && "opacity-50"
                  )}
                >
                  <ChildAvatar fullName={c.full_name} roomColor={c.room_color} photoUrl={c.photo_url} size="lg" />
                  <div className="min-w-0 w-full">
                    <p className="truncate text-sm font-medium text-charcoal">{c.full_name}</p>
                    <p className="mt-0.5 truncate text-xs text-charcoal/50">
                      {formatChildAge(c.age_years, c.age_months)}
                    </p>
                  </div>
                  {c.status === "active" && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {!c.bill_payer_id && <StatusBadge tone="attention">No bill payer</StatusBadge>}
                      {c.sibling_discount_eligible && <StatusBadge tone="neutral">Siblings</StatusBadge>}
                      {c.twenty_hours_ece && <StatusBadge tone="ready">20 Hrs</StatusBadge>}
                      {c.has_winz_subsidy && <StatusBadge tone="neutral">WINZ</StatusBadge>}
                      {c.special_weekly_override !== null && <StatusBadge tone="attention">Special</StatusBadge>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
