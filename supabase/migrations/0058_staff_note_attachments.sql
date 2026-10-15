-- Beach Kids ERO Self-Audit Portal
-- Migration 0058: Staff note attachments — lets a dated management note
-- (see 0055_staff_notes.sql) optionally carry one file, e.g. a PDF of
-- correspondence the note refers to. One attachment per note, matching the
-- existing one-note-at-a-time form, rather than a separate attachments
-- table — a note needing a second file can just be a second note.
--
-- Reuses the existing private 'staff-documents' bucket and its
-- authenticated read/write/delete policies (see 0005_staff.sql) rather than
-- creating a new bucket — its allowed_mime_types (PDF, Word doc, PNG/JPEG)
-- already cover exactly what notes need to attach, and the same
-- getSignedStaffDocumentUrl helper/action can serve note attachments too
-- since it only ever takes a storage path.
--
-- Run this AFTER 0057_email_messages_staff.sql.

alter table staff_notes
  add column if not exists storage_path text unique,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint;
