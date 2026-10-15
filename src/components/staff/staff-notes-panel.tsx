"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaffNote, deleteStaffNote } from "@/lib/actions/staff";
import type { StaffNoteAttachmentFields } from "@/lib/actions/staff";
import { createClient } from "@/lib/supabase/client";
import { StaffDocumentRowActions } from "./staff-document-row-actions";
import { DocumentIcon, TrashIcon } from "@/components/icons";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import type { StaffNote, StaffAccessLevel } from "@/lib/types";

// Same bucket, same direct-from-browser upload pattern as
// AddStaffDocumentModal — avoids Vercel's ~4.5MB serverless request-body
// limit for a scanned PDF or photo, and reuses the bucket's existing
// allowed_mime_types rather than needing a new bucket (see migration 0058).
const STAFF_DOCUMENTS_BUCKET = process.env.NEXT_PUBLIC_STAFF_DOCUMENTS_BUCKET || "staff-documents";
const ALLOWED_ATTACHMENT_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

function safeStoragePath(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`;
}

/** Dated management notes, each showing who added it — restricted to
 * authorised management, per the brief's "confidential notes" requirement.
 * A restricted viewer never even receives the real `notes` array from the
 * server (see getStaffById) — this component just renders whatever
 * accessLevel/notes it's handed, so there's one clear place that decides
 * what gets shown.
 *
 * Each note can optionally carry one file (e.g. a PDF of correspondence it
 * refers to) — see migration 0058 and addStaffNote's attachment param. */
export function StaffNotesPanel({
  staffId,
  notes,
  accessLevel,
}: {
  staffId: string;
  notes: StaffNote[];
  accessLevel: StaffAccessLevel;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (accessLevel !== "full") {
    return (
      <div className="card flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-charcoal">Restricted — authorised management only</p>
        <p className="max-w-sm text-sm text-charcoal/50">
          Notes on this profile are confidential and only visible to authorised management accounts.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let attachment: StaffNoteAttachmentFields | null = null;

      if (file) {
        try {
          const supabase = createClient();
          const storagePath = safeStoragePath(file);
          const { error: uploadError } = await supabase.storage
            .from(STAFF_DOCUMENTS_BUCKET)
            .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });

          if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`);
            return;
          }

          attachment = {
            storage_path: storagePath,
            original_filename: file.name,
            mime_type: file.type || null,
            file_size_bytes: file.size,
          };
        } catch (err) {
          setError(err instanceof Error ? `Upload failed: ${err.message}` : "Something went wrong uploading this file.");
          return;
        }
      }

      const result = await addStaffNote(staffId, body, attachment);
      if (!result.success) {
        // The file (if any) made it to storage but the note row didn't —
        // clean up rather than leaving an orphaned file behind.
        if (attachment) {
          const supabase = createClient();
          await supabase.storage.from(STAFF_DOCUMENTS_BUCKET).remove([attachment.storage_path]);
        }
        setError(result.error);
        return;
      }

      setBody("");
      setFile(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} className="card flex flex-col gap-2 p-4" onSubmit={handleSubmit}>
        <label className="label">Add a note</label>
        <textarea className="input min-h-[70px]" value={body} onChange={(e) => setBody(e.target.value)} />

        <div>
          <label className="label" htmlFor="note-attachment">
            Attach a file (optional)
          </label>
          <input
            id="note-attachment"
            type="file"
            accept={ALLOWED_ATTACHMENT_TYPES}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-burgundy-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-burgundy-600"
          />
          <p className="mt-1 text-xs text-charcoal/40">PDF, Word doc or photo. Up to 50MB.</p>
        </div>

        {error && <p className="text-xs text-status-action">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !body.trim()} className="btn-primary">
            {pending ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-charcoal/50">No notes recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm text-charcoal">{n.body}</p>
                <p className="mt-1.5 text-xs text-charcoal/40">
                  {formatDateTime(n.created_at)}
                  {n.created_by_name ? ` · ${n.created_by_name}` : ""}
                </p>
                {n.storage_path && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-charcoal/10 px-2.5 py-1.5">
                    <DocumentIcon className="h-4 w-4 shrink-0 text-charcoal/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-charcoal">{n.original_filename}</p>
                      {n.file_size_bytes != null && (
                        <p className="text-xs text-charcoal/40">{formatFileSize(n.file_size_bytes)}</p>
                      )}
                    </div>
                    <StaffDocumentRowActions storagePath={n.storage_path} />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                className="shrink-0 rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
                onClick={() =>
                  startTransition(async () => {
                    await deleteStaffNote(staffId, n.id);
                    router.refresh();
                  })
                }
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
