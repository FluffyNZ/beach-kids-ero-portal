// Plain, serialisable shapes for the staff-room tablet page. Deliberately in
// their own file (no "server-only" import) so the client components can
// `import type` them without dragging any server code along.

export type DirectoryContact = {
  name: string;
  /** Free text from the family contact's "relationship" field (or "Bill
   * payer" for the family's bill payer). */
  relationship: string | null;
  phone: string;
  /** True when the relationship text mentions "emergency" — that's the only
   * convention used to tell an emergency contact from a parent/guardian,
   * since the database has no separate flag for it. */
  isEmergency: boolean;
};

export type FamilyEntry = {
  /** Stable key: the bill payer's id, or "child:<id>" for a child with no
   * family linked yet. */
  key: string;
  /** Every active child in this family, alphabetical — siblings share one
   * card rather than repeating the same numbers. */
  children: string[];
  contacts: DirectoryContact[];
};

export type StaffEntry = {
  id: string;
  name: string;
  role: string | null;
  mobile: string | null;
  emergency: {
    name: string;
    relationship: string | null;
    phone: string | null;
  } | null;
};

export type StaffroomDirectory = {
  families: FamilyEntry[];
  staff: StaffEntry[];
};
