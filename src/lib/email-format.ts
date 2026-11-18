import type { EmailMessageStatus, EmailTemplateCategory } from "@/lib/types";
import type { PillTone } from "@/components/ui/status-pill";

// Client-safe labels and helpers for the Email area.

/** What each personalisation field is filled with. */
export const TOKEN_INFO: Record<string, { label: string; source: string; manual?: boolean }> = {
  child_name: { label: "Child's first name", source: "From the child's record" },
  parent_name: { label: "Recipient's first name", source: "From the recipient's name" },
  room_name: { label: "Child's room", source: "From the child's record" },
  birthday_date: { label: "Birthday date", source: "Next birthday from date of birth" },
  turning_age: { label: "Age they're turning", source: "From date of birth, e.g. 4th" },
  start_date: { label: "Start date", source: "From the child's record" },
  last_day: { label: "Last day", source: "Leaving date on the child's record" },
  booked_sessions: { label: "Booked days and times", source: "From the child's bookings" },
  event_name: { label: "Event name", source: "Typed in when composing", manual: true },
  event_details: { label: "Event details", source: "Typed in when composing", manual: true },
  missing_items: { label: "Forms still needed", source: "Typed in when composing", manual: true },
};

export function tokenLabel(token: string) {
  return TOKEN_INFO[token]?.label ?? token.replace(/_/g, " ");
}

const TOKEN_RE = /\{\{(\w+)\}\}/g;
const PLACEHOLDER_RE = /\[\[([\w\s—-]+)\]\]/g;

/** Personalisation fields ({{token}}) used in some text, in order, once each. */
export function tokensIn(...texts: string[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(TOKEN_RE)) seen.add(m[1]);
  return Array.from(seen);
}

/** "[[... fill in]]" markers left by older drafts. */
export function placeholdersIn(...texts: string[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(PLACEHOLDER_RE)) seen.add(m[1].replace(/\s*—\s*fill in$/, "").trim());
  return Array.from(seen);
}

export function replaceToken(text: string, token: string, value: string) {
  return text.split(`{{${token}}}`).join(value);
}

/** Splits text into plain parts and {{token}} parts for highlighted display. */
export function splitTokens(text: string): Array<{ text: string; token?: string }> {
  const parts: Array<{ text: string; token?: string }> = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], token: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATE_GROUPS: Array<{ key: EmailTemplateCategory; label: string; description: string }> = [
  { key: "enrolment", label: "Enquiries and enrolment", description: "Replies to new families, welcomes and starting" },
  { key: "everyday", label: "Everyday and birthdays", description: "Birthdays, room moves and day-to-day updates" },
  { key: "fees", label: "Fees and admin", description: "Funding, subsidies and account reminders" },
  { key: "events", label: "Events and farewells", description: "Notices about events and saying goodbye" },
];

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  new_enquiry: "Thank a family for enquiring and explain next steps.",
  welcome: "Welcome a new child and their family to their room.",
  settling_visits: "Arrange settling visits before a child starts.",
  starting_soon: "Remind a family their child's first day is coming up.",
  birthday_wishes: "Wish a child a happy birthday.",
  turning_three: "Explain 20 Hours ECE as a child turns three.",
  room_transition: "Let a family know their child is moving rooms.",
  session_changes: "Confirm a child's booked days and hours.",
  missing_paperwork: "Ask for forms that are still outstanding.",
  winz_renewal: "Remind a family their WINZ Childcare Subsidy needs renewing.",
  familyboost_info: "Explain how FamilyBoost can help with fees.",
  familyboost_documents: "Send a family their FamilyBoost documents.",
  payment_reminder: "A friendly reminder about an account balance.",
  event_reminder: "Remind families about an upcoming event.",
  absence_checkin: "Check in when a child has been away.",
  farewell: "Say goodbye and thank a family when a child leaves.",
};

export function templateDescription(key: string, body: string) {
  if (TEMPLATE_DESCRIPTIONS[key]) return TEMPLATE_DESCRIPTIONS[key];
  const firstLine = body.split("\n").map((l) => l.trim()).find((l) => l && !/^(kia ora|hi|dear)\b/i.test(l));
  return firstLine ? (firstLine.length > 90 ? `${firstLine.slice(0, 87)}…` : firstLine) : "";
}

// ---------------------------------------------------------------------------
// Message status
// ---------------------------------------------------------------------------

/** "Sent" means the sending service accepted the email. Earlydesk doesn't
 * receive delivery confirmations, so nothing is ever shown as delivered. */
export const MESSAGE_STATUS: Record<EmailMessageStatus, { label: string; tone: PillTone; detail: string }> = {
  draft: { label: "Draft", tone: "neutral", detail: "Not sent" },
  sending: { label: "Sending", tone: "attention", detail: "Being handed to the sending service" },
  sent: { label: "Sent", tone: "ready", detail: "Accepted by the sending service — delivery isn't confirmed" },
  failed: { label: "Not sent", tone: "action", detail: "The sending service rejected it or it couldn't be sent" },
};

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
