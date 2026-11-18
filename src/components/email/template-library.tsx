"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { updateEmailTemplate } from "@/lib/actions/email";
import { TEMPLATE_GROUPS, TOKEN_INFO, splitTokens, templateDescription, tokenLabel, tokensIn } from "@/lib/email-format";
import { fmtDateTime } from "@/lib/finance-format";
import type { EmailTemplate } from "@/lib/types";

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {splitTokens(text).map((p, i) =>
        p.token ? (
          <mark key={i} className="rounded bg-lilac-100 px-1 text-charcoal" title={TOKEN_INFO[p.token]?.source}>
            {tokenLabel(p.token)}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function TemplateEditor({ template, onDone }: { template: EmailTemplate; onDone: () => void }) {
  const router = useRouter();
  const busy = useRef(false);
  const [label, setLabel] = useState(template.label);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [state, setState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });
  const unknown = tokensIn(subject, body).filter((t) => !TOKEN_INFO[t]);

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setState({ saving: true, error: null });
    const res = await updateEmailTemplate(template.key, { label, subject, body });
    busy.current = false;
    if (!res.success) {
      setState({ saving: false, error: res.error });
      return;
    }
    setState({ saving: false, error: null });
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium text-charcoal">
          Name
        </label>
        <input id="tpl-name" className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div>
        <label htmlFor="tpl-subject" className="mb-1.5 block text-sm font-medium text-charcoal">
          Subject
        </label>
        <input id="tpl-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label htmlFor="tpl-body" className="mb-1.5 block text-sm font-medium text-charcoal">
          Message
        </label>
        <textarea id="tpl-body" className="input min-h-[16rem] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-charcoal/70">
          Fields in {"{{double braces}}"} are filled in for each recipient — keep them exactly as written. Changes apply to new emails only.
        </p>
      </div>
      {unknown.length > 0 && (
        <p role="alert" className="rounded-xl border border-status-attention/40 bg-status-attentionBg px-3 py-2 text-sm text-charcoal">
          {unknown.map((u) => `{{${u}}}`).join(", ")} isn&apos;t a field Earlydesk can fill in, so it would need replacing every time.
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" disabled={state.saving} onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="btn-primary" disabled={state.saving} onClick={save}>
          {state.saving ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}

/** Templates grouped by purpose, with a preview of each and a way to start
 * an email from it. */
export function TemplateLibrary({ templates, childId }: { templates: EmailTemplate[]; childId?: string }) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      templates.filter(
        (t) => !q || t.label.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || templateDescription(t.key, t.body).toLowerCase().includes(q)
      ),
    [templates, q]
  );
  const open = templates.find((t) => t.key === openKey) ?? null;
  const close = useCallback(() => {
    setOpenKey(null);
    setEditing(false);
  }, []);
  const composeHref = (key: string) => `/email/compose?template=${key}${childId ? `&childId=${childId}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <label htmlFor="template-search" className="sr-only">
          Search templates
        </label>
        <input id="template-search" type="search" className="input" placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {visible.length === 0 && <EmptyState title="No templates match" description="Try another word, or start a blank email." />}

      {TEMPLATE_GROUPS.map((g) => {
        const items = visible.filter((t) => t.category === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} aria-labelledby={`grp-${g.key}`} className="flex flex-col gap-3">
            <div>
              <h2 id={`grp-${g.key}`} className="text-base font-semibold text-charcoal">
                {g.label}
              </h2>
              <p className="text-sm text-charcoal/70">{g.description}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => {
                const fields = tokensIn(t.subject, t.body);
                return (
                  <li key={t.key} className="flex flex-col gap-2 rounded-2xl border border-charcoal/10 bg-white p-4">
                    <h3 className="text-sm font-semibold text-charcoal">{t.label}</h3>
                    <p className="text-sm text-charcoal/70">{templateDescription(t.key, t.body)}</p>
                    {fields.length > 0 && (
                      <p className="text-xs text-charcoal/70">
                        Fills in: {fields.map(tokenLabel).join(", ").toLowerCase()}
                        {fields.some((f) => TOKEN_INFO[f]?.manual) && " (some typed in when composing)"}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setOpenKey(t.key)}>
                        Preview<span className="sr-only"> {t.label}</span>
                      </button>
                      <Link href={composeHref(t.key)} className="btn-primary px-3 py-1.5">
                        Use template<span className="sr-only"> {t.label}</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <Drawer
        open={open !== null}
        onRequestClose={close}
        title={open ? (editing ? `Edit ${open.label}` : open.label) : "Template"}
        description={open ? `${TEMPLATE_GROUPS.find((g) => g.key === open.category)?.label ?? ""} · updated ${fmtDateTime(open.updated_at)}` : undefined}
        footer={
          open && !editing ? (
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                Edit template
              </button>
              <Link href={composeHref(open.key)} className="btn-primary">
                Use template
              </Link>
            </div>
          ) : undefined
        }
      >
        {open &&
          (editing ? (
            <TemplateEditor key={open.key} template={open} onDone={() => setEditing(false)} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-charcoal/70">Highlighted words are filled in for each recipient.</p>
              <article className="rounded-xl border border-charcoal/15 bg-canvas p-4">
                <p className="text-base font-semibold text-charcoal">
                  <Highlighted text={open.subject} />
                </p>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                  <Highlighted text={open.body} />
                </div>
              </article>
              {tokensIn(open.subject, open.body).length > 0 && (
                <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {tokensIn(open.subject, open.body).map((t) => (
                    <div key={t} className="contents">
                      <dt className="text-charcoal">{tokenLabel(t)}</dt>
                      <dd className="text-charcoal/70">{TOKEN_INFO[t]?.source ?? "Not a known field"}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
      </Drawer>
    </div>
  );
}
