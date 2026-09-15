"use client";

import { useRef } from "react";

const COMMANDS: Array<{ command: string; label: string; title: string }> = [
  { command: "bold", label: "B", title: "Bold" },
  { command: "italic", label: "I", title: "Italic" },
  { command: "insertUnorderedList", label: "•", title: "Bullet list" },
];

/** A lightweight rich-text block — bold, italic, bullet lists and links,
 * plus normal Unicode text (so Māori macrons just work with no special
 * handling needed). Stores sanitized-on-render HTML. No new editor
 * dependency: this uses the browser's own contentEditable + execCommand,
 * which is more than enough for a learning story's body text. */
export function RichTextBlock({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command, false);
    onChange(ref.current?.innerHTML ?? "");
  }

  function addLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    ref.current?.focus();
    document.execCommand("createLink", false, url);
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        {COMMANDS.map((c) => (
          <button
            key={c.command}
            type="button"
            title={c.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(c.command)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-charcoal/15 text-xs font-semibold text-charcoal/70 hover:bg-sand-100"
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-charcoal/15 text-xs font-semibold text-charcoal/70 hover:bg-sand-100"
        >
          🔗
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        onBlur={() => onChange(ref.current?.innerHTML ?? "")}
        className="input min-h-[90px] cursor-text [&_a]:text-burgundy-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
