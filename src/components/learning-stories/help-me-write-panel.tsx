"use client";

import { useState, useTransition } from "react";
import { assistWithStory, type AssistKind } from "@/lib/actions/learning-stories";

const ACTIONS: Array<{ kind: AssistKind; label: string }> = [
  { kind: "create_draft", label: "Create Draft" },
  { kind: "improve_writing", label: "Improve Writing" },
  { kind: "check_spelling", label: "Check Spelling & Grammar" },
  { kind: "make_natural", label: "Make More Natural" },
  { kind: "suggest_te_whariki", label: "Suggest Te Whāriki Links" },
  { kind: "suggest_tags", label: "Suggest Learning Tags" },
  { kind: "suggest_next_steps", label: "Suggest Possible Next Steps" },
];

/** Supports the educator's own writing — it never publishes anything and
 * never invents facts, and every suggestion here has to be read and acted
 * on by a person: Te Whāriki/tag suggestions are shown as text to review
 * against the actual pickers above, not auto-attached. */
export function HelpMeWritePanel({ onInsertParagraph }: { onInsertParagraph: (html: string) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(kind: AssistKind) {
    setError(null);
    setResult(null);
    setNotConfigured(false);
    startTransition(async () => {
      const res = await assistWithStory(kind, input);
      if (!res.success) {
        setError(res.error);
        setNotConfigured(Boolean(res.notConfigured));
        return;
      }
      setResult(res.text);
    });
  }

  return (
    <div className="rounded-xl border border-burgundy-100 bg-burgundy-50/40 p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-semibold text-burgundy-700">
        ✨ Help Me Write {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-charcoal/60">
            Paste rough notes about what happened, or text you'd like help with. Everything it produces is an
            editable draft you review — it never invents details you haven't supplied, and it never publishes
            anything on its own.
          </p>
          <textarea
            className="input min-h-[100px]"
            placeholder={'e.g. "Aterea was playing soccer with Finn and two other children. He organised teams and encouraged everyone. He helped Finn when he fell over."'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button key={a.kind} type="button" disabled={pending} onClick={() => run(a.kind)} className="btn-secondary text-xs">
                {a.label}
              </button>
            ))}
          </div>

          {pending && <p className="text-xs text-charcoal/50">Thinking…</p>}

          {error && (
            <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">
              {error}
              {notConfigured && (
                <>
                  {" "}
                  (This needs an <code>ANTHROPIC_API_KEY</code> added to the app&apos;s environment — ask whoever
                  manages deployment.)
                </>
              )}
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-2">
              <textarea className="input min-h-[120px]" value={result} onChange={(e) => setResult(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => {
                    onInsertParagraph(result.replace(/\n/g, "<br/>"));
                    setResult(null);
                  }}
                >
                  Insert as a text block
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
