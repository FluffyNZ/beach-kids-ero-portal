"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/email-format";
import type { DirectoryChild, RecipientDirectory, RecipientOption } from "@/lib/data/email-hub";

export type Recipient = {
  key: string;
  email: string;
  name: string;
  relationship: string;
  childIds: string[];
  childNames: string[];
  billPayerId: string | null;
  staffId: string | null;
  enquiryId: string | null;
};

export type MissingEntry = { key: string; label: string; detail: string; href: string | null };

type State = { recipients: Recipient[]; missing: MissingEntry[] };

export function addRecipient(state: State, r: Omit<Recipient, "key">): { state: State; merged: boolean } {
  const key = r.email.trim().toLowerCase();
  const existing = state.recipients.find((x) => x.key === key);
  if (!existing) return { state: { ...state, recipients: [...state.recipients, { ...r, email: r.email.trim(), key }] }, merged: false };
  const childIds = [...existing.childIds];
  const childNames = [...existing.childNames];
  r.childIds.forEach((id, i) => {
    if (!childIds.includes(id)) {
      childIds.push(id);
      childNames.push(r.childNames[i]);
    }
  });
  const next: Recipient = {
    ...existing,
    childIds,
    childNames,
    billPayerId: existing.billPayerId === r.billPayerId ? existing.billPayerId : existing.billPayerId ?? r.billPayerId,
    staffId: existing.staffId ?? r.staffId,
    enquiryId: existing.enquiryId ?? r.enquiryId,
  };
  return { state: { ...state, recipients: state.recipients.map((x) => (x.key === key ? next : x)) }, merged: childIds.length > existing.childIds.length };
}

export function childRecipient(child: DirectoryChild, option: RecipientOption): Omit<Recipient, "key"> {
  return {
    email: option.email,
    name: option.name,
    relationship: option.relationship,
    childIds: [child.id],
    childNames: [child.name],
    billPayerId: child.billPayerId,
    staffId: null,
    enquiryId: null,
  };
}

function missingFor(child: DirectoryChild): MissingEntry {
  return {
    key: `child-${child.id}`,
    label: child.name,
    detail: child.billPayerId ? "No email on the family account" : "No family account or contact email",
    href: child.billPayerId ? `/finances/clients/${child.billPayerId}` : `/children/${child.id}`,
  };
}

/** Adds a child's default contact (or notes that there's no email). */
export function addChildDefault(state: State, child: DirectoryChild): State {
  const option = child.options.find((o) => o.isDefault);
  if (!option) {
    if (state.missing.some((m) => m.key === `child-${child.id}`)) return state;
    return { ...state, missing: [...state.missing, missingFor(child)] };
  }
  return addRecipient(state, childRecipient(child, option)).state;
}

function matches(q: string, ...values: Array<string | null | undefined>) {
  return values.some((v) => v && v.toLowerCase().includes(q));
}

/** Search children, family accounts, staff and open enquiries, or add a
 * whole room. Only the contacts ticked here receive the email. */
export function RecipientPicker({
  directory,
  recipients,
  missing,
  onChange,
}: {
  directory: RecipientDirectory;
  recipients: Recipient[];
  missing: MissingEntry[];
  onChange: (next: State, note?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("");
  const [manual, setManual] = useState<{ staffId: string; email: string } | null>(null);
  const state: State = { recipients, missing };
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return null;
    return {
      children: directory.children
        .filter((c) => matches(q, c.name, c.familyName, c.roomName, ...c.options.map((o) => o.email), ...c.options.map((o) => o.name)))
        .sort((a, b) => Number(a.status !== "active") - Number(b.status !== "active"))
        .slice(0, 8),
      staff: directory.staff.filter((s) => s.active && matches(q, s.name, s.email, s.role)).slice(0, 5),
      enquiries: directory.enquiries.filter((e) => matches(q, e.parentName, e.childName, e.email)).slice(0, 5),
    };
  }, [q, directory]);

  const has = (email: string, childId?: string) => {
    const r = recipients.find((x) => x.key === email.toLowerCase());
    return Boolean(r && (!childId || r.childIds.includes(childId)));
  };

  function toggleOption(child: DirectoryChild, option: RecipientOption) {
    const key = option.email.toLowerCase();
    if (has(option.email, child.id)) {
      const r = recipients.find((x) => x.key === key)!;
      const idx = r.childIds.indexOf(child.id);
      const childIds = r.childIds.filter((_, i) => i !== idx);
      const childNames = r.childNames.filter((_, i) => i !== idx);
      const next = childIds.length || r.staffId || r.enquiryId ? recipients.map((x) => (x.key === key ? { ...x, childIds, childNames } : x)) : recipients.filter((x) => x.key !== key);
      onChange({ recipients: next, missing });
      return;
    }
    const { state: next, merged } = addRecipient(state, childRecipient(child, option));
    onChange(next, merged ? `${option.email} is already on the list — ${child.name} was added to the same email.` : undefined);
  }

  function addRoom() {
    const target = directory.children.filter((c) => c.status === "active" && (room === "all" || c.roomId === room));
    let next = state;
    target.forEach((c) => (next = addChildDefault(next, c)));
    const added = next.recipients.length - recipients.length;
    const roomName = room === "all" ? "all enrolled children" : directory.rooms.find((r) => r.id === room)?.name ?? "this room";
    onChange(next, `Added ${added} address${added === 1 ? "" : "es"} for ${roomName}. Each family account's email is used; other contacts aren't included.`);
    setRoom("");
  }

  const groupEmails = recipients.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div>
          <label htmlFor="recipient-search" className="mb-1.5 block text-sm font-medium text-charcoal">
            Search children, families, staff or enquiries
          </label>
          <input
            id="recipient-search"
            type="search"
            className="input"
            placeholder="Type at least 2 letters"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="recipient-room" className="mb-1.5 block text-sm font-medium text-charcoal">
            Add a group
          </label>
          <div className="flex gap-2">
            <select id="recipient-room" className="input" value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="">Choose a room…</option>
              {directory.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} families
                </option>
              ))}
              <option value="all">All enrolled families</option>
            </select>
            <button type="button" className="btn-secondary shrink-0" disabled={!room} onClick={addRoom}>
              Add
            </button>
          </div>
        </div>
      </div>

      {results && (
        <div className="rounded-xl border border-charcoal/10" aria-live="polite">
          {results.children.length + results.staff.length + results.enquiries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-charcoal/70">No children, families, staff or enquiries match “{query}”.</p>
          ) : (
            <ul className="divide-y divide-charcoal/10">
              {results.children.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-charcoal">
                    {c.name}
                    <span className="font-normal text-charcoal/70">
                      {" "}
                      · {c.status === "active" ? c.roomName ?? "No room" : "Left"}
                      {c.familyName ? ` · ${c.familyName}` : ""}
                    </span>
                  </p>
                  {c.options.length === 0 ? (
                    <p className="mt-1 text-sm text-charcoal">
                      <span className="font-medium text-status-action">No email on file.</span>{" "}
                      <Link href={c.billPayerId ? `/finances/clients/${c.billPayerId}` : `/children/${c.id}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                        Add one
                      </Link>
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {c.options.map((o) => (
                        <li key={o.email}>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-lilac-50">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-charcoal" checked={has(o.email, c.id)} onChange={() => toggleOption(c, o)} />
                            <span className="min-w-0 text-sm">
                              <span className="text-charcoal">{o.name}</span>
                              <span className="text-charcoal/70"> · {o.relationship}</span>
                              <span className="block break-all text-xs text-charcoal/70">{o.email}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {results.staff.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-charcoal">{s.name}</span>
                    <span className="text-charcoal/70"> · Staff{s.role ? `, ${s.role}` : ""}</span>
                    <span className="block break-all text-xs text-charcoal/70">{s.email ?? "No email on file"}</span>
                  </span>
                  {s.email ? (
                    <button
                      type="button"
                      className="btn-secondary px-3 py-1"
                      disabled={has(s.email)}
                      onClick={() => onChange(addRecipient(state, { email: s.email!, name: s.name, relationship: "Staff", childIds: [], childNames: [], billPayerId: null, staffId: s.id, enquiryId: null }).state)}
                    >
                      {has(s.email) ? "Added" : "Add"}
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary px-3 py-1" onClick={() => setManual({ staffId: s.id, email: "" })}>
                      Enter an address
                    </button>
                  )}
                </li>
              ))}
              {results.enquiries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-charcoal">{e.parentName}</span>
                    <span className="text-charcoal/70"> · Enquiry for {e.childName}</span>
                    <span className="block break-all text-xs text-charcoal/70">{e.email}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1"
                    disabled={has(e.email)}
                    onClick={() => onChange(addRecipient(state, { email: e.email, name: e.parentName, relationship: `Enquiry for ${e.childName}`, childIds: [], childNames: [], billPayerId: null, staffId: null, enquiryId: e.id }).state)}
                  >
                    {has(e.email) ? "Added" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {manual && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-charcoal/10 p-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="manual-email" className="mb-1.5 block text-sm font-medium text-charcoal">
              Email address for {directory.staff.find((s) => s.id === manual.staffId)?.name}
            </label>
            <input id="manual-email" type="email" className="input" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
            <p className="mt-1 text-xs text-charcoal/70">Used for this email only. Add it to their staff profile to keep it.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setManual(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!isValidEmail(manual.email)}
            onClick={() => {
              const s = directory.staff.find((x) => x.id === manual.staffId)!;
              onChange(addRecipient(state, { email: manual.email, name: s.name, relationship: "Staff", childIds: [], childNames: [], billPayerId: null, staffId: s.id, enquiryId: null }).state);
              setManual(null);
            }}
          >
            Add address
          </button>
        </div>
      )}

      <section aria-labelledby="selected-heading" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="selected-heading" className="text-base font-semibold text-charcoal">
            {groupEmails === 0 ? "No recipients yet" : groupEmails === 1 ? "1 recipient" : `${groupEmails} recipients`}
          </h3>
          {groupEmails > 0 && (
            <p className="text-sm text-charcoal/70">
              {groupEmails === 1 ? "One email to one address." : `${groupEmails} separate emails — each person only sees their own address.`}
            </p>
          )}
        </div>
        {recipients.length > 0 && (
          <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10">
            {recipients.map((r) => (
              <li key={r.key} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-charcoal">{r.name}</span>
                  <span className="text-charcoal/70"> · {r.relationship}</span>
                  <span className="block break-all text-xs text-charcoal/70">
                    {r.email}
                    {r.childNames.length > 0 && ` · for ${r.childNames.join(" and ")}`}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-charcoal/70 hover:bg-lilac-50 hover:text-charcoal"
                  onClick={() => onChange({ recipients: recipients.filter((x) => x.key !== r.key), missing })}
                >
                  Remove<span className="sr-only"> {r.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <div className={cn("rounded-xl border border-status-attention/40 bg-status-attentionBg px-4 py-3 text-sm text-charcoal")} role="note">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {missing.length === 1 ? "1 child has" : `${missing.length} children have`} no email address and won&apos;t receive this:
              </p>
              <button type="button" className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline" onClick={() => onChange({ recipients, missing: [] })}>
                Dismiss
              </button>
            </div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {missing.map((m) => (
                <li key={m.key}>
                  {m.label} — {m.detail}
                  {m.href && (
                    <>
                      {" "}
                      <Link href={m.href} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                        Add an email
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
