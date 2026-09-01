"use client";

import { useEffect, useRef, useState } from "react";

export function NotesField({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (notes: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending debounce timer if the user navigates away mid-type.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave(next).then(() => setStatus("saved"));
    }, 800);
  }

  return (
    <div>
      <textarea
        className="input min-h-[120px] resize-y"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Management notes for this criterion…"
      />
      <p className="mt-1 text-xs text-ocean-400">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "idle" && "Autosaves as you type"}
      </p>
    </div>
  );
}
