"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  EmailTemplate,
  EmailRecipientOption,
  FamilyEnquiry,
  EmailMessage,
  EmailReminderKind,
  EmailAttachment,
} from "@/lib/types";
import type { EmailChildSearchResult } from "@/lib/data/email";
import {
  createDraftEmailFromTemplate,
  updateDraftEmail,
  sendEmail,
  deleteDraftEmail,
  addEmailAttachment,
  removeEmailAttachment,
  searchChildrenForCompose,
  fetchRecipientOptions,
  fetchEmailMessage,
} from "@/lib/actions/email";
import { EMAIL_MESSAGE_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { SearchIcon, UploadIcon, CloseIcon } from "@/components/icons";

type Props =
  | { mode: "resume"; draft: EmailMessage }
  | {
      mode: "new";
      template: EmailTemplate;
      initialChild?: EmailChildSearchResult;
      initialRecipientOptions?: EmailRecipientOption[];
      initialEnquiry?: FamilyEnquiry;
      reminderKind?: EmailReminderKind | null;
      reminderDate?: string | null;
    };

type Step = "pick-child" | "pick-recipient" | "creating" | "review";

// A simple client-side mirror of the server's hasUnresolvedPlaceholders
// check (src/lib/email/template-email.ts) — just for showing the warning
// banner as the review step's own text changes; the server re-checks for
// real before ever actually sending, so this one only needs to be a good
// approximation, never the enforcement itself.
function hasPlaceholder(text: string): boolean {
  return /\[\[[\w\s—-]+\]\]/.test(text);
}

/** The whole "template → recipient → review → send" workflow in one place.
 * Which step it starts on depends on how much the caller already knows —
 * see the compose page's four branches (resume / enquiry / child+reminder /
 * template only) — but every path ends up at the same review step, and
 * nothing is ever actually sent until that step's explicit "Send" click. */
export function ComposeWizard(props: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(() => {
    if (props.mode === "resume") return "review";
    if (props.initialEnquiry) return "creating";
    if (props.initialChild && props.initialRecipientOptions) return "pick-recipient";
    return "pick-child";
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // -- Step: pick-child --------------------------------------------------
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmailChildSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedChild, setSelectedChild] = useState<EmailChildSearchResult | null>(props.mode === "new" ? props.initialChild ?? null : null);

  useEffect(() => {
    if (step !== "pick-child") return;
    const handle = setTimeout(() => {
      setSearching(true);
      searchChildrenForCompose(query)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, step]);

  // -- Step: pick-recipient ----------------------------------------------
  const [recipientOptions, setRecipientOptions] = useState<EmailRecipientOption[]>(
    props.mode === "new" ? props.initialRecipientOptions ?? [] : []
  );
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<string | null>(
    (props.mode === "new" ? props.initialRecipientOptions?.[0]?.email : null) ?? null
  );

  function chooseChild(child: EmailChildSearchResult) {
    setError(null);
    setSelectedChild(child);
    startTransition(async () => {
      const options = await fetchRecipientOptions(child.id);
      setRecipientOptions(options);
      setSelectedRecipientEmail(options[0]?.email ?? null);
      setStep("pick-recipient");
    });
  }

  // -- Draft creation + review state --------------------------------------
  const [draftId, setDraftId] = useState<string | null>(props.mode === "resume" ? props.draft.id : null);
  const [status, setStatus] = useState<EmailMessage["status"]>(props.mode === "resume" ? props.draft.status : "draft");
  const [recipientName, setRecipientName] = useState(props.mode === "resume" ? props.draft.recipient_name ?? "" : "");
  const [recipientEmail, setRecipientEmail] = useState(props.mode === "resume" ? props.draft.recipient_email : "");
  const [subject, setSubject] = useState(props.mode === "resume" ? props.draft.subject : "");
  const [body, setBody] = useState(props.mode === "resume" ? props.draft.body : "");
  const [attachments, setAttachments] = useState<EmailAttachment[]>(props.mode === "resume" ? props.draft.attachments : []);
  const [errorMessage, setErrorMessage] = useState<string | null>(props.mode === "resume" ? props.draft.error_message : null);
  const [sentAt, setSentAt] = useState<string | null>(props.mode === "resume" ? props.draft.sent_at : null);

  const createdOnceRef = useRef(false);

  function createFromTemplate(childId: string | null, familyEnquiryId: string | null, recEmail: string, recName: string | null) {
    if (props.mode !== "new") return;
    setError(null);
    startTransition(async () => {
      const result = await createDraftEmailFromTemplate({
        templateKey: props.template.key,
        childId,
        familyEnquiryId,
        recipientEmail: recEmail,
        recipientName: recName,
        reminderKind: props.reminderKind ?? null,
        reminderEventDate: props.reminderDate ?? null,
      });
      if (!result.success) {
        setError(result.error);
        setStep(childId ? "pick-recipient" : "pick-child");
        return;
      }
      const msg = await fetchEmailMessage(result.id);
      if (!msg) {
        setError("Created the draft but couldn't load it back — try refreshing.");
        return;
      }
      setDraftId(msg.id);
      setStatus(msg.status);
      setRecipientName(msg.recipient_name ?? "");
      setRecipientEmail(msg.recipient_email);
      setSubject(msg.subject);
      setBody(msg.body);
      setAttachments(msg.attachments);
      setErrorMessage(msg.error_message);
      setSentAt(msg.sent_at);
      setStep("review");
    });
  }

  // Enquiry-origin drafts have exactly one possible recipient (the enquiry's
  // own email) — nothing to choose, so this fires once on mount instead of
  // waiting for a step the user would have nothing to do on.
  useEffect(() => {
    if (step !== "creating" || createdOnceRef.current) return;
    if (props.mode !== "new" || !props.initialEnquiry) return;
    createdOnceRef.current = true;
    createFromTemplate(null, props.initialEnquiry.id, props.initialEnquiry.parent_email, props.initialEnquiry.parent_full_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function confirmRecipient() {
    if (props.mode !== "new" || !selectedChild) return;
    const chosen = recipientOptions.find((o) => o.email === selectedRecipientEmail);
    if (!chosen) {
      setError("Choose who this email is going to first.");
      return;
    }
    createFromTemplate(selectedChild.id, null, chosen.email, chosen.name);
  }

  // -- Review step: save / send / attachments -----------------------------
  const [savePending, setSavePending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendPending, setSendPending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unresolved = hasPlaceholder(subject) || hasPlaceholder(body);
  const isDraftEditable = status === "draft" || status === "failed";

  async function saveDraft(): Promise<boolean> {
    if (!draftId) return false;
    setSaved(false);
    setSavePending(true);
    const result = await updateDraftEmail(draftId, {
      recipient_name: recipientName || null,
      recipient_email: recipientEmail,
      subject,
      body,
    });
    setSavePending(false);
    if (!result.success) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    return true;
  }

  function handleSend() {
    if (!draftId) return;
    setSendError(null);
    setSendPending(true);
    (async () => {
      const savedOk = await saveDraft();
      if (!savedOk) {
        setSendPending(false);
        return;
      }
      const result = await sendEmail(draftId);
      setSendPending(false);
      if (!result.success) {
        setSendError(result.error);
        setStatus("failed");
        return;
      }
      setStatus("sent");
      setSentAt(new Date().toISOString());
      router.refresh();
    })();
  }

  function handleDeleteDraft() {
    if (!draftId) return;
    startTransition(async () => {
      await deleteDraftEmail(draftId);
      router.push("/email");
    });
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draftId) return;
    setAttachError(null);
    setUploadPending(true);
    const fd = new FormData();
    fd.append("file", file);
    addEmailAttachment(draftId, fd)
      .then((result) => {
        if (result.success) setAttachments(result.attachments);
        else setAttachError(result.error);
      })
      .finally(() => {
        setUploadPending(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  function handleRemoveAttachment(storagePath: string) {
    if (!draftId) return;
    setAttachError(null);
    removeEmailAttachment(draftId, storagePath).then((result) => {
      if (result.success) setAttachments(result.attachments);
      else setAttachError(result.error);
    });
  }

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  const templateLabel = props.mode === "new" ? props.template.label : props.draft.template_label ?? "Email";
  // Friendly "who/what this is about" line under the title — whichever of
  // these is actually known at this point in the flow.
  const contextLabel =
    props.mode === "resume"
      ? props.draft.child_name
      : selectedChild?.full_name ?? props.initialEnquiry?.child_full_name ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Compose</p>
          <h1 className="font-display text-xl font-bold text-charcoal">{templateLabel}</h1>
          {contextLabel && <p className="text-sm text-charcoal/50">For {contextLabel}</p>}
        </div>
        <Link href="/email" className="btn-ghost">
          Cancel
        </Link>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      {step === "pick-child" && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-charcoal">Who&apos;s this email for?</h2>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              autoFocus
              className="input pl-9"
              placeholder="Search for a child by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col divide-y divide-charcoal/5">
            {searching && <p className="py-3 text-sm text-charcoal/40">Searching…</p>}
            {!searching && query && results.length === 0 && <p className="py-3 text-sm text-charcoal/40">No children found.</p>}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseChild(c)}
                className="flex items-center justify-between gap-3 py-2.5 text-left hover:bg-charcoal/[0.03]"
              >
                <span className="text-sm font-medium text-charcoal">{c.full_name}</span>
                <span className="text-xs text-charcoal/45">
                  {c.room_name ?? "No room set"}
                  {c.status === "left" ? " · No longer attending" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "pick-recipient" && (
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold text-charcoal">
            Who should this go to{selectedChild ? ` — for ${selectedChild.full_name}` : ""}?
          </h2>
          {recipientOptions.length === 0 ? (
            <div className="rounded-lg bg-status-attentionBg px-3 py-3 text-sm text-status-attention">
              No email address on file for this family yet.{" "}
              {selectedChild && (
                <Link href={`/children/${selectedChild.id}`} className="font-medium underline">
                  Add one on their profile
                </Link>
              )}{" "}
              before sending.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recipientOptions.map((o) => (
                <label
                  key={`${o.source}-${o.id ?? o.email}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-charcoal/10 px-3 py-2.5 hover:bg-charcoal/[0.03]"
                >
                  <input
                    type="radio"
                    name="recipient"
                    checked={selectedRecipientEmail === o.email}
                    onChange={() => setSelectedRecipientEmail(o.email)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-charcoal">
                      {o.name}
                      {o.relationship ? ` · ${o.relationship}` : ""}
                    </span>
                    <span className="block text-xs text-charcoal/50">{o.email}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-between gap-2">
            {!(props.mode === "new" && props.initialChild) && (
              <button type="button" className="btn-ghost" onClick={() => setStep("pick-child")}>
                Back
              </button>
            )}
            <button
              type="button"
              disabled={pending || recipientOptions.length === 0}
              className="btn-primary ml-auto"
              onClick={confirmRecipient}
            >
              {pending ? "Starting draft…" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === "creating" && <div className="card p-8 text-center text-sm text-charcoal/50">Starting this draft…</div>}

      {step === "review" && draftId && (
        <div className="flex flex-col gap-4">
          {status === "sent" && (
            <div className="rounded-lg bg-status-readyBg px-3 py-2 text-sm text-status-ready">
              Sent{sentAt ? ` on ${formatDateTime(sentAt)}` : ""}.
            </div>
          )}
          {status === "failed" && errorMessage && (
            <div className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">
              Sending failed: {errorMessage}. Fix the issue below and try again.
            </div>
          )}
          {status === "sending" && (
            <div className="rounded-lg bg-status-attentionBg px-3 py-2 text-sm text-status-attention">Sending…</div>
          )}
          {unresolved && isDraftEditable && (
            <div className="rounded-lg bg-status-attentionBg px-3 py-2 text-sm text-status-attention">
              This email still has a <span className="font-mono">[[ fill in ]]</span> placeholder — it can&apos;t be sent until every one is
              replaced.
            </div>
          )}

          <div className="card flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Recipient name</label>
                <input
                  className="input"
                  value={recipientName}
                  disabled={!isDraftEditable}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    setSaved(false);
                  }}
                />
              </div>
              <div>
                <label className="label">Recipient email</label>
                <input
                  type="email"
                  className="input"
                  value={recipientEmail}
                  disabled={!isDraftEditable}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setSaved(false);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                value={subject}
                disabled={!isDraftEditable}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setSaved(false);
                }}
              />
            </div>

            <div>
              <label className="label">Message</label>
              <textarea
                className="input"
                rows={12}
                value={body}
                disabled={!isDraftEditable}
                onChange={(e) => {
                  setBody(e.target.value);
                  setSaved(false);
                }}
              />
              <p className="mt-1 text-xs text-charcoal/40">A blank line starts a new paragraph.</p>
            </div>

            <div>
              <label className="label">Attachments</label>
              <p className="mb-2 text-xs text-charcoal/40">
                Added directly to this email — they only ever go to this one family, never anyone else&apos;s.
              </p>
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-col gap-1.5">
                  {attachments.map((a) => (
                    <div key={a.storage_path} className="flex items-center justify-between gap-2 rounded-lg border border-charcoal/10 px-3 py-2">
                      <span className="truncate text-sm text-charcoal">{a.name}</span>
                      {isDraftEditable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(a.storage_path)}
                          className="shrink-0 rounded-full p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-status-action"
                          aria-label={`Remove ${a.name}`}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isDraftEditable && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                  <button
                    type="button"
                    disabled={uploadPending}
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    {uploadPending ? "Uploading…" : "Attach a file"}
                  </button>
                </>
              )}
              {attachError && <p className="mt-1 text-xs text-status-action">{attachError}</p>}
            </div>
          </div>

          {sendError && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{sendError}</p>}

          <div className="flex items-center justify-between gap-2">
            {isDraftEditable ? (
              <button type="button" className="btn-ghost text-status-action" onClick={handleDeleteDraft}>
                Delete draft
              </button>
            ) : (
              <Link href="/email" className="btn-ghost">
                Back to Email
              </Link>
            )}
            {isDraftEditable && (
              <div className="flex items-center gap-2">
                <button type="button" disabled={savePending} className="btn-secondary" onClick={() => saveDraft()}>
                  {savePending ? "Saving…" : saved ? "Saved ✓" : "Save draft"}
                </button>
                <button type="button" disabled={sendPending || unresolved} className="btn-primary" onClick={handleSend}>
                  {sendPending ? "Sending…" : status === "failed" ? "Retry send" : "Send"}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-charcoal/40">
            Status: {EMAIL_MESSAGE_STATUS_LABEL[status]}
          </p>
        </div>
      )}
    </div>
  );
}
