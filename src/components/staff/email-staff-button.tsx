import Link from "next/link";
import { MailIcon } from "@/components/icons";

/** Links straight into the compose wizard's blank ad hoc draft for this
 * staff member — see the "staffId" branch of app/(portal)/email/compose/
 * page.tsx. There's no staff-oriented template library yet (the existing
 * 16 templates are all written for children's families), so this skips
 * the template grid entirely rather than showing templates that don't
 * apply to a staff member. */
export function EmailStaffButton({ staffId }: { staffId: string }) {
  return (
    <Link href={`/email/compose?staffId=${staffId}`} className="btn-secondary">
      <MailIcon className="h-4 w-4" />
      Email staff
    </Link>
  );
}
