// Pacific/Auckland time helpers for the Marketing feature, including
// daylight saving — everything a user types or sees ("23 Oct 2026, 10:00am")
// is NZ wall-clock time, but everything stored/sent to Meta is a real UTC
// instant (marketing_posts.scheduled_at is `timestamptz`). Built on the
// standard Intl.DateTimeFormat API rather than a new date-library
// dependency, per this project's "no new dependency without approval" rule.

const NZ_TIME_ZONE = "Pacific/Auckland";

/** Offset (in minutes) such that localTime = utcTime + offset, for the
 * given timeZone at the instant `utcDate` represents. Positive for NZ
 * (+12 / +13 hours = 720 / 780 minutes). */
function timeZoneOffsetMinutes(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(utcDate);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  // formatToParts can give "24" for midnight in some locales — normalise.
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
  return Math.round((asUtc - utcDate.getTime()) / 60000);
}

/** Converts a Pacific/Auckland wall-clock date + time (as typed into the
 * Create post form's date/time fields) into a real UTC ISO instant,
 * correctly accounting for whichever side of daylight saving that date
 * falls on. `date` is "YYYY-MM-DD", `time` is "HH:MM" (24-hour). */
export function nzWallTimeToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // First guess: treat the wall-clock time as if it were already UTC, then
  // correct by whatever Pacific/Auckland's offset actually is near that
  // instant. One correction pass is enough since the offset is constant
  // across any single day except in the one hour of the DST transition
  // itself, which this app surfaces back to the user to visually confirm
  // (see formatNzDateTime) rather than silently resolving.
  const guessUtc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0));
  const offsetMinutes = timeZoneOffsetMinutes(guessUtc, NZ_TIME_ZONE);
  return new Date(guessUtc.getTime() - offsetMinutes * 60000).toISOString();
}

/** The reverse of nzWallTimeToUtcIso — splits a stored UTC instant back
 * into the Pacific/Auckland "YYYY-MM-DD" / "HH:MM" the Create/Edit post
 * form's date and time inputs should show. */
export function utcIsoToNzWallTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${hour}:${map.minute}` };
}

/** Friendly "23 Oct 2026, 10:00am" display in NZ time, for post lists,
 * the calendar and status pages. */
export function formatNzDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .toLowerCase()
    .replace(" ", "");
  return `${datePart}, ${timePart} NZ time`;
}

/** Today's date (YYYY-MM-DD) in Pacific/Auckland — used for suggestion
 * look-ahead windows and the calendar's "today" marker, so a server
 * running in UTC doesn't compute "today" as yesterday for NZ users. */
export function todayIso(): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
