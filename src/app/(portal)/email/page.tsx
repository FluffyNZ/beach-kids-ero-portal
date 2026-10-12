import Link from "next/link";
import { getEmailTemplates, getUpcomingFamilyReminders, getFamilyEnquiries } from "@/lib/data/email";
import { getRosterRooms } from "@/lib/data/roster";
import { ReminderPanel } from "@/components/email/reminder-panel";
import { TemplateGrid } from "@/components/email/template-grid";
import { EnquiryPanel } from "@/components/email/enquiry-panel";
import { NewEnquiryButton } from "@/components/email/new-enquiry-button";
import { GiftIcon, HeartIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const [templates, reminders, enquiries, rooms] = await Promise.all([
    getEmailTemplates(),
    getUpcomingFamilyReminders(7),
    getFamilyEnquiries("enquiry"),
    getRosterRooms(),
  ]);

  const birthdayReminders = reminders.filter((r) => r.kind === "birthday");
  const welcomeFarewellReminders = reminders.filter((r) => r.kind === "welcome" || r.kind === "farewell");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Email</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Birthdays, welcomes and farewells coming up, plus every template for emailing families.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NewEnquiryButton rooms={rooms} />
          <Link href="/email/history" className="btn-ghost">
            History
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReminderPanel
          icon={<GiftIcon className="h-7 w-7" />}
          title="Birthdays — next 7 days"
          reminders={birthdayReminders}
          emptyMessage="No birthdays in the next week."
        />
        <ReminderPanel
          icon={<HeartIcon className="h-7 w-7" />}
          title="Welcomes & Farewells — next 7 days"
          reminders={welcomeFarewellReminders}
          emptyMessage="No confirmed starts or leaving dates in the next week."
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Open enquiries</h2>
        <EnquiryPanel enquiries={enquiries} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Templates</h2>
        <TemplateGrid templates={templates} />
      </section>
    </div>
  );
}
