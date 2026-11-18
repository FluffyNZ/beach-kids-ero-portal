"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { SaveStatus, useSaveState } from "@/components/ui/save-status";
import { SearchIcon } from "@/components/icons";
import { saveWeeklyHours } from "@/lib/actions/fees";
import { getRoomColorClasses } from "@/lib/constants";
import { addDays, cn, formatCurrency, mondayOfDateString } from "@/lib/utils";
import type { WeekdayHours } from "@/lib/types";

export type HoursRow = {
  childId: string;
  name: string;
  roomId: string | null;
  roomName: string | null;
  roomColor: string | null;
  /** Hours from the child's regular booked schedule; null = no booking on file. */
  booked: WeekdayHours | null;
  tbc: boolean;
  /** Hours saved (confirmed) for this week; null = not confirmed yet. */
  confirmed: WeekdayHours | null;
  /** Fee figures from Finance's existing calculation (estimated while unconfirmed). */
  feeTotal: number;
  parentPays: number;
  specialRate: boolean;
};

type Room = { id: string; name: string; color: string | null };
type DayKey = keyof WeekdayHours;
type Draft = { hours: Record<DayKey, string>; confirmAsShown: boolean };

const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: "mon_hours", short: "Mon", long: "Monday" },
  { key: "tue_hours", short: "Tue", long: "Tuesday" },
  { key: "wed_hours", short: "Wed", long: "Wednesday" },
  { key: "thu_hours", short: "Thu", long: "Thursday" },
  { key: "fri_hours", short: "Fri", long: "Friday" },
];
const MAX_DAY_HOURS = 12;
const NO_ROOM = "none";

const dayFmt = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
function d(date: string) {
  return new Date(`${date}T00:00:00Z`);
}
function fmtHours(n: number) {
  return String(Math.round(n * 100) / 100);
}
function normalise(v: string) {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function validateCell(value: string): string | null {
  if (value.trim() === "") return "Enter hours — 0 if the child didn't attend.";
  const n = Number(value);
  if (Number.isNaN(n)) return "Hours must be a number.";
  if (n < 0) return "Hours can't be negative.";
  if (n > MAX_DAY_HOURS) return `More than ${MAX_DAY_HOURS} hours in a day — please check.`;
  if (Math.round(n * 100) !== n * 100) return "Use up to two decimal places (e.g. 6.25).";
  return null;
}

function rowStatus(row: HoursRow, weekState: string): { label: string; tone: PillTone } {
  if (row.confirmed) return { label: "Confirmed", tone: "ready" };
  if (!row.booked) return { label: "No booking on file", tone: "attention" };
  if (row.tbc) return { label: "Booking TBC", tone: "attention" };
  if (weekState === "ready") return { label: "Needs review", tone: "attention" };
  return { label: "Estimated", tone: "neutral" };
}

/** The Weekly Hours review-and-confirm workspace: toolbar (week, room,
 * search, needs-confirmation filter, roll), the Mon–Fri table and an
 * explicit save bar. Only rows that have been edited, or deliberately ticked
 * "Confirm", are saved — untouched estimates are never confirmed silently,
 * and weeks that aren't over yet can't be confirmed. */
export function WeeklyHoursWorkspace({
  weekStartDate,
  today,
  weekState,
  rows,
  rooms,
  issuedInvoices,
  initial,
}: {
  weekStartDate: string;
  today: string;
  weekState: "future" | "in_progress" | "ready";
  rows: HoursRow[];
  rooms: Room[];
  issuedInvoices: number;
  initial: { room: string; q: string; needsReview: boolean };
}) {
  const router = useRouter();
  const editable = weekState === "ready";
  const [room, setRoom] = useState(initial.room);
  const [query, setQuery] = useState(initial.q);
  const [needsReview, setNeedsReview] = useState(initial.needsReview);
  const [showFees, setShowFees] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showSaveList, setShowSaveList] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const save = useSaveState();
  const tableRef = useRef<HTMLDivElement>(null);

  const friday = addDays(weekStartDate, 4);
  const thisWeek = mondayOfDateString(today);

  // ---- values -------------------------------------------------------------
  const shownValue = useCallback(
    (row: HoursRow, day: DayKey): string => {
      const draft = drafts[row.childId];
      if (draft) return draft.hours[day];
      if (row.confirmed) return fmtHours(row.confirmed[day]);
      return fmtHours(row.booked?.[day] ?? 0);
    },
    [drafts]
  );

  function rowValues(row: HoursRow): Record<DayKey, string> {
    return Object.fromEntries(DAYS.map((dd) => [dd.key, shownValue(row, dd.key)])) as Record<DayKey, string>;
  }

  /** Whether this row will be saved: an unconfirmed row only when edited or
   * ticked to confirm; a confirmed row only when its values have changed. */
  function willSave(row: HoursRow): boolean {
    const draft = drafts[row.childId];
    if (!draft) return false;
    if (!row.confirmed) return draft.confirmAsShown || DAYS.some((dd) => draft.hours[dd.key] !== fmtHours(row.booked?.[dd.key] ?? 0));
    return DAYS.some((dd) => Number(draft.hours[dd.key]) !== row.confirmed![dd.key] || draft.hours[dd.key].trim() === "");
  }

  const toSave = rows.filter(willSave);
  const errorsFor = (row: HoursRow) =>
    Object.fromEntries(DAYS.map((dd) => [dd.key, drafts[row.childId] ? validateCell(drafts[row.childId].hours[dd.key]) : null])) as Record<
      DayKey,
      string | null
    >;
  const invalidRows = toSave.filter((r) => Object.values(errorsFor(r)).some(Boolean));
  const dirtyCount = toSave.length;

  function editCell(row: HoursRow, day: DayKey, value: string) {
    setResult(null);
    save.markDirty();
    setDrafts((prev) => {
      const base = prev[row.childId] ?? { hours: rowValues(row), confirmAsShown: false };
      return { ...prev, [row.childId]: { ...base, hours: { ...base.hours, [day]: value } } };
    });
  }

  /** Ticking confirms the row's hours as shown; unticking takes the row out
   * of the save altogether (dropping any edits to it). */
  function toggleConfirm(row: HoursRow, checked: boolean) {
    setResult(null);
    if (checked) save.markDirty();
    setDrafts((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[row.childId];
        return next;
      }
      const base = prev[row.childId] ?? { hours: rowValues(row), confirmAsShown: false };
      return { ...prev, [row.childId]: { ...base, confirmAsShown: true } };
    });
  }

  function discardAll() {
    setDrafts({});
    save.reset();
    setShowSaveList(false);
  }

  async function handleSave() {
    if (invalidRows.length > 0) {
      save.setError(`Check the highlighted hours for ${invalidRows.map((r) => r.name).join(", ")}.`);
      save.setState("error");
      return;
    }
    const entries = toSave.map((row) => {
      const v = drafts[row.childId].hours;
      return {
        childId: row.childId,
        hours: Object.fromEntries(DAYS.map((dd) => [dd.key, Number(v[dd.key])])) as unknown as WeekdayHours,
      };
    });
    const names = toSave.map((r) => r.name);
    const ok = await save.run(() => saveWeeklyHours({ weekStartDate, entries }), "Couldn't save these hours. Nothing was changed — please try again.");
    if (ok) {
      setDrafts({});
      setShowSaveList(false);
      setResult(
        `Confirmed hours saved for ${names.length} ${names.length === 1 ? "child" : "children"}. Fee estimates on Finance → Fees now use these hours.`
      );
      router.refresh();
    }
  }

  // ---- unsaved-changes protection -------------------------------------------
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      setPendingHref(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirtyCount]);

  function go(href: string) {
    if (dirtyCount > 0) setPendingHref(href);
    else router.push(href);
  }

  // Keep filters in the address bar (with the week) without reloading.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set("week", weekStartDate);
    if (room) p.set("room", room);
    if (query.trim()) p.set("q", query.trim());
    if (needsReview) p.set("show", "review");
    window.history.replaceState(window.history.state, "", `?${p.toString()}`);
  }, [weekStartDate, room, query, needsReview]);

  function weekHref(week: string) {
    const p = new URLSearchParams();
    p.set("week", week);
    if (room) p.set("room", room);
    if (needsReview) p.set("show", "review");
    return `/children/hours?${p.toString()}`;
  }
  const rollHref = `/roster/attendance-roll?week=${weekStartDate}${room && room !== NO_ROOM ? `&room=${room}` : ""}`;

  // ---- filtering & grouping -------------------------------------------------
  const q = normalise(query);
  const needsConfirmation = (r: HoursRow) => !r.confirmed;
  const visible = rows.filter(
    (r) =>
      (!room || (room === NO_ROOM ? !r.roomId : r.roomId === room)) &&
      (!q || normalise(r.name).includes(q)) &&
      (!needsReview || needsConfirmation(r) || Boolean(drafts[r.childId]))
  );
  const groups = useMemo(() => {
    const list: { key: string; name: string; color: string | null; rows: HoursRow[] }[] = [];
    visible.forEach((r) => {
      const key = r.roomId ?? NO_ROOM;
      let g = list.find((x) => x.key === key);
      if (!g) {
        g = { key, name: r.roomName ?? "No room", color: r.roomColor, rows: [] };
        list.push(g);
      }
      g.rows.push(r);
    });
    return list;
  }, [visible]);

  const confirmedCount = rows.filter((r) => r.confirmed).length;
  const unconfirmedCount = rows.length - confirmedCount;
  const missingInfo = rows.filter((r) => !r.confirmed && (!r.booked || r.tbc)).length;
  const allReviewableShown = visible.filter((r) => !r.confirmed);

  const dayTotals = DAYS.map((dd) => visible.reduce((s, r) => s + (Number(shownValue(r, dd.key)) || 0), 0));
  const visibleIncludesEstimates = visible.some((r) => !r.confirmed && !drafts[r.childId]);

  const weekLabel = `${fullFmt.format(d(weekStartDate)).replace(",", "")} – ${fullFmt.format(d(friday)).replace(",", "")}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary px-3" onClick={() => go(weekHref(addDays(weekStartDate, -7)))} aria-label="Previous week">
              ←<span className="hidden sm:inline">Previous</span>
            </button>
            <button type="button" className="btn-secondary px-3" onClick={() => go(weekHref(addDays(weekStartDate, 7)))} aria-label="Next week">
              <span className="hidden sm:inline">Next</span>→
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              disabled={weekStartDate === thisWeek}
              onClick={() => go(weekHref(thisWeek))}
            >
              This week
            </button>
          </div>
          <h2 className="min-w-0 flex-1 text-base font-semibold text-charcoal sm:text-lg" aria-live="polite">
            {weekLabel}
            {weekStartDate === thisWeek && <span className="ml-2 text-sm font-normal text-charcoal/70">This week</span>}
          </h2>
          <Link href={rollHref} className="btn-secondary">
            Print booked roll
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[14rem]">
            <label htmlFor="hours-search" className="sr-only">
              Search children
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/60" />
            <input
              id="hours-search"
              type="search"
              autoComplete="off"
              className="input pl-9"
              placeholder="Search children"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="hours-room">
            Room
          </label>
          <select id="hours-room" className="input sm:w-48" value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {rows.some((r) => !r.roomId) && <option value={NO_ROOM}>No room</option>}
          </select>
          <button
            type="button"
            aria-pressed={needsReview}
            onClick={() => setNeedsReview((v) => !v)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
              needsReview ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15 bg-white text-charcoal hover:bg-charcoal/5"
            )}
          >
            Not yet confirmed <span className="opacity-80">{unconfirmedCount}</span>
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-charcoal sm:ml-auto">
            <input type="checkbox" className="h-4 w-4 accent-charcoal" checked={showFees} onChange={(e) => setShowFees(e.target.checked)} />
            Show fee estimates
          </label>
        </div>
      </div>

      {/* What this week is */}
      <div className="flex flex-col gap-2 rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <p className="text-charcoal">
          <span className="font-semibold">{confirmedCount}</span> of {rows.length} confirmed
          {missingInfo > 0 && <span className="text-charcoal/70"> · {missingInfo} with no booking or TBC times</span>}
        </p>
        {weekState === "ready" ? (
          <p className="text-charcoal/80">
            {unconfirmedCount > 0
              ? "Unconfirmed rows show booked hours. Edit the hours that differ, or tick Confirm where the booking was right."
              : "Every child's hours are confirmed for this week."}
          </p>
        ) : weekState === "in_progress" ? (
          <p className="text-charcoal/80">This week isn&apos;t over yet — showing booked hours. Hours can be confirmed from Friday {dayFmt.format(d(friday))}.</p>
        ) : (
          <p className="text-charcoal/80">A future week — showing booked hours only. Nothing can be confirmed yet.</p>
        )}
      </div>

      {issuedInvoices > 0 && (
        <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-sm text-charcoal">
          {issuedInvoices} {issuedInvoices === 1 ? "invoice has" : "invoices have"} already been issued for this week. Confirming hours
          updates the fee estimates on Finance → Fees but doesn&apos;t change invoices already sent.{" "}
          <Link href={`/finances/fees?week=${weekStartDate}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
            Open Finance → Fees
          </Link>
        </p>
      )}

      {result && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-status-ready/30 bg-status-readyBg px-4 py-3 text-sm text-charcoal">
          <span aria-hidden="true">✓</span>
          <span>
            {result}{" "}
            <Link href={`/finances/fees?week=${weekStartDate}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
              View fees
            </Link>
          </span>
        </p>
      )}

      {/* Table */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white px-5 py-10 text-center">
          <p className="font-medium text-charcoal">{needsReview ? "Every child shown is confirmed" : "No children match these filters"}</p>
        </div>
      ) : (
        <div
          ref={tableRef}
          className="max-h-[calc(100vh-13rem)] overflow-auto rounded-2xl border border-charcoal/10 bg-white"
          role="region"
          aria-label={`Hours for ${weekLabel}`}
          tabIndex={0}
        >
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Daily hours and weekly totals for each child, {weekLabel}. Unconfirmed rows show booked hours.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 w-44 border-b border-r border-charcoal/10 bg-canvas px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-charcoal/70 sm:w-56 sm:px-4"
                >
                  Child
                </th>
                {DAYS.map((dd, i) => (
                  <th key={dd.key} scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-2 py-2.5 text-center text-xs font-semibold text-charcoal">
                    <abbr title={dd.long} className="no-underline">
                      {dd.short}
                    </abbr>
                    <span className="block font-normal text-charcoal/70">{dayFmt.format(d(addDays(weekStartDate, i)))}</span>
                    <span className="sr-only"> hours</span>
                  </th>
                ))}
                <th scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-2 py-2.5 text-center text-xs font-semibold text-charcoal">
                  Week
                  <span className="block font-normal text-charcoal/70">total hrs</span>
                </th>
                <th scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Status
                </th>
                {editable && (
                  <th scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                    Confirm
                  </th>
                )}
                {showFees && (
                  <>
                    <th scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                      Fee
                    </th>
                    <th scope="col" className="sticky top-0 z-20 border-b border-charcoal/10 bg-canvas px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                      Parent pays
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={8 + (editable ? 1 : 0) + (showFees ? 2 : 0)}
                      className="border-b border-charcoal/10 bg-lilac-50 px-0 py-0 text-left"
                    >
                      <span className="sticky left-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-charcoal sm:px-4">
                        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", getRoomColorClasses(g.color).chip)} />
                        {g.name}
                        <span className="font-normal text-charcoal/70">
                          {g.rows.length} {g.rows.length === 1 ? "child" : "children"}
                        </span>
                      </span>
                    </th>
                  </tr>
                  {g.rows.map((row) => {
                    const draft = drafts[row.childId];
                    const status = rowStatus(row, weekState);
                    const errors = errorsFor(row);
                    const saving = willSave(row);
                    const total = DAYS.reduce((s, dd) => s + (Number(shownValue(row, dd.key)) || 0), 0);
                    const estimatedLook = !row.confirmed && !draft;
                    return (
                      <tr key={row.childId} className={cn("group", saving && "bg-status-attentionBg/40")}>
                        <th
                          scope="row"
                          className={cn(
                            "sticky left-0 z-10 border-b border-r border-charcoal/10 px-3 py-2 text-left align-top font-normal sm:px-4",
                            saving ? "bg-[#fdf7ec]" : "bg-white"
                          )}
                        >
                          <Link
                            href={`/children/${row.childId}?tab=bookings`}
                            className="block break-words font-medium leading-snug text-charcoal underline-offset-4 hover:underline"
                          >
                            {row.name}
                          </Link>
                          {saving && <span className="mt-0.5 block text-xs font-medium text-charcoal">Unsaved changes</span>}
                        </th>
                        {DAYS.map((dd) => {
                          const value = shownValue(row, dd.key);
                          const bookedH = row.booked?.[dd.key] ?? 0;
                          const err = errors[dd.key];
                          const n = Number(value);
                          const caption =
                            !err && value !== "" && !Number.isNaN(n)
                              ? n === 0 && bookedH > 0 && !estimatedLook
                                ? "absent"
                                : n === 0 && bookedH === 0
                                  ? "not booked"
                                  : !estimatedLook && n !== bookedH
                                    ? `booked ${fmtHours(bookedH)}`
                                    : null
                              : null;
                          const inputId = `h-${row.childId}-${dd.key}`;
                          return (
                            <td key={dd.key} className="border-b border-charcoal/10 px-1.5 py-2 text-center align-top">
                              {editable ? (
                                <>
                                  <input
                                    id={inputId}
                                    inputMode="decimal"
                                    aria-label={`${row.name}, ${dd.long} hours`}
                                    aria-invalid={err ? true : undefined}
                                    aria-describedby={err ? `${inputId}-err` : undefined}
                                    value={value}
                                    onChange={(e) => editCell(row, dd.key, e.target.value)}
                                    className={cn(
                                      "w-16 rounded-lg border px-1.5 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-charcoal",
                                      err
                                        ? "border-status-action bg-status-actionBg text-charcoal"
                                        : estimatedLook
                                          ? "border-dashed border-charcoal/30 bg-canvas italic text-charcoal/70"
                                          : "border-charcoal/30 bg-white text-charcoal"
                                    )}
                                  />
                                  {err ? (
                                    <span id={`${inputId}-err`} role="alert" className="mt-1 block max-w-[7rem] text-[0.6875rem] leading-tight text-charcoal">
                                      {err}
                                    </span>
                                  ) : (
                                    caption && <span className="mt-0.5 block text-[0.6875rem] text-charcoal/70">{caption}</span>
                                  )}
                                </>
                              ) : (
                                <span className={cn("tabular-nums", estimatedLook ? "italic text-charcoal/70" : "text-charcoal")}>
                                  {n === 0 ? "–" : value}
                                  {caption && <span className="block text-[0.6875rem] not-italic text-charcoal/70">{caption}</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-charcoal/10 px-2 py-2 text-center align-top font-semibold tabular-nums text-charcoal">
                          {fmtHours(total)}
                          {estimatedLook && <span className="block text-[0.6875rem] font-normal text-charcoal/70">booked</span>}
                        </td>
                        <td className="border-b border-charcoal/10 px-3 py-2 align-top">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </td>
                        {editable && (
                          <td className="border-b border-charcoal/10 px-3 py-2 text-center align-top">
                            {row.confirmed ? (
                              <span className="text-xs text-charcoal/70">{saving ? "Will update" : "Saved"}</span>
                            ) : (
                              <label className="inline-flex items-center gap-1.5 text-xs text-charcoal">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-charcoal"
                                  checked={saving}
                                  onChange={(e) => toggleConfirm(row, e.target.checked)}
                                  aria-label={`Confirm ${row.name}'s hours as shown`}
                                />
                                <span aria-hidden="true">{saving ? "Yes" : "Confirm"}</span>
                              </label>
                            )}
                          </td>
                        )}
                        {showFees && (
                          <>
                            <td className="border-b border-charcoal/10 px-3 py-2 text-right align-top tabular-nums text-charcoal">
                              {formatCurrency(row.feeTotal)}
                              <span className="block text-[0.6875rem] text-charcoal/70">
                                {saving ? "updates after saving" : row.confirmed ? (row.specialRate ? "special rate" : "from confirmed hours") : "estimate from booking"}
                              </span>
                            </td>
                            <td className="border-b border-charcoal/10 px-3 py-2 text-right align-top tabular-nums text-charcoal">
                              {formatCurrency(row.parentPays)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="sticky bottom-0 left-0 z-20 border-r border-t border-charcoal/10 bg-canvas px-3 py-2.5 text-left text-xs font-semibold text-charcoal sm:px-4">
                  Total hours shown
                  {visibleIncludesEstimates && <span className="block font-normal text-charcoal/70">includes booked estimates</span>}
                </th>
                {dayTotals.map((t, i) => (
                  <td key={i} className="sticky bottom-0 z-10 border-t border-charcoal/10 bg-canvas px-2 py-2.5 text-center font-semibold tabular-nums text-charcoal">
                    {fmtHours(t)}
                  </td>
                ))}
                <td className="sticky bottom-0 z-10 border-t border-charcoal/10 bg-canvas px-2 py-2.5 text-center font-semibold tabular-nums text-charcoal">
                  {fmtHours(dayTotals.reduce((a, b) => a + b, 0))}
                </td>
                <td colSpan={1 + (editable ? 1 : 0) + (showFees ? 2 : 0)} className="sticky bottom-0 z-10 border-t border-charcoal/10 bg-canvas" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editable && allReviewableShown.length > 0 && dirtyCount === 0 && (
        <p className="text-sm text-charcoal/70">
          Tip: tick <span className="font-medium text-charcoal">Confirm</span> for children whose booking was right, and type the real hours
          for anyone who was absent, left early or came on an extra day. Use 0 for a day they didn&apos;t attend.
        </p>
      )}

      {/* Save bar */}
      {editable && (dirtyCount > 0 || save.state === "error") && (
        <div className="sticky bottom-20 z-30 md:bottom-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/20 bg-white p-3 shadow-cardHover sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal">
                {dirtyCount} {dirtyCount === 1 ? "row" : "rows"} will be saved as confirmed hours for this week
              </p>
              <button
                type="button"
                className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline"
                aria-expanded={showSaveList}
                onClick={() => setShowSaveList((s) => !s)}
              >
                {showSaveList ? "Hide list" : "Show which"}
              </button>
              {showSaveList && (
                <ul className="mt-1 max-h-32 overflow-auto text-sm text-charcoal/80">
                  {toSave.map((r) => {
                    const draft = drafts[r.childId];
                    const edited = DAYS.some((dd) => draft.hours[dd.key] !== fmtHours((r.confirmed ?? r.booked)?.[dd.key] ?? 0));
                    return (
                      <li key={r.childId}>
                        {r.name} — {r.confirmed ? "changing confirmed hours" : edited ? "edited hours" : "confirming booked hours"}
                      </li>
                    );
                  })}
                </ul>
              )}
              {save.error && (
                <p role="alert" className="mt-1 text-sm text-charcoal">
                  {save.error}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <SaveStatus state={save.state === "saved" ? "idle" : save.state} />
              <button type="button" className="btn-secondary" onClick={discardAll} disabled={save.state === "saving"}>
                Discard
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={save.state === "saving" || dirtyCount === 0}>
                {save.state === "saving" ? "Saving…" : `Save ${dirtyCount} ${dirtyCount === 1 ? "row" : "rows"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-charcoal/70">
        Booked hours come from each child&apos;s regular schedule (edit it on the child&apos;s Bookings tab). Earlydesk doesn&apos;t
        record daily sign-in and sign-out — confirmed hours are the attendance record. Until a child&apos;s week is confirmed,
        Finance estimates their fee from booked hours.
      </p>

      <Modal open={pendingHref !== null} onClose={() => setPendingHref(null)} title="Leave without saving?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-charcoal">
            You have unsaved hours for {dirtyCount} {dirtyCount === 1 ? "child" : "children"}. If you leave now, those changes will be lost.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setPendingHref(null)}>
              Stay and keep editing
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const href = pendingHref!;
                setDrafts({});
                setPendingHref(null);
                router.push(href);
              }}
            >
              Discard and leave
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
