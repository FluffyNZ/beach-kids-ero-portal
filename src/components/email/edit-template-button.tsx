"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { updateEmailTemplate } from "@/lib/actions/email";
import type { EmailTemplate } from "@/lib/types";
import { EditIcon } from "@/components/icons";

/** Every one of the 16 seeded templates (migration 0050) is editable from
 * here — the wording seeded by that migration is a starting point, not
 * something locked into the code. Editing changes the template itself
 * (what every future draft from it starts as); it never touches a draft
 * that's already been started from the old wording. */
export function EditTemplateButton({ template }: { template: EmailTemplate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(template.label);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateEmailTemplate(template.key, { label, subject, body });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLabel(template.label);
          setSubject(template.subject);
          setBody(template.body);
          setError(null);
          setOpen(true);
        }}
        aria-label={`Edit ${template.label} template`}
        title="Edit this template"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-charcoal/40 opacity-0 transition-opacity hover:bg-charcoal/5 hover:text-charcoal group-hover:opacity-100"
      >
        <EditIcon className="h-3.5 w-3.5" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit template" size="lg">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Name (shown on the template grid)</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={14} value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="mt-1 text-xs text-charcoal/40">
              A blank line starts a new paragraph. Tokens like <span className="font-mono">{"{{child_name}}"}</span> get filled in
              automatically when someone starts a draft from this template — leave them exactly as they are.
            </p>
          </div>
          {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" disabled={pending} className="btn-primary" onClick={save}>
              {pending ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
