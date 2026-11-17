import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidStaffroomSession } from "./session";
import type { ChildContactEntry, ChildEntry, RoomGroup, StaffroomDirectory } from "./types";

// Reads children's contacts for the contacts (PIN) page, grouped by room.
//
// This uses the service-role (admin) client on purpose: the PIN page has no
// Supabase login of its own (see session.ts), so the normal RLS-governed
// client would see nothing. That makes this file the one place that bypasses
// RLS for this feature, so the guard rails are strict:
//   1. It refuses to run at all unless the request carries a valid, unexpired
//      contacts-PIN session — the page checks too, this is the backstop.
//   2. It only ever reads three things: active children's names and rooms,
//      room names, and those children's contacts. Every query names its
//      columns explicitly — no staff, fees, health or other records are read,
//      so none of it can ever reach the PIN page.
//   3. A Forbidden Access person's phone numbers are dropped here, before
//      anything is sent to the browser.

type ChildRow = { id: string; full_name: string; room_id: string | null };
type RoomRow = { id: string; name: string; sort_order: number | null };
type ChildContactRow = {
  id: string;
  child_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  alt_phone: string | null;
  is_primary_caregiver: boolean;
  is_emergency_contact: boolean;
  can_pick_up: boolean;
  conditional_access: boolean;
  forbidden_access: boolean;
  notes: string | null;
};

const NO_ROOM_ID = "no-room";

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-NZ", { sensitivity: "base" });
}

/** Forbidden Access people first (so the warning is the first thing read),
 * then primary caregivers, then emergency contacts, then everyone else. */
function contactRank(contact: ChildContactEntry): number {
  if (contact.forbidden) return 0;
  if (contact.isPrimaryCaregiver) return 1;
  if (contact.isEmergency) return 2;
  return 3;
}

function toEntry(row: ChildContactRow): ChildContactEntry {
  const forbidden = Boolean(row.forbidden_access);
  return {
    id: row.id,
    name: row.full_name.trim(),
    relationship: clean(row.relationship),
    // A Forbidden Access person's number never leaves the server — the page
    // only needs their name, to warn staff.
    phone: forbidden ? null : clean(row.phone),
    altPhone: forbidden ? null : clean(row.alt_phone),
    isPrimaryCaregiver: Boolean(row.is_primary_caregiver),
    // Forbidden always wins over the other markers, even if a row were
    // somehow saved with both.
    isEmergency: !forbidden && Boolean(row.is_emergency_contact),
    canPickUp: !forbidden && Boolean(row.can_pick_up),
    conditionalAccess: Boolean(row.conditional_access),
    forbidden,
    notes: clean(row.notes),
  };
}

export async function getStaffroomDirectory(): Promise<StaffroomDirectory> {
  if (!hasValidStaffroomSession()) {
    throw new Error("The contacts page is locked.");
  }

  const admin = createAdminClient();

  const [childResult, roomResult] = await Promise.all([
    admin.from("children").select("id, full_name, room_id").eq("status", "active"),
    admin.from("roster_rooms").select("id, name, sort_order"),
  ]);
  if (childResult.error) throw new Error(`Could not load children: ${childResult.error.message}`);
  if (roomResult.error) throw new Error(`Could not load rooms: ${roomResult.error.message}`);

  const childRows = (childResult.data ?? []) as ChildRow[];
  const roomRows = (roomResult.data ?? []) as RoomRow[];

  let contactRows: ChildContactRow[] = [];
  if (childRows.length > 0) {
    const contactResult = await admin
      .from("child_contacts")
      .select(
        "id, child_id, full_name, relationship, phone, alt_phone, is_primary_caregiver, is_emergency_contact, can_pick_up, conditional_access, forbidden_access, notes"
      )
      .in(
        "child_id",
        childRows.map((c) => c.id)
      );
    if (contactResult.error) throw new Error(`Could not load children's contacts: ${contactResult.error.message}`);
    contactRows = (contactResult.data ?? []) as ChildContactRow[];
  }

  const contactsByChild = new Map<string, ChildContactEntry[]>();
  contactRows.forEach((row) => {
    const list = contactsByChild.get(row.child_id) ?? [];
    list.push(toEntry(row));
    contactsByChild.set(row.child_id, list);
  });

  const roomById = new Map<string, RoomRow>(roomRows.map((r): [string, RoomRow] => [r.id, r]));
  const groups = new Map<string, RoomGroup>();

  childRows.forEach((child) => {
    const room = child.room_id ? roomById.get(child.room_id) : undefined;
    const groupId = room ? room.id : NO_ROOM_ID;
    const group = groups.get(groupId) ?? { id: groupId, name: room ? room.name : "No room set", children: [] };
    const entry: ChildEntry = {
      id: child.id,
      name: child.full_name.trim(),
      contacts: (contactsByChild.get(child.id) ?? [])
        .slice()
        .sort((a, b) => contactRank(a) - contactRank(b) || byName(a.name, b.name)),
    };
    group.children.push(entry);
    groups.set(groupId, group);
  });

  const rooms = Array.from(groups.values())
    .map((group) => ({ ...group, children: group.children.slice().sort((a, b) => byName(a.name, b.name)) }))
    .sort((a, b) => {
      // Rooms in the centre's own order (the roster's sort order); "No room
      // set" always last.
      if (a.id === NO_ROOM_ID) return 1;
      if (b.id === NO_ROOM_ID) return -1;
      const orderA = roomById.get(a.id)?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = roomById.get(b.id)?.sort_order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || byName(a.name, b.name);
    });

  return { rooms };
}
