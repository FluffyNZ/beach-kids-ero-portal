import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { RosterIcon, AttendanceIcon, MailIcon, ShieldCheckIcon, ChevronRightIcon } from "@/components/icons";

const ACTIONS = [
  { label: "View roster", description: "This week's shifts", href: "/roster", icon: RosterIcon },
  { label: "Open attendance", description: "Booked hours and sessions", href: "/children/hours", icon: AttendanceIcon },
  { label: "Compose email", description: "Write to families or staff", href: "/email/compose", icon: MailIcon },
  { label: "Open daily checks", description: "Room hazard checklists", href: "/records/hazards", icon: ShieldCheckIcon },
];

export function QuickActions() {
  return (
    <Panel id="quick-actions" title="Quick actions">
      <ul className="grid gap-1 px-2 pb-2 sm:grid-cols-2 lg:grid-cols-1">
        {ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lilac-100 text-charcoal">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-charcoal">{label}</span>
                <span className="block text-xs text-charcoal/70">{description}</span>
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
