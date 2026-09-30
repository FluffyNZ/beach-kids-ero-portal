"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  ChevronDownIcon,
  ChildrenIcon,
  StaffIcon,
  ActionsIcon,
  CalendarIcon,
  MessagesIcon,
  AlertIcon,
  BookOpenIcon,
  UploadIcon,
} from "@/components/icons";

type QuickCreateItem =
  | {
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      href: string;
      status?: undefined;
    }
  | {
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      status: "soon";
      href?: undefined;
    };

// Every item here opens the existing page where that thing is actually
// created today (a modal on that page, or — for Incident — a real "new"
// route) rather than trying to recreate that creation flow inline in the
// header. "Message" has no destination at all yet — there's no messaging
// feature anywhere in the app — so it's shown disabled instead of linking
// somewhere fake. See DESIGN_SYSTEM.md / the Home dashboard build notes.
const ITEMS: QuickCreateItem[] = [
  { label: "Child", description: "Add a new enrolment", icon: ChildrenIcon, href: "/children" },
  { label: "Staff record", description: "Add a new team member", icon: StaffIcon, href: "/staff" },
  { label: "Task", description: "Raise a new action", icon: ActionsIcon, href: "/actions" },
  { label: "Event", description: "Book staff leave on the calendar", icon: CalendarIcon, href: "/calendar" },
  {
    label: "Incident",
    description: "Log an accident, incident or illness record",
    icon: AlertIcon,
    href: "/records/accidents-illness/new",
  },
  { label: "Learning story", description: "Start a new story", icon: BookOpenIcon, href: "/learning/stories" },
  { label: "Document", description: "Upload to the Evidence Library", icon: UploadIcon, href: "/evidence" },
  { label: "Message", description: "Messaging isn't built yet", icon: MessagesIcon, status: "soon" },
];

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-primary">
        <PlusIcon className="h-4 w-4" />
        Create
        <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-charcoal/10 bg-white p-1.5 shadow-cardHover">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              if (item.status === "soon") {
                return (
                  <div
                    key={item.label}
                    className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2 opacity-40"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal">{item.label}</p>
                      <p className="text-xs text-charcoal/50">{item.description}</p>
                    </div>
                    <span className="badge shrink-0 bg-charcoal/5 px-2 py-0.5 text-[10px] text-charcoal/40">
                      Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-charcoal/5"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">{item.label}</p>
                    <p className="text-xs text-charcoal/50">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
