"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addFamilyContact, updateFamilyContact, deleteFamilyContact } from "@/lib/actions/email";
import { updateBillPayerPhone } from "@/lib/actions/contacts";
import type { ManagedFamily } from "@/lib/data/contact-directory";
import type { FamilyContact } from "@/lib/types";

type ContactFields = { full_name: string; relationship: string; phone: string; email: string };
type ActionResult = { success: boolean; error?: string };

const EMPTY_FIELDS: ContactFields = { full_name: "", relationship: "", phone: "", email: "" };

function fieldsFrom(contact: FamilyContact): ContactFields {
  return {
    full_name: contact.full_name,
    relationship: contact.relationship ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
  };
}

function ContactForm({
  idPrefix,
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial: ContactFields;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fields: ContactFields) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<ContactFields>(initial);
  const set = (key: keyof ContactFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [key]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-sand-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(fields);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${idPrefix}-name`}>
            Name
          </label>
          <input id={`${idPrefix}-name`} className="input" value={fields.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-rel`}>
            Relationship
          </label>
          <input
            id={`${idPrefix}-rel`}
            className="input"
            list="family-relationship-options"
            value={fields.relationship}
            onChange={set("relationship")}
            placeholder="e.g. Mother, or Emergency contact – Nana"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-phone`}>
            Phone
          </label>
          <input
            id={`${idPrefix}-phone`}
            className="input"
            type="tel"
            inputMode="tel"
            value={fields.phone}
            onChange={set("phone")}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-email`}>
            Email (optional)
          </label>
          <input
            id={`${idPrefix}-email`}
            className="input"
            type="email"
            value={fields.email}
            onChange={set("email")}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary px-3 py-1.5 text-xs" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FamilyCard({ family }: { family: ManagedFamily }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(family.billPayerPhone ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const hasAnyPhone =
    Boolean(family.billPayerPhone?.trim()) || family.contacts.some((c) => Boolean(c.phone?.trim()));

  function run(action: () => Promise<ActionResult>, after: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong — nothing was saved.");
        return;
      }
      after();
      router.refresh();
    });
  }

  function saveBillPayerPhone() {
    run(
      () => updateBillPayerPhone(family.billPayerId, phoneDraft),
      () => setEditingPhone(false)
    );
  }

  function saveContact(fields: ContactFields, existing: FamilyContact | null) {
    if (!fields.full_name.trim()) {
      setError("Enter this contact's name.");
      return;
    }
    if (!existing && !fields.phone.trim()) {
      setError("Enter a phone number — this page is for numbers staff can call.");
      return;
    }
    run(
      () =>
        existing
          ? updateFamilyContact(existing.id, {
              full_name: fields.full_name.trim(),
              relationship: fields.relationship.trim() || null,
              phone: fields.phone.trim() || null,
              email: fields.email.trim() || null,
            })
          : addFamilyContact(family.billPayerId, {
              full_name: fields.full_name,
              relationship: fields.relationship,
              phone: fields.phone,
              email: fields.email,
            }),
      () => {
        setEditingId(null);
        setAdding(false);
      }
    );
  }

  function removeContact(id: string) {
    run(
      () => deleteFamilyContact(id),
      () => setRemovingId(null)
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-charcoal">
            {family.children.length > 0 ? (
              family.children.map((child, i) => (
                <span key={child.id}>
                  {i > 0 && " · "}
                  <Link href={`/children/${child.id}`} className="hover:underline">
                    {child.name}
                  </Link>
                </span>
              ))
            ) : (
              family.billPayerName
            )}
          </h3>
          <p className="text-xs text-charcoal/50">Bill payer: {family.billPayerName}</p>
        </div>
        {!hasAnyPhone && <span className="badge bg-status-actionBg text-status-action">No number yet</span>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-charcoal/10 px-4 py-2.5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">{family.billPayerName} (bill payer)</p>
          {editingPhone ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                className="input w-52"
                type="tel"
                inputMode="tel"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                aria-label={`Phone number for ${family.billPayerName}`}
                autoFocus
              />
              <button type="button" className="btn-primary px-3 py-1.5 text-xs" disabled={pending} onClick={saveBillPayerPhone}>
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                disabled={pending}
                onClick={() => {
                  setEditingPhone(false);
                  setPhoneDraft(family.billPayerPhone ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-sm text-charcoal">
              {family.billPayerPhone || <span className="text-charcoal/40">No number on file</span>}
            </p>
          )}
        </div>
        {!editingPhone && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditingPhone(true)}>
            {family.billPayerPhone ? "Edit number" : "Add number"}
          </button>
        )}
      </div>

      {family.contacts.map((contact) =>
        editingId === contact.id ? (
          <ContactForm
            key={contact.id}
            idPrefix={`edit-${contact.id}`}
            initial={fieldsFrom(contact)}
            submitLabel="Save changes"
            pending={pending}
            onSubmit={(fields) => saveContact(fields, contact)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={contact.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-charcoal/10 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-charcoal">
                {contact.full_name}
                {contact.relationship && <span className="font-normal text-charcoal/50"> · {contact.relationship}</span>}
              </p>
              <p className="text-sm text-charcoal/70">
                {contact.phone || <span className="text-charcoal/40">No phone (email only)</span>}
                {contact.email && <span className="text-charcoal/40"> · {contact.email}</span>}
              </p>
            </div>
            {removingId === contact.id ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-charcoal/60">Remove {contact.full_name}?</span>
                <button type="button" className="btn-danger px-3 py-1.5 text-xs" disabled={pending} onClick={() => removeContact(contact.id)}>
                  {pending ? "Removing…" : "Yes, remove"}
                </button>
                <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={pending} onClick={() => setRemovingId(null)}>
                  Keep
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditingId(contact.id)}>
                  Edit
                </button>
                <button type="button" className="btn-ghost px-3 py-1.5 text-xs text-status-action" onClick={() => setRemovingId(contact.id)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        )
      )}

      {adding ? (
        <ContactForm
          idPrefix={`add-${family.key}`}
          initial={EMPTY_FIELDS}
          submitLabel="Add contact"
          pending={pending}
          onSubmit={(fields) => saveContact(fields, null)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="btn-secondary self-start px-3 py-1.5 text-xs" onClick={() => setAdding(true)}>
          + Add another contact
        </button>
      )}

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}
    </section>
  );
}

/** The "fill in the numbers" side of the staff-room tablet: one card per
 * family (bill payer + their active children), where a manager can set the
 * bill payer's number and add/edit/remove extra contacts. Saves go straight
 * to the existing family_contacts / bill_payers records — nothing here is a
 * separate copy of the data. */
export function FamilyContactsManager({ families }: { families: ManagedFamily[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) =>
      [f.billPayerName, ...f.children.map((c) => c.name), ...f.contacts.map((c) => c.full_name)].some((text) =>
        text.toLowerCase().includes(q)
      )
    );
  }, [families, query]);

  return (
    <div className="flex flex-col gap-3">
      <datalist id="family-relationship-options">
        <option value="Mother" />
        <option value="Father" />
        <option value="Stepparent" />
        <option value="Guardian" />
        <option value="Grandparent" />
        <option value="Emergency contact" />
        <option value="Other family member" />
      </datalist>

      <input
        type="search"
        className="input"
        placeholder="Search a child or family member…"
        aria-label="Search families"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {visible.length === 0 ? (
        <p className="card p-5 text-sm text-charcoal/50">No families match that search.</p>
      ) : (
        visible.map((family) => <FamilyCard key={family.key} family={family} />)
      )}
    </div>
  );
}
