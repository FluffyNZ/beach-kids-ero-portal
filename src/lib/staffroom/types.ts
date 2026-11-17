// Plain, serialisable shapes for the staff-room tablet page. Deliberately in
// their own file (no "server-only" import) so the client components can
// `import type` them without dragging any server code along.

export type ChildContactEntry = {
  id: string;
  name: string;
  relationship: string | null;
  /** Main number. Always null for a Forbidden Access person — their number
   * is never sent to the tablet. */
  phone: string | null;
  /** A second number for the same person (landline / daytime), if any. */
  altPhone: string | null;
  isPrimaryCaregiver: boolean;
  isEmergency: boolean;
  canPickUp: boolean;
  conditionalAccess: boolean;
  /** Must NOT be given access to this child. */
  forbidden: boolean;
  notes: string | null;
};

export type ChildEntry = {
  id: string;
  name: string;
  /** Every contact on file for THIS child (not shared with siblings), with
   * Forbidden Access people first. */
  contacts: ChildContactEntry[];
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
  children: ChildEntry[];
  staff: StaffEntry[];
};
