import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getEmailTemplates, getEnquiryTemplateTokenValues, getFamilyEnquiries, getTemplateTokenValues, getUpcomingFamilyReminders } from "@/lib/data/email";
import { getContactFromAddress } from "@/lib/email/resend-client";
import { fillTemplateTokens } from "@/lib/email/template-email";
import { nzTodayDateString } from "@/lib/utils";
import { placeholdersIn } from "@/lib/email-format";
import type { EmailAttachment, EmailMessageStatus, EmailReminderKind, EmailTemplate, FamilyEnquiry, UpcomingFamilyReminder } from "@/lib/types";

// Read models for the Email area, built on the existing email_messages,
// email_templates, family_enquiries, children, bill_payers, family_contacts
// and staff records.
//
// A message to several people is stored as one email_messages row per
// recipient (so each person gets their own email). Rows saved together
// share the same created_at and created_by; that pair is how a
// multi-recipient draft is reopened as one.

// ---------------------------------------------------------------------------
// Recipient directory
// ---------------------------------------------------------------------------

export type RecipientSource = "bill_payer" | "primary_contact" | "family_contact" | "staff" | "enquiry";

export type RecipientOption = {
  source: RecipientSource;
  email: string;
  name: string;
  relationship: string;
  /** Pre-ticked when the child is added: the family account email, or the
   * child's primary contact when there's no family account email. */
  isDefault: boolean;
};

export type DirectoryChild = {
  id: string;
  name: string;
  status: "active" | "left";
  roomId: string | null;
  roomName: string | null;
  billPayerId: string | null;
  familyName: string | null;
  options: RecipientOption[];
};

export type DirectoryStaff = { id: string; name: string; role: string | null; email: string | null; active: boolean };
export type DirectoryEnquiry = { id: string; childName: string; parentName: string; email: string };
export type DirectoryRoom = { id: string; name: string };

export type RecipientDirectory = {
  children: DirectoryChild[];
  staff: DirectoryStaff[];
  enquiries: DirectoryEnquiry[];
  rooms: DirectoryRoom[];
};

const HOME_ROOMS = ["Tainui", "Pukewa", "Ohinemuri"];

export async function getRecipientDirectory(): Promise<RecipientDirectory> {
  const supabase = createClient();
  const [{ data: kids }, { data: payers }, { data: contacts }, { data: rooms }, { data: staff }, { data: enquiries }] = await Promise.all([
    supabase.from("children").select("id, full_name, status, room_id, bill_payer_id, primary_contact_email").order("full_name"),
    supabase.from("bill_payers").select("id, full_name, email"),
    supabase.from("family_contacts").select("id, bill_payer_id, full_name, relationship, email, is_primary"),
    supabase.from("roster_rooms").select("id, name, sort_order").order("sort_order"),
    supabase.from("staff").select("id, full_name, role, email, status").order("full_name"),
    supabase.from("family_enquiries").select("id, child_full_name, parent_full_name, parent_email, status").eq("status", "enquiry"),
  ]);
  const payerById = new Map((payers ?? []).map((p: any) => [p.id as string, p]));
  const roomById = new Map((rooms ?? []).map((r: any) => [r.id as string, r.name as string]));
  const contactsByPayer = new Map<string, any[]>();
  (contacts ?? []).forEach((c: any) => contactsByPayer.set(c.bill_payer_id, [...(contactsByPayer.get(c.bill_payer_id) ?? []), c]));

  const children: DirectoryChild[] = (kids ?? []).map((k: any) => {
    const payer = k.bill_payer_id ? payerById.get(k.bill_payer_id) : null;
    const options: RecipientOption[] = [];
    const payerEmail = payer?.email?.trim() || null;
    if (payerEmail) options.push({ source: "bill_payer", email: payerEmail, name: payer.full_name, relationship: "Family account", isDefault: true });
    const pc = k.primary_contact_email?.trim() || null;
    if (pc && pc.toLowerCase() !== payerEmail?.toLowerCase()) {
      options.push({
        source: "primary_contact",
        email: pc,
        name: payer ? `${payer.full_name} (primary contact)` : "Primary contact",
        relationship: "Primary contact",
        isDefault: !payerEmail,
      });
    }
    for (const c of (k.bill_payer_id ? contactsByPayer.get(k.bill_payer_id) : null) ?? []) {
      const email = c.email?.trim();
      if (!email || options.some((o) => o.email.toLowerCase() === email.toLowerCase())) continue;
      options.push({ source: "family_contact", email, name: c.full_name, relationship: c.relationship || "Family contact", isDefault: false });
    }
    return {
      id: k.id,
      name: k.full_name,
      status: k.status === "active" ? "active" : "left",
      roomId: k.room_id,
      roomName: k.room_id ? roomById.get(k.room_id) ?? null : null,
      billPayerId: k.bill_payer_id,
      familyName: payer?.full_name ?? null,
      options,
    };
  });

  return {
    children,
    staff: (staff ?? []).map((s: any) => ({ id: s.id, name: s.full_name, role: s.role, email: s.email?.trim() || null, active: s.status !== "former" })),
    enquiries: (enquiries ?? []).map((e: any) => ({ id: e.id, childName: e.child_full_name, parentName: e.parent_full_name, email: e.parent_email })),
    rooms: (rooms ?? [])
      .filter((r: any) => HOME_ROOMS.includes(r.name))
      .map((r: any) => ({ id: r.id, name: r.name })),
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageRow = {
  id: string;
  templateKey: string | null;
  templateLabel: string | null;
  childId: string | null;
  childName: string | null;
  staffId: string | null;
  staffName: string | null;
  billPayerId: string | null;
  familyName: string | null;
  enquiryId: string | null;
  enquiryName: string | null;
  recipientName: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  status: EmailMessageStatus;
  reminderKind: EmailReminderKind | null;
  reminderDate: string | null;
  attachments: EmailAttachment[];
  error: string | null;
  providerId: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
};

async function mapRows(rows: any[]): Promise<MessageRow[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const ids = (k: string) => Array.from(new Set(rows.map((r) => r[k]).filter(Boolean))) as string[];
  const [childIds, staffIds, payerIds, enqIds, keys] = [ids("child_id"), ids("staff_id"), ids("bill_payer_id"), ids("family_enquiry_id"), ids("template_key")];
  const empty = Promise.resolve({ data: [] as any[] });
  const [{ data: c }, { data: s }, { data: p }, { data: e }, { data: t }] = await Promise.all([
    childIds.length ? supabase.from("children").select("id, full_name").in("id", childIds) : empty,
    staffIds.length ? supabase.from("staff").select("id, full_name").in("id", staffIds) : empty,
    payerIds.length ? supabase.from("bill_payers").select("id, full_name").in("id", payerIds) : empty,
    enqIds.length ? supabase.from("family_enquiries").select("id, parent_full_name, child_full_name").in("id", enqIds) : empty,
    keys.length ? supabase.from("email_templates").select("key, label").in("key", keys) : empty,
  ]);
  const name = (list: any[] | null, k = "full_name") => new Map((list ?? []).map((x: any) => [x.id ?? x.key, x[k]]));
  const childName = name(c);
  const staffName = name(s);
  const payerName = name(p);
  const enqName = new Map((e ?? []).map((x: any) => [x.id, `${x.parent_full_name} (enquiry for ${x.child_full_name})`]));
  const tplLabel = new Map((t ?? []).map((x: any) => [x.key, x.label]));
  const statementLabel = (k: string | null) => (k === "statement" ? "Statement" : null);

  return rows.map((r) => ({
    id: r.id,
    templateKey: r.template_key,
    templateLabel: r.template_key ? tplLabel.get(r.template_key) ?? statementLabel(r.template_key) ?? r.template_key : null,
    childId: r.child_id,
    childName: r.child_id ? childName.get(r.child_id) ?? null : null,
    staffId: r.staff_id,
    staffName: r.staff_id ? staffName.get(r.staff_id) ?? null : null,
    billPayerId: r.bill_payer_id,
    familyName: r.bill_payer_id ? payerName.get(r.bill_payer_id) ?? null : null,
    enquiryId: r.family_enquiry_id,
    enquiryName: r.family_enquiry_id ? enqName.get(r.family_enquiry_id) ?? null : null,
    recipientName: r.recipient_name,
    recipientEmail: r.recipient_email,
    subject: r.subject,
    body: r.body,
    status: r.status,
    reminderKind: r.reminder_kind,
    reminderDate: r.reminder_event_date,
    attachments: r.attachments ?? [],
    error: r.error_message,
    providerId: r.provider_message_id ?? null,
    sentAt: r.sent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? null,
    createdBy: r.created_by ?? null,
  }));
}

export async function getMessage(id: string): Promise<MessageRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from("email_messages").select("*").eq("id", id).maybeSingle();
  return data ? (await mapRows([data]))[0] : null;
}

/** The unsent rows saved together with `id` (including `id` itself). */
export async function getDraftBatch(id: string): Promise<MessageRow[]> {
  const supabase = createClient();
  const { data: lead } = await supabase.from("email_messages").select("*").eq("id", id).maybeSingle();
  if (!lead) return [];
  if (lead.status !== "draft" && lead.status !== "failed") return mapRows([lead]);
  let q = supabase.from("email_messages").select("*").eq("created_at", lead.created_at).in("status", ["draft", "failed"]);
  q = lead.created_by ? q.eq("created_by", lead.created_by) : q.is("created_by", null);
  const { data } = await q.order("recipient_email");
  const rows = (data ?? []).length ? data! : [lead];
  return mapRows(rows);
}

export type HistoryFilters = { q?: string; status?: EmailMessageStatus; kind?: "family" | "staff" | "enquiry" | "statement"; days?: number };

export async function getHistory(filters: HistoryFilters): Promise<MessageRow[]> {
  const supabase = createClient();
  let q = supabase.from("email_messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.kind === "staff") q = q.not("staff_id", "is", null);
  if (filters.kind === "enquiry") q = q.not("family_enquiry_id", "is", null);
  if (filters.kind === "statement") q = q.eq("template_key", "statement");
  if (filters.kind === "family") q = q.is("staff_id", null).is("family_enquiry_id", null);
  if (filters.days) q = q.gte("created_at", new Date(Date.now() - filters.days * 86400000).toISOString());
  const s = filters.q?.trim().replace(/[(),%]/g, "");
  if (s) q = q.or(`subject.ilike.%${s}%,recipient_name.ilike.%${s}%,recipient_email.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new Error(`Could not load email history: ${error.message}`);
  return mapRows(data ?? []);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type DraftGroup = { leadId: string; subject: string; recipients: string[]; count: number; failed: boolean; updatedAt: string; templateLabel: string | null };

function groupDrafts(rows: MessageRow[]): DraftGroup[] {
  const groups = new Map<string, MessageRow[]>();
  rows.forEach((r) => {
    const key = `${r.createdAt}|${r.createdBy ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return Array.from(groups.values())
    .map((g) => ({
      leadId: g[0].id,
      subject: g[0].subject,
      recipients: g.map((r) => r.recipientName || r.recipientEmail),
      count: g.length,
      failed: g.some((r) => r.status === "failed"),
      updatedAt: g.map((r) => r.updatedAt ?? r.createdAt).sort().reverse()[0],
      templateLabel: g[0].templateLabel,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export type EnquiryWithActivity = FamilyEnquiry & { messages: MessageRow[]; lastContact: string | null; awaitingReply: boolean };

export async function getEnquiriesWithActivity(): Promise<EnquiryWithActivity[]> {
  const supabase = createClient();
  const [enquiries, { data: rows }] = await Promise.all([
    getFamilyEnquiries(),
    supabase.from("email_messages").select("*").not("family_enquiry_id", "is", null).order("created_at", { ascending: false }),
  ]);
  const messages = await mapRows(rows ?? []);
  return enquiries.map((e) => {
    const m = messages.filter((x) => x.enquiryId === e.id);
    const sent = m.filter((x) => x.status === "sent");
    return { ...e, messages: m, lastContact: sent[0]?.sentAt ?? null, awaitingReply: e.status === "enquiry" && sent.length === 0 };
  });
}

export type EmailOverview = {
  drafts: DraftGroup[];
  recent: MessageRow[];
  enquiries: EnquiryWithActivity[];
  reminders: UpcomingFamilyReminder[];
  counts: { drafts: number; failed: number; openEnquiries: number; sentLast30: number };
};

export async function getEmailOverview(): Promise<EmailOverview> {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: unsent }, { data: recentRows }, enquiries, reminders, { count: sentLast30 }] = await Promise.all([
    supabase.from("email_messages").select("*").in("status", ["draft", "failed"]).order("created_at", { ascending: false }).limit(200),
    supabase.from("email_messages").select("*").in("status", ["sent", "sending"]).order("created_at", { ascending: false }).limit(6),
    getEnquiriesWithActivity(),
    getUpcomingFamilyReminders(7),
    supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
  ]);
  const unsentRows = await mapRows(unsent ?? []);
  const open = enquiries.filter((e) => e.status === "enquiry");
  return {
    drafts: groupDrafts(unsentRows),
    recent: await mapRows(recentRows ?? []),
    enquiries: open.sort((a, b) => Number(b.awaitingReply) - Number(a.awaitingReply) || (a.created_at < b.created_at ? -1 : 1)),
    reminders,
    counts: {
      drafts: unsentRows.filter((r) => r.status === "draft").length,
      failed: unsentRows.filter((r) => r.status === "failed").length,
      openEnquiries: open.length,
      sentLast30: sentLast30 ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Personalisation and sender
// ---------------------------------------------------------------------------

export type Personalised = { subject: string; body: string; missing: string[] };

type PersonaliseTarget = {
  childId: string | null;
  enquiryId: string | null;
  staffName?: string | null;
  recipientName: string | null;
};

function firstName(full: string | null | undefined) {
  return full ? full.trim().split(/\s+/)[0] || null : null;
}

/** Fills {{fields}} for one recipient from their records. Anything that
 * can't be filled is listed in `missing` and left marked in the text. */
export async function personalise(target: PersonaliseTarget, subject: string, body: string): Promise<Personalised> {
  let values: Record<string, string | null> = {};
  if (target.childId) values = await getTemplateTokenValues(target.childId, target.recipientName);
  else if (target.enquiryId) values = await getEnquiryTemplateTokenValues(target.enquiryId);
  else values = { parent_name: firstName(target.staffName ?? target.recipientName) };
  const s = fillTemplateTokens(subject, values);
  const b = fillTemplateTokens(body, values);
  const older = placeholdersIn(s.text, b.text).filter((p) => !s.missingTokens.includes(p) && !b.missingTokens.includes(p));
  return { subject: s.text, body: b.text, missing: Array.from(new Set([...s.missingTokens, ...b.missingTokens, ...older])) };
}

export function getSenderIdentity() {
  const from = getContactFromAddress();
  const testSender = /onboarding@resend\.dev/i.test(from);
  return { from, testSender, configured: Boolean(process.env.RESEND_API_KEY) };
}

export async function getTemplatesForCompose(): Promise<EmailTemplate[]> {
  return getEmailTemplates();
}

export function todayNz() {
  return nzTodayDateString();
}
