import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, addMonths, mondayOfDateString } from "@/lib/utils";
import { getNzPublicHolidaysInRange } from "@/lib/nz-public-holidays";
import type { CalendarDay, CalendarEvent, StaffLeave } from "@/lib/types";
import type { StaffLeaveType } from "@/lib/supabase/database.types";

export type CalendarWeek = {
  weekStartDate: string;
  days: CalendarDay[];
};

const STAFF_PHOTO_BUCKET = process.env.NEXT_PUBLIC_STAFF_PHOTOS_BUCKET || "staff-photos";
const CHILD_PHOTO_BUCKET = process.env.NEXT_PUBLIC_CHILD_PHOTOS_BUCKET || "child-photos";
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — matches the profile pages' own photo links

type StaffLeaveRow = {
  id: string;
  staff_id: string;
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** True when a YYYY-MM-DD date's month/day matches a stored date of birth's
 * month/day — the year is deliberately ignored, since a birthday recurs
 * every year regardless of when someone was born. */
function isBirthdayOn(dateOfBirth: string, date: string): boolean {
  return dateOfBirth.slice(5, 10) === date.slice(5, 10);
}

/** One calendar month, laid out as a real Monday–Sunday grid (padded with
 * the trailing days of the previous/next month, same convention as the
 * hazard-check room calendar) with every event — NZ public holidays,
 * booked staff leave, and staff/child birthdays — attached to the day it
 * falls on. Public holidays are computed on the fly (see
 * nz-public-holidays.ts); nothing here is stored or seeded. Birthdays only
 * appear once a real date of birth has been entered on a profile — nothing
 * is inferred from a child's stored age. */
export async function getCalendarMonth(monthKey: string): Promise<CalendarWeek[]> {
  const monthStart = `${monthKey}-01`;
  const monthEnd = addMonths(monthStart, 1); // first day of the following month (exclusive)
  const gridStart = mondayOfDateString(monthStart);

  const weekStarts: string[] = [];
  let w = gridStart;
  while (w < monthEnd) {
    weekStarts.push(w);
    w = addDays(w, 7);
  }
  const gridEnd = addDays(weekStarts[weekStarts.length - 1], 7); // exclusive end of the whole grid

  const supabase = createClient();
  const [{ data: leaveRows }, { data: staffRows }, { data: childRows }] = await Promise.all([
    supabase
      .from("staff_leave")
      .select("*")
      .lt("start_date", gridEnd)
      .gte("end_date", gridStart),
    supabase.from("staff").select("id, full_name, date_of_birth, photo_storage_path"),
    supabase
      .from("children")
      .select("id, full_name, date_of_birth, photo_storage_path")
      .eq("status", "active"),
  ]);

  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id as string, s.full_name as string]));

  // Only sign photos for people whose birthday actually falls somewhere in
  // this grid — there's no reason to mint a signed URL for every staff
  // member and child on every single month view.
  const staffWithBirthdayInGrid = (staffRows ?? []).filter(
    (s) => s.date_of_birth && weekStarts.some((ws) => Array.from({ length: 7 }, (_, i) => isBirthdayOn(s.date_of_birth as string, addDays(ws, i))).some(Boolean))
  );
  const childrenWithBirthdayInGrid = (childRows ?? []).filter(
    (c) => c.date_of_birth && weekStarts.some((ws) => Array.from({ length: 7 }, (_, i) => isBirthdayOn(c.date_of_birth as string, addDays(ws, i))).some(Boolean))
  );

  const staffPhotoUrlById = new Map<string, string>();
  const staffPhotoPaths = staffWithBirthdayInGrid
    .map((s) => s.photo_storage_path as string | null)
    .filter((p): p is string => Boolean(p));
  if (staffPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(STAFF_PHOTO_BUCKET)
      .createSignedUrls(staffPhotoPaths, PHOTO_SIGNED_URL_TTL_SECONDS);
    const urlByPath = new Map<string, string>();
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && !s.error) urlByPath.set(s.path ?? "", s.signedUrl);
    });
    staffWithBirthdayInGrid.forEach((s) => {
      const path = s.photo_storage_path as string | null;
      if (path && urlByPath.has(path)) staffPhotoUrlById.set(s.id as string, urlByPath.get(path)!);
    });
  }

  const childPhotoUrlById = new Map<string, string>();
  const childPhotoPaths = childrenWithBirthdayInGrid
    .map((c) => c.photo_storage_path as string | null)
    .filter((p): p is string => Boolean(p));
  if (childPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(CHILD_PHOTO_BUCKET)
      .createSignedUrls(childPhotoPaths, PHOTO_SIGNED_URL_TTL_SECONDS);
    const urlByPath = new Map<string, string>();
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && !s.error) urlByPath.set(s.path ?? "", s.signedUrl);
    });
    childrenWithBirthdayInGrid.forEach((c) => {
      const path = c.photo_storage_path as string | null;
      if (path && urlByPath.has(path)) childPhotoUrlById.set(c.id as string, urlByPath.get(path)!);
    });
  }

  const holidays = getNzPublicHolidaysInRange(gridStart, gridEnd);
  const holidaysByDate = new Map<string, CalendarEvent[]>();
  holidays.forEach((h) => {
    const list = holidaysByDate.get(h.date) ?? [];
    list.push({ kind: "public_holiday", date: h.date, name: h.name });
    holidaysByDate.set(h.date, list);
  });

  const leave: StaffLeave[] = ((leaveRows ?? []) as StaffLeaveRow[]).map((r) => ({
    id: r.id,
    staff_id: r.staff_id,
    staff_name: staffNameById.get(r.staff_id) ?? "Former/unknown staff member",
    leave_type: r.leave_type,
    start_date: r.start_date,
    end_date: r.end_date,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return weekStarts.map((weekStartDate) => {
    const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStartDate, i);
      const inMonth = date >= monthStart && date < monthEnd;
      const events: CalendarEvent[] = [...(holidaysByDate.get(date) ?? [])];

      leave.forEach((l) => {
        if (date >= l.start_date && date <= l.end_date) {
          events.push({ kind: "staff_leave", date, leave: l });
        }
      });

      (staffRows ?? []).forEach((s) => {
        if (s.date_of_birth && isBirthdayOn(s.date_of_birth as string, date)) {
          events.push({
            kind: "staff_birthday",
            date,
            staffId: s.id as string,
            name: s.full_name as string,
            photoUrl: staffPhotoUrlById.get(s.id as string) ?? null,
          });
        }
      });

      (childRows ?? []).forEach((c) => {
        if (c.date_of_birth && isBirthdayOn(c.date_of_birth as string, date)) {
          events.push({
            kind: "child_birthday",
            date,
            childId: c.id as string,
            name: c.full_name as string,
            photoUrl: childPhotoUrlById.get(c.id as string) ?? null,
          });
        }
      });

      return { date, inMonth, events };
    });
    return { weekStartDate, days };
  });
}

/** Staff leave booked within [startDate, endDate) — used for the list under
 * the calendar grid so a booked block that started before this month (or
 * runs past it) still shows up while it overlaps. */
export async function getStaffLeaveForRange(startDate: string, endDate: string): Promise<StaffLeave[]> {
  const supabase = createClient();
  const [{ data: leaveRows }, { data: staffRows }] = await Promise.all([
    supabase.from("staff_leave").select("*").lt("start_date", endDate).gte("end_date", startDate),
    supabase.from("staff").select("id, full_name"),
  ]);

  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id as string, s.full_name as string]));

  return ((leaveRows ?? []) as StaffLeaveRow[])
    .map((r) => ({
      id: r.id,
      staff_id: r.staff_id,
      staff_name: staffNameById.get(r.staff_id) ?? "Former/unknown staff member",
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}
