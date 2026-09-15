"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkImportOutgoings, type BulkOutgoingImportRow } from "@/lib/actions/finances";

/** Pastes a JSON array of outgoing rows (matching BulkOutgoingImportRow) and
 * imports them in one go. Meant for bringing in a real accounting export
 * (e.g. Xero) rather than typing hundreds of rows through the Add outgoing
 * form one at a time. Safe to re-run — rows already imported (matched by
 * external_id) are skipped, not duplicated. */
export function ImportOutgoingsForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skippedDuplicates: number } | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  function handleChange(value: string) {
    setText(value);
    setResult(null);
    setError(null);
    try {
      const parsed = value.trim() ? JSON.parse(value) : null;
      setParsedCount(Array.isArray(parsed) ? parsed.length : null);
    } catch {
      setParsedCount(null);
    }
  }

  function handleImport() {
    setError(null);
    setResult(null);
    let rows: BulkOutgoingImportRow[];
    try {
      rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error("Expected a JSON array of rows.");
    } catch (err) {
      setError(err instanceof Error ? `Could not parse that as JSON: ${err.message}` : "Could not parse that as JSON.");
      return;
    }

    startTransition(async () => {
      try {
        const outcome = await bulkImportOutgoings(rows);
        setResult(outcome);
        setText("");
        setParsedCount(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong during the import.");
      }
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div>
        <label className="label" htmlFor="import-json">
          Paste the export as JSON
        </label>
        <textarea
          id="import-json"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={10}
          className="input font-mono text-xs"
          placeholder='[{"external_id": "BK-OUT-0001", "expense_date": "2026-06-01", "supplier": "...", "amount": 46.75, ...}]'
        />
        <p className="mt-1 text-xs text-charcoal/50">
          Each row needs at least <code>external_id</code>, <code>expense_date</code> and <code>amount</code>. Rows
          whose <code>external_id</code> has already been imported are skipped automatically, so it&apos;s safe to
          paste an updated export here again later.
          {parsedCount !== null && <> Parsed {parsedCount} row{parsedCount === 1 ? "" : "s"} so far.</>}
        </p>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}
      {result && (
        <p className="rounded-lg bg-status-readyBg px-3 py-2 text-sm text-status-ready">
          Imported {result.inserted} new outgoing{result.inserted === 1 ? "" : "s"}
          {result.skippedDuplicates > 0 ? `, skipped ${result.skippedDuplicates} already in the ledger.` : "."}
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={handleImport} disabled={pending || !text.trim()} className="btn-primary">
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
