import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { getRoomColorClasses } from "@/lib/constants";
import type { DashboardRoom, RoomCoverage } from "@/lib/data/home-dashboard";

function coverageLabel(c: RoomCoverage): { tone: PillTone; text: string; detail: string | null } {
  switch (c.kind) {
    case "met":
      return { tone: "ready", text: "Enough staff", detail: `${c.rostered} rostered · ${c.required} needed at busiest time` };
    case "short": {
      const gap = c.required - c.rostered;
      return {
        tone: "action",
        text: `${gap} more needed`,
        detail: `${c.rostered} rostered · ${c.required} needed at busiest time`,
      };
    }
    case "check_ages":
      return {
        tone: "attention",
        text: "Check ages",
        detail: `${c.missingAges} child${c.missingAges === 1 ? "" : "ren"} without a date of birth — needed for ratios`,
      };
    case "no_roster":
      return { tone: "neutral", text: "Roster not entered", detail: "Can't check coverage without a roster" };
    case "not_operating":
      return { tone: "neutral", text: "No bookings", detail: null };
    case "closed":
    default:
      return { tone: "neutral", text: "Closed", detail: null };
  }
}

function roomLink(room: DashboardRoom, weekStart: string): { label: string; href: string } {
  if (room.coverage.kind === "no_roster") return { label: "Enter roster", href: `/roster?week=${weekStart}` };
  if (room.coverage.kind === "check_ages") return { label: "View ratios", href: "/roster/ratios" };
  return { label: "View coverage", href: `/roster/coverage?week=${weekStart}` };
}

function staffText(room: DashboardRoom, rosterEntered: boolean): string {
  if (!rosterEntered) return "Not entered";
  if (room.staffNames.length === 0) return "None";
  return String(room.staffNames.length);
}

/** Rooms today: bookings, staff on the roster and whether that's enough
 * people for the busiest point of the day (the same ratio maths as the
 * roster's coverage page). A table on wider screens, stacked cards on phones. */
export function RoomOverview({
  rooms,
  weekStart,
  rosterEntered,
  closedReason,
}: {
  rooms: DashboardRoom[];
  weekStart: string;
  rosterEntered: boolean;
  closedReason: string | null;
}) {
  return (
    <Panel
      id="rooms-today"
      title="Rooms today"
      description="Coverage compares staff on the roster with the ratio needed at each room's busiest time."
      action={{ label: "Open roster", href: `/roster?week=${weekStart}` }}
    >
      {closedReason ? (
        <EmptyState title={closedReason} description="Room coverage shows on days the centre is open." />
      ) : rooms.length === 0 ? (
        <EmptyState title="No rooms set up" description="Rooms come from the roster settings." />
      ) : (
        <>
          {/* Phones: one card per room */}
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10 sm:hidden">
            {rooms.map((room) => {
              const cov = coverageLabel(room.coverage);
              const link = roomLink(room, weekStart);
              return (
                <li key={room.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-medium text-charcoal">
                      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${getRoomColorClasses(room.color).chip}`} />
                      {room.name}
                    </p>
                    <StatusPill tone={cov.tone}>{cov.text}</StatusPill>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-charcoal/70">Children booked</dt>
                      <dd className="font-medium text-charcoal">{room.childrenExpected}</dd>
                    </div>
                    <div>
                      <dt className="text-charcoal/70">Staff rostered</dt>
                      <dd className="font-medium text-charcoal">{staffText(room, rosterEntered)}</dd>
                    </div>
                  </dl>
                  {cov.detail && <p className="mt-2 text-sm text-charcoal/70">{cov.detail}</p>}
                  <Link
                    href={link.href}
                    className="mt-2 inline-block rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                  >
                    {link.label}
                    <span className="sr-only"> for {room.name}</span> →
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Tablet and up: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-charcoal/10 bg-canvas text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Room</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Children booked</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Staff rostered</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Coverage</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    <span className="sr-only">Link</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {rooms.map((room) => {
                  const cov = coverageLabel(room.coverage);
                  const link = roomLink(room, weekStart);
                  return (
                    <tr key={room.id} className="align-middle">
                      <th scope="row" className="px-5 py-3.5 font-medium text-charcoal">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${getRoomColorClasses(room.color).chip}`} />
                          {room.name}
                        </span>
                      </th>
                      <td className="px-3 py-3.5 text-right tabular-nums text-charcoal">{room.childrenExpected}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-charcoal">{staffText(room, rosterEntered)}</td>
                      <td className="px-3 py-3.5">
                        <StatusPill tone={cov.tone}>{cov.text}</StatusPill>
                        {cov.detail && <p className="mt-1 text-xs text-charcoal/70">{cov.detail}</p>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <Link
                          href={link.href}
                          className="rounded font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                        >
                          {link.label}
                          <span className="sr-only"> for {room.name}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
