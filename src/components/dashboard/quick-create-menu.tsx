"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  ChevronDownIcon,
  ChildrenIcon,
  StaffIcon,
  CalendarIcon,
  MailIcon,
  AlertIcon,
  UploadIcon,
} from "@/components/icons";

type QuickCreateItem = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

// Every item opens the existing page where that thing is actually created
// today (a form or modal on that page, or — for Incident — a real "new"
// route). Only things with a working create flow are listed: "Task" was
// removed because /actions has no way to raise a new task yet, and
// Learning story is parked (see src/lib/features.ts).
const ITEMS: QuickCreateItem[] = [
  { label: "Child", description: "Add a new enrolment", icon: ChildrenIcon, href: "/children" },
  { label: "Staff member", description: "Add a new team member", icon: StaffIcon, href: "/staff" },
  {
    label: "Incident",
    description: "Log an accident, incident or illness",
    icon: AlertIcon,
    href: "/records/accidents-illness/new",
  },
  { label: "Staff leave", description: "Book leave on the calendar", icon: CalendarIcon, href: "/calendar" },
  { label: "Document", description: "Upload to the Evidence Library", icon: UploadIcon, href: "/evidence" },
  { label: "Email", description: "Write a new email", icon: MailIcon, href: "/email/compose" },
];

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        className="btn-primary"
      >
        <PlusIcon className="h-4 w-4" />
        Create
        <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav
            id={menuId}
            aria-label="Create"
            className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-charcoal/10 bg-white p-1.5 shadow-cardHover"
          >
            <ul>
              {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/70" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-charcoal">{item.label}</span>
                        <span className="block text-xs text-charcoal/70">{item.description}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
