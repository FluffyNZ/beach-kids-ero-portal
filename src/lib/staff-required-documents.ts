import { getRequiredStaffDocumentCategories } from "@/lib/constants";
import type { StaffDocument } from "@/lib/types";
import type { StaffDocumentCategory, StaffQualificationStatus } from "@/lib/supabase/database.types";

export type RequiredDocumentSlot = {
  category: StaffDocumentCategory;
  document: StaffDocument | null;
};

/** Picks the most recent document per category — `documents` is expected
 * already sorted newest-first (as getStaffById returns it), so the first
 * match per category is the current file for that slot. */
function latestByCategory(documents: StaffDocument[]): Map<StaffDocumentCategory, StaffDocument> {
  const map = new Map<StaffDocumentCategory, StaffDocument>();
  for (const d of documents) {
    if (!map.has(d.category)) map.set(d.category, d);
  }
  return map;
}

/** The required-document slots for this person's profile — 8 for everyone,
 * plus 2 more once they're ticked "Qualified" — each paired with whatever
 * file currently satisfies it, or null if it's still missing. */
export function getRequiredDocumentSlots(
  qualificationStatus: StaffQualificationStatus,
  documents: StaffDocument[]
): RequiredDocumentSlot[] {
  const latest = latestByCategory(documents);
  return getRequiredStaffDocumentCategories(qualificationStatus).map((category) => ({
    category,
    document: latest.get(category) ?? null,
  }));
}

/** How many of the required slots are actually filled — used for both the
 * ring on the profile page and the "Profile X%" figure shown elsewhere. */
export function countRequiredDocuments(
  qualificationStatus: StaffQualificationStatus,
  documents: StaffDocument[]
): { completed: number; total: number } {
  const required = getRequiredStaffDocumentCategories(qualificationStatus);
  const present = new Set(documents.map((d) => d.category));
  return { completed: required.filter((c) => present.has(c)).length, total: required.length };
}

/** Anything on file that isn't one of the required categories — first aid,
 * visa/work entitlement, etc. — so nothing already uploaded goes missing
 * from view just because it's not part of the required set. */
export function getOtherDocuments(
  qualificationStatus: StaffQualificationStatus,
  documents: StaffDocument[]
): StaffDocument[] {
  const required = new Set(getRequiredStaffDocumentCategories(qualificationStatus));
  return documents.filter((d) => !required.has(d.category));
}
