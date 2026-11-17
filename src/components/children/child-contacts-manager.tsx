"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addChildContact,
  updateChildContact,
  deleteChildContact,
  type ChildContactFields,
  type ChildContactResult,
} from "@/lib/actions/contacts";
import type { ManagedChild, ManagedChildContact } from "@/lib/data/contact-directory";

type FormState = {
  full_name: string;
  relationship: string;
  phone: string;
  alt_phone: string;
  is_primary_caregiver: boolean;
  is_emergency_contact: boolean;
  can_pick_up: boolean;
  conditional_access: boolean;
  forbidden_access: boolean;
  notes: string;
};

type TextKey = "full_name" | "relationship" | "phone" | "alt_phone" | "notes";
type FlagKey = "is_primary_caregiver" | "is_emergency_contact" | "can_pick_up" | "conditional_access" | "forbidden_access";

const EMPTY_FORM: FormState = {
  full_name: "",
  relationship: "",
  phone: "",
  alt_phone: "",
  is_primary_caregiver: false,
  is_emergency_contact: false,
  can_pick_up: false,
  conditional_access: false,
  forbidden_access: false,
  notes: "",
};

function formFrom(contact: ManagedChildContact): FormState {
  return {
    full_name: contact.full_name,
    relationship: contact.relationship ?? "",
    phone: contact.phone ?? "",
    alt_phone: contact.alt_phone ?? "",
    is_primary_caregiver: contact.is_primary_caregiver,
    is_emergency_contact: contact.is_emergency_contact,
    can_pick_up: contact.can_pick_up,
    conditional_access: contact.conditional_access,
    forbidden_access: contact.forbidden_access,
    notes: contact.notes ?? "",
  };
}

function toFields(form: FormState): ChildContactFields {
  return {
    full_name: form.full_name,
    relationship: form.relationship,
    phone: form.phone,
    alt_phone: form.alt_phone,
    is_primary_caregiver: form.is_primary_caregiver,
    is_emergency_contact: form.is_emergency_contact,
    can_pick_up: form.can_pick_up,
    conditional_access: form.conditional_access,
    forbidden_access: form.forbidden_access,
    notes: form.notes,
  };
}

function Checkbox({
  id,
  label,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={`flex items-center gap-2 text-sm ${disabled ? "text-charcoal/35" : "text-charcoal"}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
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
  initial: FormState;
  submitLabel: string;
  pending: boolean;
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);

  function setText(key: TextKey, value: string) {
    setForm((current: FormState) => ({ ...current, [key]: value }));
  }

  function setFlag(key: FlagKey, value: boolean) {
    setForm((current: FormState) => {
      const next: FormState = { ...current, [key]: value };
      // Forbidden Access switches pick-up and emergency off, and keeps them off.
      if (next.forbidden_access) {
        next.can_pick_up = false;
        next.is_emergency_contact = false;
      }
      return next;
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-sand-50 p-4"
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${idPrefix}-name`}>
            Name
          </label>
          <input
            id={`${idPrefix}-name`}
            className="input"
            value={form.full_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText("full_name", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-rel`}>
            Relationship
          </label>
          <input
            id={`${idPrefix}-rel`}
            className="input"
            list="child-contact-relationship-options"
            value={form.relationship}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText("relationship", e.target.value)}
            placeholder="e.g. Mum, Grandmother"
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
            value={form.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-alt`}>
            Second number (optional)
          </label>
          <input
            id={`${idPrefix}-alt`}
            className="input"
            type="tel"
            inputMode="tel"
            value={form.alt_phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText("alt_phone", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Checkbox
          id={`${idPrefix}-pickup`}
          label="Can pick up"
          checked={form.can_pick_up}
          disabled={form.forbidden_access}
          onChange={(v: boolean) => setFlag("can_pick_up", v)}
        />
        <Checkbox
          id={`${idPrefix}-emergency`}
          label="Emergency contact"
          checked={form.is_emergency_contact}
          disabled={form.forbidden_access}
          onChange={(v: boolean) => setFlag("is_emergency_contact", v)}
        />
        <Checkbox
          id={`${idPrefix}-primary`}
          label="Primary caregiver"
          checked={form.is_primary_caregiver}
          onChange={(v: boolean) => setFlag("is_primary_caregiver", v)}
        />
        <Checkbox
          id={`${idPrefix}-conditional`}
          label="Conditional access"
          checked={form.conditional_access}
          onChange={(v: boolean) => setFlag("conditional_access", v)}
        />
        <Checkbox
          id={`${idPrefix}-forbidden`}
          label="FORBIDDEN ACCESS — must not be given this child"
          checked={form.forbidden_access}
          onChange={(v: boolean) => setFlag("forbidden_access", v)}
        />
      </div>

      <div>
        <label className="label" htmlFor={`${idPrefix}-notes`}>
          Notes (shown on the tablet)
        </label>
        <input
          id={`${idPrefix}-notes`}
          className="input"
          value={form.notes}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText("notes", e.target.value)}
        />
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

function ContactLine({
  contact,
  pending,
  confirmingRemove,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  contact: ManagedChildContact;
  pending: boolean;
  confirmingRemove: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  const numbers = [contact.phone, contact.alt_phone].filter(Boolean).join(" · ");
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 ${
        contact.forbidden_access ? "border-status-action bg-status-actionBg" : "border-charcoal/10"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">
          {contact.full_name}
          {contact.relationship && <span className="font-normal text-charcoal/50"> · {contact.relationship}</span>}
        </p>
        <p className="text-sm text-charcoal/70">{numbers || <span className="text-charcoal/40">No number on file</span>}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {contact.forbidden_access && <span className="badge bg-status-action text-white">Forbidden access</span>}
          {contact.can_pick_up && <span className="badge bg-status-readyBg text-status-ready">Can pick up</span>}
          {contact.conditional_access && (
            <span className="badge bg-status-attentionBg text-status-attention">Conditional access</span>
          )}
          {contact.is_primary_caregiver && <span className="badge bg-charcoal/5 text-charcoal/70">Primary caregiver</span>}
          {contact.is_emergency_contact && (
            <span className="badge bg-status-attentionBg text-status-attention">Emergency contact</span>
          )}
        </div>
        {contact.notes && <p className="mt-1 text-xs text-charcoal/50">{contact.notes}</p>}
      </div>
      {confirmingRemove ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-charcoal/60">Remove {contact.full_name}?</span>
          <button type="button" className="btn-danger px-3 py-1.5 text-xs" disabled={pending} onClick={onRemove}>
            {pending ? "Removing…" : "Yes, remove"}
          </button>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={pending} onClick={onCancelRemove}>
            Keep
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs text-status-action" onClick={onAskRemove}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function ChildCard({ child, forceOpen }: { child: ManagedChild; forceOpen: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const open = forceOpen || opened || adding || editingId !== null;
  const forbiddenCount = child.contacts.filter((c: ManagedChildContact) => c.forbidden_access).length;

  function run(action: () => Promise<ChildContactResult>, after: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      after();
      router.refresh();
    });
  }

  function save(form: FormState, existing: ManagedChildContact | null) {
    if (!form.full_name.trim()) {
      setError("Enter this contact's name.");
      return;
    }
    run(
      () => (existing ? updateChildContact(existing.id, toFields(form)) : addChildContact(child.id, toFields(form))),
      () => {
        setEditingId(null);
        setAdding(false);
      }
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 flex-wrap items-center gap-2 text-left"
          aria-expanded={open}
          onClick={() => setOpened((current: boolean) => !current)}
        >
          <h3 className="text-base font-semibold text-charcoal">{child.name}</h3>
          <span className="text-xs text-charcoal/50">
            {child.contacts.length} contact{child.contacts.length === 1 ? "" : "s"} {open ? "▲" : "▼"}
          </span>
          {child.contacts.length === 0 && <span className="badge bg-status-actionBg text-status-action">No contacts yet</span>}
          {forbiddenCount > 0 && <span className="badge bg-status-action text-white">Forbidden access on file</span>}
        </button>
        <Link href={`/children/${child.id}`} className="btn-ghost px-3 py-1.5 text-xs">
          Profile
        </Link>
      </div>

      {open && (
        <>
          {child.contacts.map((contact: ManagedChildContact) =>
            editingId === contact.id ? (
              <ContactForm
                key={contact.id}
                idPrefix={`edit-${contact.id}`}
                initial={formFrom(contact)}
                submitLabel="Save changes"
                pending={pending}
                onSubmit={(form: FormState) => save(form, contact)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ContactLine
                key={contact.id}
                contact={contact}
                pending={pending}
                confirmingRemove={removingId === contact.id}
                onEdit={() => setEditingId(contact.id)}
                onAskRemove={() => setRemovingId(contact.id)}
                onCancelRemove={() => setRemovingId(null)}
                onRemove={() => run(() => deleteChildContact(contact.id), () => setRemovingId(null))}
              />
            )
          )}

          {adding ? (
            <ContactForm
              idPrefix={`add-${child.id}`}
              initial={EMPTY_FORM}
              submitLabel="Add contact"
              pending={pending}
              onSubmit={(form: FormState) => save(form, null)}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button type="button" className="btn-secondary self-start px-3 py-1.5 text-xs" onClick={() => setAdding(true)}>
              + Add a contact
            </button>
          )}
        </>
      )}

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}
    </section>
  );
}

/** The "maintain the lists" side of the staff-room tablet: one card per
 * active child, where a manager can add, edit and remove that child's
 * contacts and set who can pick up, who is an emergency contact, and who is
 * Forbidden Access. Saves go straight to child_contacts — the same records
 * the tablet reads, so there's only ever one copy. */
export function ChildContactsManager({ childList }: { childList: ManagedChild[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return childList;
    return childList.filter((child: ManagedChild) =>
      [child.name, ...child.contacts.map((c: ManagedChildContact) => c.full_name)].some((value: string) =>
        value.toLowerCase().includes(q)
      )
    );
  }, [childList, query]);

  return (
    <div className="flex flex-col gap-3">
      <datalist id="child-contact-relationship-options">
        <option value="Mum" />
        <option value="Dad" />
        <option value="Grandmother" />
        <option value="Grandfather" />
        <option value="Aunt" />
        <option value="Uncle" />
        <option value="Sister" />
        <option value="Brother" />
        <option value="Whānau" />
        <option value="Friend" />
        <option value="Other" />
      </datalist>

      <input
        type="search"
        className="input"
        placeholder="Search a child or a contact's name…"
        aria-label="Search children"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />

      {visible.length === 0 ? (
        <p className="card p-5 text-sm text-charcoal/50">No children match that search.</p>
      ) : (
        visible.map((child: ManagedChild) => <ChildCard key={child.id} child={child} forceOpen={query.trim().length > 0} />)
      )}
    </div>
  );
}
