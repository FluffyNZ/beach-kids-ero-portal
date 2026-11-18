"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { RecipientPicker, type MissingEntry, type Recipient } from "@/components/email/recipient-picker";
import {
  addBatchAttachment,
  deleteDraftBatch,
  previewDraftBatch,
  removeBatchAttachment,
  saveDraftBatch,
  sendDraftBatch,
  type RecipientPreview,
} from "@/lib/actions/email-compose";
import { TEMPLATE_GROUPS, TOKEN_INFO, fileSize, placeholdersIn, replaceToken, tokenLabel, tokensIn } from "@/lib/email-format";
import { fmtDateTime } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { RecipientDirectory } from "@/lib/data/email-hub";
import type { EmailAttachment, EmailReminderKind, EmailTemplate } from "@/lib/types";

export type ComposeInitial = {
  batchIds: string[];
  recipients: Recipient[];
  missing: MissingEntry[];
  templateKey: string | null;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  reminder: { kind: EmailReminderKind; date: string; childId: string } | null;
  failedNote: string | null;
  savedAt: string | null;
  notice: string | null;
};

type Step = 1 | 2 | 3;
type Save = "idle" | "dirty" | "saving" | "saved" | "error";
const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "Recipients" },
  { n: 2, label: "Message" },
  { n: 3, label: "Review and send" },
];
const SEND_CHUNK = 8;

/** Puts the draft in the address bar so a refresh reopens it. */
function rememberDraft(id: string) {
  try {
    window.history.replaceState(window.history.state, "", `/email/compose?draftId=${id}`);
  } catch {
    // Not critical — the draft is saved either way.
  }
}

function StepHeader({ step, onGo, canGo }: { step: Step; onGo: (s: Step) => void; canGo: (s: Step) => boolean }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Compose steps">
      {STEPS.map((s, i) => (
        <li key={s.n} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onGo(s.n)}
            disabled={!canGo(s.n)}
            aria-current={step === s.n ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal disabled:cursor-not-allowed",
              step === s.n ? "bg-lilac-100 text-charcoal" : "text-charcoal/70 hover:bg-lilac-50 disabled:hover:bg-transparent"
            )}
          >
            <span
              aria-hidden="true"
              className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", step === s.n ? "bg-charcoal text-white" : "bg-charcoal/10 text-charcoal")}
            >
              {s.n}
            </span>
            {s.label}
          </button>
          {i < STEPS.length - 1 && <span aria-hidden="true" className="text-charcoal/40">→</span>}
        </li>
      ))}
    </ol>
  );
}

function SaveIndicator({ state, savedAt, error }: { state: Save; savedAt: string | null; error: string | null }) {
  return (
    <p aria-live="polite" className="text-sm text-charcoal">
      {state === "saving" && "Saving…"}
      {state === "dirty" && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-attention" />
          Unsaved changes
        </span>
      )}
      {state === "saved" && savedAt && `Draft saved ${fmtDateTime(savedAt).split(", ").pop()}`}
      {state === "idle" && savedAt && `Draft saved ${fmtDateTime(savedAt)}`}
      {state === "idle" && !savedAt && <span className="text-charcoal/70">Not saved yet</span>}
      {state === "error" && <span className="font-medium text-status-action">Not saved{error ? ` — ${error}` : ""}</span>}
    </p>
  );
}

/** Compose an email in three steps. Nothing is sent until the explicit
 * send confirmation on the last step. */
export function ComposeFlow({
  directory,
  templates,
  sender,
  initial,
}: {
  directory: RecipientDirectory;
  templates: EmailTemplate[];
  sender: { from: string; testSender: boolean; configured: boolean };
  initial: ComposeInitial;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initial.batchIds.length ? 2 : initial.recipients.length ? (initial.templateKey ? 2 : 1) : 1);
  const [recipients, setRecipients] = useState<Recipient[]>(initial.recipients);
  const [missing, setMissing] = useState<MissingEntry[]>(initial.missing);
  const [note, setNote] = useState<string | null>(initial.notice);
  const [templateKey, setTemplateKey] = useState<string | null>(initial.templateKey);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [attachments, setAttachments] = useState<EmailAttachment[]>(initial.attachments);
  const [rows, setRows] = useState<Array<{ id: string; email: string }>>(() =>
    initial.batchIds.map((id, i) => ({ id, email: initial.recipients[i]?.email ?? "" }))
  );
  const [save, setSave] = useState<Save>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(initial.savedAt);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [attachState, setAttachState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [previews, setPreviews] = useState<RecipientPreview[] | null>(null);
  const [previewFor, setPreviewFor] = useState<string>("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: Array<{ id: string; email: string; error: string }> } | null>(null);
  const [discard, setDiscard] = useState(false);
  const busy = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = save === "dirty" || save === "error";
  const markDirty = () => setSave("dirty");

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty && !result) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty, result]);

  const tokens = useMemo(() => tokensIn(subject, body), [subject, body]);
  const manualTokens = tokens.filter((t) => TOKEN_INFO[t]?.manual);
  const oldPlaceholders = useMemo(() => placeholdersIn(subject, body), [subject, body]);
  const template = templates.find((t) => t.key === templateKey) ?? null;

  const leadId = rows[0]?.id ?? null;

  /** Saves the whole draft. Returns the saved rows, or null on failure. */
  const saveNow = useCallback(async (): Promise<Array<{ id: string; email: string }> | null> => {
    if (busy.current) return null;
    if (recipients.length === 0) {
      setSaveError("Add at least one recipient first.");
      setSave("error");
      return null;
    }
    busy.current = true;
    setSave("saving");
    setSaveError(null);
    const res = await saveDraftBatch({
      batchIds: rows.map((r) => r.id),
      recipients: recipients.map((r) => ({
        email: r.email,
        name: r.name,
        childId: r.childIds.length === 1 ? r.childIds[0] : null,
        billPayerId: r.billPayerId,
        staffId: r.staffId,
        enquiryId: r.enquiryId,
      })),
      subject,
      body,
      templateKey,
      reminder: initial.reminder,
    });
    busy.current = false;
    if (!res.success) {
      setSave("error");
      setSaveError(res.error);
      if (res.existingDraftId) router.push(`/email/compose?draftId=${res.existingDraftId}`);
      return null;
    }
    // Keep rows in recipient order so the lead row is stable.
    const ordered = recipients.map((r) => res.rows.find((x) => x.email.toLowerCase() === r.key)!).filter(Boolean);
    setRows(ordered);
    setSavedAt(res.savedAt);
    setSave("saved");
    if (!rows.length && ordered[0]) rememberDraft(ordered[0].id);
    return ordered;
  }, [recipients, rows, subject, body, templateKey, initial.reminder, router]);

  function applyTemplate(key: string | null) {
    const t = templates.find((x) => x.key === key) ?? null;
    setTemplateKey(key);
    setSubject(t?.subject ?? "");
    setBody(t?.body ?? "");
    setManualValues({});
    setPendingTemplate(null);
    markDirty();
  }

  function chooseTemplate(key: string | null) {
    if ((subject.trim() || body.trim()) && key !== templateKey) setPendingTemplate(key ?? "");
    else applyTemplate(key);
  }

  function insertToken(token: string) {
    const el = bodyRef.current;
    const text = `{{${token}}}`;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + text + body.slice(end);
    setBody(next);
    markDirty();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function fillManual(token: string) {
    const value = manualValues[token]?.trim();
    if (!value) return;
    setSubject((s) => replaceToken(s, token, value));
    setBody((b) => replaceToken(b, token, value));
    markDirty();
  }

  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachState({ busy: true, error: null });
    const saved = dirty || rows.length === 0 ? await saveNow() : rows;
    if (!saved) {
      setAttachState({ busy: false, error: "Save the draft before attaching files." });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await addBatchAttachment(saved.map((r) => r.id), fd);
    setAttachState({ busy: false, error: res.success ? null : res.error });
    if (res.success) setAttachments(res.attachments);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onRemoveAttachment(path: string) {
    setAttachState({ busy: true, error: null });
    const res = await removeBatchAttachment(rows.map((r) => r.id), path);
    setAttachState({ busy: false, error: res.success ? null : res.error });
    if (res.success) setAttachments(res.attachments);
  }

  async function goReview() {
    const saved = save === "saved" && rows.length ? rows : await saveNow();
    if (!saved) return;
    setStep(3);
    setPreviews(null);
    setReviewError(null);
    const res = await previewDraftBatch(saved[0].id);
    if (!res.success) setReviewError(res.error);
    else {
      setPreviews(res.previews);
      setPreviewFor(res.previews[0]?.id ?? "");
    }
  }

  async function send() {
    if (busy.current || !previews || !leadId) return;
    busy.current = true;
    setConfirm(false);
    setReviewError(null);
    const ids = previews.map((p) => p.id);
    const sent: string[] = [];
    const failed: Array<{ id: string; email: string; error: string }> = [];
    setSending({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i += SEND_CHUNK) {
      const chunk = ids.slice(i, i + SEND_CHUNK);
      let res: Awaited<ReturnType<typeof sendDraftBatch>>;
      try {
        res = await sendDraftBatch({ leadId, ids: chunk, expectedTotal: ids.length - sent.length });
      } catch {
        res = { success: false as const, error: "The connection dropped while sending. Check Email history before trying again." };
      }
      if (!res.success) {
        setReviewError(res.error);
        break;
      }
      sent.push(...res.sent);
      failed.push(...res.failed);
      setSending({ done: sent.length + failed.length, total: ids.length });
      if (res.failed.length) break;
    }
    busy.current = false;
    setSending(null);
    if (sent.length || failed.length) setResult({ sent: sent.length, failed });
    const remaining = rows.filter((r) => !sent.includes(r.id));
    setRows(remaining);
    if (remaining.length) {
      setRecipients((rs) => rs.filter((r) => remaining.some((x) => x.email.toLowerCase() === r.key)));
      setPreviews((ps) => ps?.filter((p) => !sent.includes(p.id)) ?? null);
      setPreviewFor((id) => (sent.includes(id) ? remaining[0].id : id));
      if (remaining[0]) rememberDraft(remaining[0].id);
    }
    setSave("idle");
    router.refresh();
  }

  async function doDiscard() {
    if (rows.length === 0) {
      router.push("/email");
      return;
    }
    const res = await deleteDraftBatch(rows.map((r) => r.id));
    if (res.success) {
      setSave("idle");
      router.push("/email");
    } else setSaveError(res.error);
    setDiscard(false);
  }

  const canGo = (s: Step) => s === 1 || (s === 2 && recipients.length > 0) || (s === 3 && recipients.length > 0 && subject.trim() !== "" && body.trim() !== "");
  const go = (s: Step) => {
    if (s === 3) void goReview();
    else setStep(s);
  };

  const current = previews?.find((p) => p.id === previewFor) ?? previews?.[0];
  const blocked = previews?.filter((p) => p.missing.length > 0) ?? [];
  const sameForAll = previews && previews.length > 1 && previews.every((p) => p.subject === previews[0].subject && p.body === previews[0].body);
  const allSent = result && rows.length === 0;

  if (allSent) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-charcoal/10 bg-white p-6">
        <StatusPill tone="ready">Sent</StatusPill>
        <h2 className="text-lg font-semibold text-charcoal">
          {result.sent === 1 ? "Your email was sent." : `${result.sent} emails were sent.`}
        </h2>
        <p className="text-sm text-charcoal/70">The sending service accepted {result.sent === 1 ? "it" : "them"}. Delivery to each inbox isn&apos;t confirmed.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/email/history" className="btn-secondary">
            View in history
          </Link>
          <Link href="/email/compose" className="btn-primary">
            Compose another
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepHeader step={step} onGo={go} canGo={canGo} />
        <SaveIndicator state={save} savedAt={savedAt} error={saveError} />
      </div>

      {initial.failedNote && !result && (
        <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal">
          {initial.failedNote}
        </p>
      )}
      {note && (
        <p role="status" className="flex items-start justify-between gap-3 rounded-xl bg-lilac-50 px-4 py-3 text-sm text-charcoal">
          {note}
          <button type="button" className="shrink-0 font-medium text-lilac-700" onClick={() => setNote(null)}>
            Dismiss
          </button>
        </p>
      )}
      {result && result.failed.length > 0 && (
        <div role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal">
          <p className="font-medium">
            {result.sent > 0 ? `${result.sent} sent. ` : ""}
            {result.failed.length === 1 ? "1 email wasn't sent" : `${result.failed.length} emails weren't sent`} — the draft is kept so you can try again.
          </p>
          <ul className="mt-1">
            {result.failed.map((f) => (
              <li key={f.id}>
                {f.email}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 1 && (
        <section aria-labelledby="step1" className="flex flex-col gap-5 rounded-2xl border border-charcoal/10 bg-white p-5">
          <h2 id="step1" className="text-lg font-semibold text-charcoal">
            Who is this email for?
          </h2>
          <RecipientPicker
            directory={directory}
            recipients={recipients}
            missing={missing}
            onChange={(next, n) => {
              setRecipients(next.recipients);
              setMissing(next.missing);
              if (n) setNote(n);
              markDirty();
            }}
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-charcoal/10 pt-4">
            <button type="button" className="btn-primary" disabled={recipients.length === 0} onClick={() => setStep(2)}>
              Continue to message
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2" className="flex flex-col gap-5 rounded-2xl border border-charcoal/10 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="step2" className="text-lg font-semibold text-charcoal">
              Message
            </h2>
            <p className="text-sm text-charcoal/70">
              To {recipients.length === 1 ? recipients[0].name : `${recipients.length} recipients`} ·{" "}
              <button type="button" className="font-medium text-lilac-700 underline-offset-4 hover:underline" onClick={() => setStep(1)}>
                Change
              </button>
            </p>
          </div>

          <div>
            <label htmlFor="compose-template" className="mb-1.5 block text-sm font-medium text-charcoal">
              Start from
            </label>
            <select id="compose-template" className="input" value={templateKey ?? ""} onChange={(e) => chooseTemplate(e.target.value || null)}>
              <option value="">Blank message</option>
              {TEMPLATE_GROUPS.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {templates
                    .filter((t) => t.category === g.key)
                    .map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-charcoal/70">
              <Link href="/email/templates" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                Browse templates
              </Link>{" "}
              to preview them first.
            </p>
          </div>

          <div>
            <label htmlFor="compose-subject" className="mb-1.5 block text-sm font-medium text-charcoal">
              Subject
            </label>
            <input
              id="compose-subject"
              className="input"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                markDirty();
              }}
            />
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="compose-body" className="block text-sm font-medium text-charcoal">
                Message
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor="insert-field" className="text-sm text-charcoal/70">
                  Insert field
                </label>
                <select
                  id="insert-field"
                  className="input w-auto py-1"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) insertToken(e.target.value);
                  }}
                >
                  <option value="">Choose…</option>
                  {Object.entries(TOKEN_INFO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              id="compose-body"
              ref={bodyRef}
              className="input min-h-[18rem] text-base leading-relaxed"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                markDirty();
              }}
            />
            <p className="mt-1 text-xs text-charcoal/70">Leave a blank line between paragraphs.</p>
          </div>

          {(tokens.length > 0 || oldPlaceholders.length > 0) && (
            <section aria-labelledby="fields-heading" className="rounded-xl border border-charcoal/10 p-4">
              <h3 id="fields-heading" className="text-sm font-semibold text-charcoal">
                Personalisation
              </h3>
              <p className="text-sm text-charcoal/70">Fields in {"{{double braces}}"} are filled in for each recipient. You&apos;ll see each version before sending.</p>
              <ul className="mt-2 flex flex-col gap-2">
                {tokens.map((t) =>
                  TOKEN_INFO[t]?.manual ? (
                    <li key={t} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`fill-${t}`} className="mb-1 block text-sm text-charcoal">
                          {tokenLabel(t)} <span className="text-charcoal/70">— type it once for everyone</span>
                        </label>
                        <input id={`fill-${t}`} className="input py-1.5" value={manualValues[t] ?? ""} onChange={(e) => setManualValues({ ...manualValues, [t]: e.target.value })} />
                      </div>
                      <button type="button" className="btn-secondary py-1.5" disabled={!manualValues[t]?.trim()} onClick={() => fillManual(t)}>
                        Fill in
                      </button>
                    </li>
                  ) : (
                    <li key={t} className="text-sm text-charcoal">
                      <code className="rounded bg-lilac-50 px-1 py-0.5 text-xs">{`{{${t}}}`}</code> {tokenLabel(t)}
                      <span className="text-charcoal/70"> — {TOKEN_INFO[t]?.source ?? "Not a known field; it will need replacing"}</span>
                    </li>
                  )
                )}
                {oldPlaceholders.map((p) => (
                  <li key={p} className="text-sm text-charcoal">
                    <span className="font-medium text-status-action">Needs filling in:</span> [[{p}]] — replace this in the message.
                  </li>
                ))}
              </ul>
              {manualTokens.length > 0 && <p className="mt-2 text-xs text-charcoal/70">Fields that need typing in must be filled before sending.</p>}
            </section>
          )}

          <section aria-labelledby="att-heading" className="flex flex-col gap-2">
            <h3 id="att-heading" className="text-sm font-semibold text-charcoal">
              Attachments
            </h3>
            {attachments.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {attachments.map((a) => (
                  <li key={a.storage_path} className="flex items-center justify-between gap-2 rounded-xl border border-charcoal/10 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-charcoal">
                      {a.name} <span className="text-charcoal/70">· {fileSize(a.size)}</span>
                    </span>
                    <button type="button" className="shrink-0 text-sm font-medium text-charcoal/70 hover:text-charcoal" disabled={attachState.busy} onClick={() => onRemoveAttachment(a.storage_path)}>
                      Remove<span className="sr-only"> {a.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} id="compose-file" type="file" className="sr-only" onChange={onAttach} />
              <label htmlFor="compose-file" className={cn("btn-secondary cursor-pointer", attachState.busy && "pointer-events-none opacity-50")}>
                {attachState.busy ? "Working…" : "Attach a file"}
              </label>
              <span className="text-xs text-charcoal/70">
                {recipients.length > 1 ? "Each recipient gets their own copy." : "Up to 20 MB."} Attaching saves the draft.
              </span>
            </div>
            {attachState.error && (
              <p role="alert" className="text-sm text-charcoal">
                <span className="font-medium text-status-action">Not attached.</span> {attachState.error}
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 pt-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn-ghost text-status-action" onClick={() => setDiscard(true)}>
                Discard draft
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" disabled={save === "saving"} onClick={() => void saveNow()}>
                {save === "saving" ? "Saving…" : "Save draft"}
              </button>
              <button type="button" className="btn-primary" disabled={!canGo(3) || save === "saving"} onClick={() => void goReview()}>
                Review
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="step3" className="flex flex-col gap-5 rounded-2xl border border-charcoal/10 bg-white p-5">
          <h2 id="step3" className="text-lg font-semibold text-charcoal">
            Review and send
          </h2>
          {reviewError && (
            <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal">
              {reviewError}
            </p>
          )}
          {!previews ? (
            !reviewError && <p className="text-sm text-charcoal/70">Preparing each recipient&apos;s version…</p>
          ) : (
            <>
              <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-charcoal/70">From</dt>
                <dd className="break-words text-charcoal">
                  {sender.from}
                  {sender.testSender && (
                    <span className="block text-xs text-charcoal">
                      <span className="font-medium text-status-action">Test sender:</span> this address only delivers to the sending service&apos;s account owner until a Beach Kids address is set up.
                    </span>
                  )}
                </dd>
                <dt className="text-charcoal/70">To</dt>
                <dd className="text-charcoal">
                  {previews.length === 1 ? (
                    `${previews[0].name ?? ""} <${previews[0].email}>`
                  ) : (
                    <>
                      {previews.length} people, as {previews.length} separate emails. Each email is addressed only to its recipient, so nobody sees anyone else&apos;s address.
                    </>
                  )}
                </dd>
                <dt className="text-charcoal/70">Attachments</dt>
                <dd className="text-charcoal">{attachments.length ? attachments.map((a) => a.name).join(", ") : "None"}</dd>
                {template && (
                  <>
                    <dt className="text-charcoal/70">Template</dt>
                    <dd className="text-charcoal">{template.label}</dd>
                  </>
                )}
              </dl>

              {previews.length > 1 && (
                <div className="overflow-x-auto rounded-xl border border-charcoal/10">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                        <th scope="col" className="px-3 py-2">Recipient</th>
                        <th scope="col" className="px-3 py-2">Email</th>
                        <th scope="col" className="px-3 py-2">Ready</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/10">
                      {previews.map((p) => (
                        <tr key={p.id} className={cn(p.id === current?.id && "bg-lilac-50")}>
                          <td className="px-3 py-2">
                            <button type="button" className="text-left font-medium text-lilac-700 underline-offset-4 hover:underline" onClick={() => setPreviewFor(p.id)}>
                              {p.name ?? p.email}
                            </button>
                          </td>
                          <td className="break-all px-3 py-2">{p.email}</td>
                          <td className="px-3 py-2">
                            {p.missing.length ? (
                              <StatusPill tone="action">Missing {p.missing.map(tokenLabel).join(", ")}</StatusPill>
                            ) : (
                              <StatusPill tone="ready">Ready</StatusPill>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {current && (
                <article className="rounded-xl border border-charcoal/15 bg-canvas p-4" aria-label="Email preview">
                  <p className="text-xs text-charcoal/70">
                    {previews.length > 1 ? (sameForAll ? "Same wording for everyone" : `Preview for ${current.name ?? current.email}`) : "Preview"}
                  </p>
                  <p className="mt-1 text-base font-semibold text-charcoal">{current.subject}</p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{current.body}</div>
                </article>
              )}

              {blocked.length > 0 && (
                <p role="alert" className="rounded-xl border border-status-attention/40 bg-status-attentionBg px-4 py-3 text-sm text-charcoal">
                  {blocked.length === 1 ? "1 recipient is" : `${blocked.length} recipients are`} missing information shown as [[… fill in]]. Go back to the message to replace those
                  parts, or update the child&apos;s record, then review again.
                </p>
              )}
              {!sender.configured && (
                <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal">
                  Email sending isn&apos;t set up yet, so this can&apos;t be sent. The draft is saved.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 pt-4">
                <button type="button" className="btn-secondary" disabled={Boolean(sending)} onClick={() => setStep(2)}>
                  Back to message
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={Boolean(sending) || blocked.length > 0 || !sender.configured}
                  onClick={() => setConfirm(true)}
                >
                  {sending ? `Sending ${sending.done} of ${sending.total}…` : previews.length === 1 ? "Send email" : `Send ${previews.length} emails`}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title={previews && previews.length > 1 ? `Send ${previews.length} emails?` : "Send this email?"}>
        <div className="flex flex-col gap-4 text-sm text-charcoal">
          <p>
            {previews && previews.length > 1
              ? `Each of the ${previews.length} recipients gets their own email from ${sender.from}.`
              : `This goes to ${previews?.[0]?.email} from ${sender.from}.`}{" "}
            Sent emails can&apos;t be recalled.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button type="button" autoFocus className="btn-primary" onClick={() => void send()}>
              {previews && previews.length > 1 ? `Send ${previews.length} emails` : "Send email"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={pendingTemplate !== null} onClose={() => setPendingTemplate(null)} title="Replace the message?">
        <div className="flex flex-col gap-4 text-sm text-charcoal">
          <p>Starting from a different template replaces the subject and message you&apos;ve written.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPendingTemplate(null)}>
              Keep my message
            </button>
            <button type="button" className="btn-primary" onClick={() => applyTemplate(pendingTemplate || null)}>
              Replace
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={discard} onClose={() => setDiscard(false)} title="Discard this draft?">
        <div className="flex flex-col gap-4 text-sm text-charcoal">
          <p>{rows.length ? `The saved draft${rows.length > 1 ? ` for ${rows.length} recipients` : ""} and its attachments will be deleted.` : "Nothing has been saved yet."}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setDiscard(false)}>
              Keep draft
            </button>
            <button type="button" className="btn-danger" onClick={() => void doDiscard()}>
              Discard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
