import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChildrenList, getChildById } from "@/lib/data/children";
import { nzTodayDateString, addDays, formatShortDate, formatTime, ordinal } from "@/lib/utils";
import { ATTENDANCE_WEEKDAYS } from "@/lib/data/attendance-roll";
import type {
  EmailTemplate,
  EmailTemplateCategory,
  FamilyContact,
  EmailRecipientOption,
  FamilyEnquiry,
  FamilyEnquiryStatus,
  PotentialDuplicateFamily,
  EmailMessage,
  EmailMessageStatus,
  EmailReminderKind,
  EmailAttachment,
  UpcomingFamilyReminder,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type EmailTemplateRow = {
  id: string;
  key: string;
  label: string;
  category: EmailTemplateCategory;
  icon: string;
  subject: string;
  body: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

function mapTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    category: row.category,
    icon: row.icon,
    subject: row.subject,
    body: row.body,
    is_active: row.is_active,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

/** Every active template, in the order shown on the Email page — sorted by
 * `sort_order` (roughly the order they're listed in the brief), not
 * alphabetically. Inactive templates (none, out of the box — `is_active`
 * exists for Ethan to retire one later without losing its history) are
 * left out. */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Could not load email templates: ${error.message}`);
  return ((data ?? []) as EmailTemplateRow[]).map(mapTemplate);
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const supabase = createClient();
  const { data } = await supabase.from("email_templates").select("*").eq("key", key).maybeSingle();
  return data ? mapTemplate(data as EmailTemplateRow) : null;
}

// ---------------------------------------------------------------------------
// Family contacts & recipient options
// ---------------------------------------------------------------------------

export async function getFamilyContacts(billPayerId: string): Promise<FamilyContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_contacts")
    .select("*")
    .eq("bill_payer_id", billPayerId)
    .order("is_primary", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw new Error(`Could not load this family's contacts: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    bill_payer_id: r.bill_payer_id,
    full_name: r.full_name,
    relationship: r.relationship,
    email: r.email,
    phone: r.phone,
    is_primary: r.is_primary,
  }));
}

/** Every real email address on file for a child's family — the bill payer,
 * the child's own primary contact (PC1) if it's set and different from the
 * bill payer's, and any extra family_contacts rows for that family. Used to
 * populate the "who is this email going to?" step instead of assuming the
 * bill payer is always right. Returns an empty list (never throws) for a
 * child with no email on file anywhere — the compose screen shows that
 * plainly rather than guessing an address. */
export async function getRecipientOptionsForChild(childId: string): Promise<EmailRecipientOption[]> {
  const child = await getChildById(childId);
  if (!child) return [];

  const options: EmailRecipientOption[] = [];

  if (child.bill_payer?.email) {
    options.push({
      source: "bill_payer",
      id: null,
      name: child.bill_payer.full_name,
      relationship: "Bill payer",
      email: child.bill_payer.email,
    });
  }

  if (child.primary_contact_email && child.primary_contact_email !== child.bill_payer?.email) {
    options.push({
      source: "primary_contact",
      id: null,
      name: child.bill_payer ? `${child.bill_payer.full_name} (PC1)` : "Primary contact",
      relationship: "Primary contact",
      email: child.primary_contact_email,
    });
  }

  if (child.bill_payer_id) {
    const contacts = await getFamilyContacts(child.bill_payer_id);
    contacts
      .filter((c) => c.email)
      .forEach((c) =>
        options.push({
          source: "family_contact",
          id: c.id,
          name: c.full_name,
          relationship: c.relationship,
          email: c.email as string,
        })
      );
  }

  return options;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Everything a template's {{tokens}} can draw on for one child + the
 * recipient already chosen for them — computed fresh from the real data
 * each time a draft is created, never stored separately. A value that
 * genuinely isn't on file (no start date set, no schedule entered) comes
 * back `null`, which fillTemplateTokens turns into a visible "fill in"
 * placeholder rather than a blank or invented value.
 *
 * There's no separate "preferred name" field on a child's profile yet —
 * {{child_name}} uses their first name (from full_name) as the closest
 * available stand-in. */
export async function getTemplateTokenValues(
  childId: string,
  recipientName: string | null
): Promise<Record<string, string | null>> {
  const child = await getChildById(childId);
  if (!child) return {};

  const today = nzTodayDateString();
  const birthdayOccurrence = child.date_of_birth ? nextOccurrence(today, child.date_of_birth.slice(5, 10)) : null;
  const turningAge =
    birthdayOccurrence && child.date_of_birth
      ? Number(birthdayOccurrence.slice(0, 4)) - Number(child.date_of_birth.slice(0, 4))
      : null;

  let bookedSessions: string | null = null;
  if (child.enrolled_schedule) {
    const schedule = child.enrolled_schedule;
    if (schedule.tbc) {
      bookedSessions = "To be confirmed";
    } else {
      const lines = ATTENDANCE_WEEKDAYS.map((d) => {
        const start = schedule[`${d.key}_start` as keyof typeof schedule] as string | null;
        const end = schedule[`${d.key}_end` as keyof typeof schedule] as string | null;
        if (!start || !end) return null;
        return `${d.label}: ${formatTime(start)}–${formatTime(end)}`;
      }).filter((l): l is string => Boolean(l));
      bookedSessions = lines.length > 0 ? lines.join("\n") : null;
    }
  }

  return {
    child_name: firstName(child.full_name),
    parent_name: recipientName ? firstName(recipientName) : null,
    room_name: child.room_name,
    birthday_date: birthdayOccurrence ? formatShortDate(birthdayOccurrence) : null,
    turning_age: turningAge !== null ? ordinal(turningAge) : null,
    start_date: child.start_date ? formatShortDate(child.start_date) : null,
    last_day: child.leaving_date ? formatShortDate(child.leaving_date) : null,
    booked_sessions: bookedSessions,
    // Not derivable from any stored data — always left for whoever's
    // composing to type in directly on the Review screen.
    event_name: null,
    event_details: null,
    missing_items: null,
  };
}

/** The equivalent of getTemplateTokenValues, for a prospective family who
 * only exists as a family_enquiries row — no real child/enrolment data to
 * draw on, so this only ever fills {{child_name}}/{{parent_name}}/
 * {{room_name}}/{{start_date}} from what was typed into the "New enquiry"
 * form, and leaves every other token (birthday/fees/schedule-related) as a
 * flagged placeholder. In practice only the `new_enquiry` template is ever
 * used against an enquiry — see EMAIL_REMINDER_TEMPLATE_KEY and the Email
 * page's enquiries panel — but this stays generic rather than special-cased
 * to that one key, in case a future template is sent the same way. */
export async function getEnquiryTemplateTokenValues(enquiryId: string): Promise<Record<string, string | null>> {
  const enquiry = await getFamilyEnquiryById(enquiryId);
  if (!enquiry) return {};

  return {
    child_name: firstName(enquiry.child_full_name),
    parent_name: firstName(enquiry.parent_full_name),
    room_name: enquiry.intended_room_name,
    start_date: enquiry.intended_start_date ? formatShortDate(enquiry.intended_start_date) : null,
    birthday_date: null,
    turning_age: null,
    last_day: null,
    booked_sessions: null,
    event_name: null,
    event_details: null,
    missing_items: null,
  };
}

// ---------------------------------------------------------------------------
// Family enquiries
// ---------------------------------------------------------------------------

type FamilyEnquiryRow = {
  id: string;
  child_full_name: string;
  parent_full_name: string;
  parent_email: string;
  parent_phone: string | null;
  intended_room_id: string | null;
  intended_start_date: string | null;
  status: FamilyEnquiryStatus;
  converted_child_id: string | null;
  notes: string | null;
  created_at: string;
};

export async function getFamilyEnquiries(status?: FamilyEnquiryStatus): Promise<FamilyEnquiry[]> {
  const supabase = createClient();
  const [{ data: rows, error }, { data: roomRows }] = await Promise.all([
    (async () => {
      let query = supabase.from("family_enquiries").select("*").order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      return query;
    })(),
    supabase.from("roster_rooms").select("id, name"),
  ]);
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);

  const roomNameById = new Map((roomRows ?? []).map((r) => [r.id as string, r.name as string]));

  return ((rows ?? []) as FamilyEnquiryRow[]).map((r) => ({
    id: r.id,
    child_full_name: r.child_full_name,
    parent_full_name: r.parent_full_name,
    parent_email: r.parent_email,
    parent_phone: r.parent_phone,
    intended_room_id: r.intended_room_id,
    intended_room_name: r.intended_room_id ? roomNameById.get(r.intended_room_id) ?? null : null,
    intended_start_date: r.intended_start_date,
    status: r.status,
    converted_child_id: r.converted_child_id,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export async function getFamilyEnquiryById(id: string): Promise<FamilyEnquiry | null> {
  const all = await getFamilyEnquiries();
  return all.find((e) => e.id === id) ?? null;
}

/** A loose, deliberately generous check for an existing family before
 * creating a new enquiry — matches on the parent's email (exact,
 * case-insensitive), the parent's name, or the child's name, against both
 * existing bill payers (real families already in the system) and other
 * still-open enquiries. This is a prompt for a human to glance at and
 * confirm, not a hard block — a genuine new family with a common name
 * should never be prevented from being added, just flagged for a second
 * look. */
export async function findPotentialDuplicateFamilies(input: {
  parentName: string;
  parentEmail: string;
  childName: string;
}): Promise<PotentialDuplicateFamily[]> {
  const supabase = createClient();
  // Commas/parens inside a name or email would otherwise corrupt the
  // .or() filter string Supabase expects — stripped here since this is
  // only ever a soft "does this look familiar?" prompt, not a security
  // check, so a conservative fallback (just don't filter on that one
  // field) is fine.
  const safe = (s: string) => s.replace(/[(),]/g, "");
  const parentName = safe(input.parentName.trim());
  const parentEmail = safe(input.parentEmail.trim());
  const childName = safe(input.childName.trim());
  if (!parentName && !parentEmail && !childName) return [];

  const billPayerFilter = [parentEmail ? `email.ilike.${parentEmail}` : null, parentName ? `full_name.ilike.%${parentName}%` : null]
    .filter(Boolean)
    .join(",");
  const enquiryFilter = [
    parentEmail ? `parent_email.ilike.${parentEmail}` : null,
    parentName ? `parent_full_name.ilike.%${parentName}%` : null,
  ]
    .filter(Boolean)
    .join(",");

  const [{ data: billPayerRows }, { data: enquiryRows }, { data: childRows }] = await Promise.all([
    billPayerFilter
      ? supabase.from("bill_payers").select("id, full_name, email").or(billPayerFilter)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null }[] }),
    enquiryFilter
      ? supabase
          .from("family_enquiries")
          .select("id, parent_full_name, parent_email, child_full_name, status")
          .eq("status", "enquiry")
          .or(enquiryFilter)
      : Promise.resolve({ data: [] as { id: string; parent_full_name: string; parent_email: string; child_full_name: string; status: string }[] }),
    childName
      ? supabase.from("children").select("id, full_name, bill_payer_id").ilike("full_name", `%${childName}%`)
      : Promise.resolve({ data: [] as { id: string; full_name: string; bill_payer_id: string | null }[] }),
  ]);

  const results: PotentialDuplicateFamily[] = [];

  const childNamesByBillPayer = new Map<string, string[]>();
  (childRows ?? []).forEach((c: any) => {
    if (!c.bill_payer_id) return;
    const list = childNamesByBillPayer.get(c.bill_payer_id) ?? [];
    list.push(c.full_name);
    childNamesByBillPayer.set(c.bill_payer_id, list);
  });

  (billPayerRows ?? []).forEach((b: any) => {
    results.push({
      kind: "bill_payer",
      id: b.id,
      parent_name: b.full_name,
      email: b.email,
      childNames: childNamesByBillPayer.get(b.id) ?? [],
    });
  });

  (enquiryRows ?? []).forEach((e: any) => {
    results.push({
      kind: "enquiry",
      id: e.id,
      parent_name: e.parent_full_name,
      email: e.parent_email,
      childNames: [e.child_full_name],
    });
  });

  // A child-name match whose family wasn't already caught by the name/email
  // checks above (e.g. same child name, different-sounding parent name —
  // still worth a glance).
  const matchedBillPayerIds = new Set(results.filter((r) => r.kind === "bill_payer").map((r) => r.id));
  (childRows ?? []).forEach((c: any) => {
    if (!c.bill_payer_id || matchedBillPayerIds.has(c.bill_payer_id)) return;
    results.push({ kind: "bill_payer", id: c.bill_payer_id, parent_name: "(existing family)", email: null, childNames: [c.full_name] });
    matchedBillPayerIds.add(c.bill_payer_id);
  });

  return results;
}

// ---------------------------------------------------------------------------
// Upcoming reminders — birthdays, starts, leaves
// ---------------------------------------------------------------------------

/** The next date on/after `fromDate` that has the same month/day as
 * `monthDay` (a "MM-DD" string) — this year's occurrence if it hasn't
 * passed yet, otherwise next year's. All plain "YYYY-MM-DD" string
 * arithmetic, no timezone-sensitive Date math. */
function nextOccurrence(fromDate: string, monthDay: string): string {
  const year = Number(fromDate.slice(0, 4));
  const candidate = `${year}-${monthDay}`;
  return candidate >= fromDate ? candidate : `${year + 1}-${monthDay}`;
}

type ReminderSlot = { kind: EmailReminderKind; date: string; childId: string; turningAge: number | null };

/** Birthdays, confirmed starts and confirmed leaves falling within the next
 * `daysAhead` days (inclusive of today), each checked against
 * email_messages to say whether it's already been drafted or sent. Reuses
 * the same `children.date_of_birth` / `start_date` / `leaving_date` fields
 * the rest of the app already has — nothing new is stored to compute this.
 * Dates are all worked out in NZ local time (see nzTodayDateString) so a
 * reminder shows up on the right day regardless of the server's own
 * timezone. */
export async function getUpcomingFamilyReminders(daysAhead = 7): Promise<UpcomingFamilyReminder[]> {
  const today = nzTodayDateString();
  const windowEnd = addDays(today, daysAhead);

  const children = await getChildrenList({ status: "active" });

  const slots: ReminderSlot[] = [];

  children.forEach((c) => {
    if (c.date_of_birth) {
      const monthDay = c.date_of_birth.slice(5, 10);
      const occurrence = nextOccurrence(today, monthDay);
      if (occurrence <= windowEnd) {
        const turningAge = Number(occurrence.slice(0, 4)) - Number(c.date_of_birth.slice(0, 4));
        slots.push({ kind: "birthday", date: occurrence, childId: c.id, turningAge });
      }
    }
    if (c.start_date && c.start_date >= today && c.start_date <= windowEnd) {
      slots.push({ kind: "welcome", date: c.start_date, childId: c.id, turningAge: null });
    }
    if (c.leaving_date && c.leaving_date >= today && c.leaving_date <= windowEnd) {
      slots.push({ kind: "farewell", date: c.leaving_date, childId: c.id, turningAge: null });
    }
  });

  if (slots.length === 0) return [];

  const supabase = createClient();
  const childIds = Array.from(new Set(slots.map((s) => s.childId)));
  const { data: existingRows } = await supabase
    .from("email_messages")
    .select("id, child_id, reminder_kind, reminder_event_date, status")
    .in("child_id", childIds)
    .not("reminder_kind", "is", null)
    .in("status", ["draft", "sent"]);

  const existingBySlot = new Map<string, { id: string; status: EmailMessageStatus }>();
  (existingRows ?? []).forEach((r) => {
    existingBySlot.set(`${r.child_id}|${r.reminder_kind}|${r.reminder_event_date}`, {
      id: r.id,
      status: r.status as EmailMessageStatus,
    });
  });

  const childById = new Map(children.map((c) => [c.id, c]));

  return slots
    .map((slot) => {
      const child = childById.get(slot.childId)!;
      const existing = existingBySlot.get(`${slot.childId}|${slot.kind}|${slot.date}`);
      return {
        kind: slot.kind,
        date: slot.date,
        childId: slot.childId,
        childName: child.full_name,
        roomName: child.room_name,
        turningAge: slot.turningAge,
        isToday: slot.date === today,
        alreadyHandled: existing ? (existing.status === "sent" ? "sent" : "draft") : null,
        draftEmailId: existing && existing.status === "draft" ? existing.id : null,
      } satisfies UpcomingFamilyReminder;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** How many of the next 7 days' reminders are genuinely outstanding (no
 * draft or sent email yet) — the small sidebar badge count. */
export async function countOutstandingReminders(): Promise<number> {
  const reminders = await getUpcomingFamilyReminders(7);
  return reminders.filter((r) => r.alreadyHandled === null).length;
}

// ---------------------------------------------------------------------------
// Child search (for the "search for and select a child" compose step)
// ---------------------------------------------------------------------------

export type EmailChildSearchResult = {
  id: string;
  full_name: string;
  room_name: string | null;
  status: "active" | "left";
};

/** Deliberately searches every child regardless of status (not just
 * "active") — a family who recently left is still a real email recipient
 * (e.g. a farewell follow-up), so there's no reason to hide them here the
 * way the main Children & Fees list does by default. */
export async function searchChildrenForEmail(query: string): Promise<EmailChildSearchResult[]> {
  const children = await getChildrenList({ search: query || undefined });
  return children.slice(0, 25).map((c) => ({ id: c.id, full_name: c.full_name, room_name: c.room_name, status: c.status }));
}

// ---------------------------------------------------------------------------
// Email history / messages
// ---------------------------------------------------------------------------

type EmailMessageRow = {
  id: string;
  template_key: string | null;
  child_id: string | null;
  bill_payer_id: string | null;
  family_enquiry_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  status: EmailMessageStatus;
  reminder_kind: EmailReminderKind | null;
  reminder_event_date: string | null;
  attachments: EmailAttachment[];
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

async function mapEmailMessages(rows: EmailMessageRow[]): Promise<EmailMessage[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();

  const childIds = Array.from(new Set(rows.map((r) => r.child_id).filter((v): v is string => Boolean(v))));
  const templateKeys = Array.from(new Set(rows.map((r) => r.template_key).filter((v): v is string => Boolean(v))));

  const [{ data: childRows }, { data: templateRows }] = await Promise.all([
    childIds.length > 0 ? supabase.from("children").select("id, full_name").in("id", childIds) : Promise.resolve({ data: [] }),
    templateKeys.length > 0
      ? supabase.from("email_templates").select("key, label").in("key", templateKeys)
      : Promise.resolve({ data: [] }),
  ]);

  const childNameById = new Map((childRows ?? []).map((c: any) => [c.id as string, c.full_name as string]));
  const templateLabelByKey = new Map((templateRows ?? []).map((t: any) => [t.key as string, t.label as string]));

  return rows.map((r) => ({
    id: r.id,
    template_key: r.template_key,
    template_label: r.template_key ? templateLabelByKey.get(r.template_key) ?? r.template_key : null,
    child_id: r.child_id,
    child_name: r.child_id ? childNameById.get(r.child_id) ?? null : null,
    bill_payer_id: r.bill_payer_id,
    family_enquiry_id: r.family_enquiry_id,
    recipient_name: r.recipient_name,
    recipient_email: r.recipient_email,
    subject: r.subject,
    body: r.body,
    status: r.status,
    reminder_kind: r.reminder_kind,
    reminder_event_date: r.reminder_event_date,
    attachments: r.attachments ?? [],
    error_message: r.error_message,
    sent_at: r.sent_at,
    created_at: r.created_at,
  }));
}

export async function getEmailMessageById(id: string): Promise<EmailMessage | null> {
  const supabase = createClient();
  const { data } = await supabase.from("email_messages").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const mapped = await mapEmailMessages([data as EmailMessageRow]);
  return mapped[0] ?? null;
}

export async function getEmailHistory(filters?: {
  search?: string;
  status?: EmailMessageStatus;
  templateKey?: string;
}): Promise<EmailMessage[]> {
  const supabase = createClient();
  let query = supabase.from("email_messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.templateKey) query = query.eq("template_key", filters.templateKey);
  if (filters?.search) {
    // Commas/parens would otherwise corrupt the .or() filter string
    // Postgrest expects (the same issue findPotentialDuplicateFamilies
    // guards against above) — stripped here since this is just a search
    // box, not a security check, so silently ignoring those characters is
    // the right fallback rather than erroring the whole history page out.
    const s = filters.search.trim().replace(/[(),]/g, "");
    if (s) query = query.or(`subject.ilike.%${s}%,recipient_name.ilike.%${s}%,recipient_email.ilike.%${s}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Could not load email history: ${error.message}`);
  return mapEmailMessages((data ?? []) as EmailMessageRow[]);
}

/** Every draft/sent/failed email already logged against one child — shown
 * on their profile-adjacent context if ever needed, and used by the
 * compose wizard to warn before drafting a second ad hoc email that looks
 * like a near-duplicate of a very recent one. */
export async function getEmailHistoryForChild(childId: string): Promise<EmailMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load this child's email history: ${error.message}`);
  return mapEmailMessages((data ?? []) as EmailMessageRow[]);
}
