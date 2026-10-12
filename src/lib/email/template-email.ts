import "server-only";

// ---------------------------------------------------------------------------
// Fills {{tokens}} in a template's plain-text subject/body with real data,
// and turns a final plain-text body into the styled HTML actually sent.
// Drafts are stored and edited as plain text throughout (so the Review
// screen is just a couple of ordinary <textarea>s) — HTML is only ever
// generated once, right before a send.
// ---------------------------------------------------------------------------

export type TemplateTokenValues = Record<string, string | null | undefined>;

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;

/** A token with no value becomes a bracketed, impossible-to-miss
 * placeholder right in the text (e.g. "[[parent_name — fill in]]") rather
 * than either inventing a value or leaving a raw, easy-to-miss "{{token}}"
 * in a sent email. `missingTokens` lists which ones, so the Review screen
 * can call them out above the textarea too. */
export function fillTemplateTokens(text: string, values: TemplateTokenValues): { text: string; missingTokens: string[] } {
  const missing = new Set<string>();
  const filled = text.replace(TOKEN_PATTERN, (_match, token: string) => {
    const value = values[token];
    if (value === null || value === undefined || value === "") {
      missing.add(token);
      return `[[${token} — fill in]]`;
    }
    return value;
  });
  return { text: filled, missingTokens: Array.from(missing) };
}

const PLACEHOLDER_PATTERN = /\[\[[\w\s—-]+\]\]/;

/** True once every flagged placeholder has been either filled in (the
 * {{token}} rules above) or manually replaced by whoever edited the draft.
 * The send action refuses to send while this is false — the brief is
 * explicit that a sent email must never carry an unresolved placeholder. */
export function hasUnresolvedPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Same plain, email-client-safe inline styles as the invoice emails (see
// src/lib/email/invoice-email.ts) — kept in sync by eye since there are
// only the two files and duplicating a handful of style strings is simpler
// than introducing a shared constants module for just this.
const WRAP = "font-family: Arial, Helvetica, sans-serif; color: #18181B; max-width: 480px; margin: 0 auto;";
const HEADING = "font-size: 20px; font-weight: bold; margin: 0 0 14px;";
const SECTION = "font-size: 14px; line-height: 1.6; margin: 0 0 14px;";

/** A final, human-edited plain-text body (blank line = new paragraph, a
 * single line break kept within a paragraph) into the HTML actually sent.
 * Deliberately simple — no markdown, no rich formatting — since the whole
 * point of keeping drafts as plain text is that anyone can edit one without
 * needing to know HTML. */
export function renderPlainTextEmailBody(bodyText: string): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${SECTION}">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<div style="${WRAP}"><p style="${HEADING}">Beach Kids</p>${paragraphs}</div>`;
}
