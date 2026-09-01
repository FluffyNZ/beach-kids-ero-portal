"use client";

import { useState, useTransition } from "react";
import { STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import type { StaffContractType } from "@/lib/supabase/database.types";

export function StaffDetailsForm({
  fullName: initialFullName,
  role: initialRole,
  startDate: initialStartDate,
  endDate: initialEndDate,
  contractType: initialContractType,
  payRate: initialPayRate,
  minHours: initialMinHours,
  onSave,
}: {
  fullName: string;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  contractType: StaffContractType | null;
  payRate: number | null;
  minHours: number | null;
  onSave: (fields: {
    full_name?: string;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    contract_type?: StaffContractType | null;
    pay_rate?: number | null;
    min_hours?: number | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [role, setRole] = useState(initialRole ?? "");
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [contractType, setContractType] = useState<StaffContractType | "">(initialContractType ?? "");
  const [payRate, setPayRate] = useState(initialPayRate !== null ? String(initialPayRate) : "");
  const [minHours, setMinHours] = useState(initialMinHours !== null ? String(initialMinHours) : "");

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Full name</label>
        <input
          className="input"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Role</label>
        <input
          className="input"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div>
          <label className="label">End date</label>
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      <div>
        <label className="label">Contract type</label>
        <select
          className="input"
          value={contractType}
          onChange={(e) => {
            setContractType(e.target.value as StaffContractType | "");
            markDirty();
          }}
        >
          <option value="">Not set</option>
          {STAFF_CONTRACT_TYPES.map((c) => (
            <option key={c} value={c}>
              {STAFF_CONTRACT_TYPE_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Current pay rate ($/hour)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            placeholder="e.g. 28.50"
            value={payRate}
            onChange={(e) => {
              setPayRate(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div>
          <label className="label">Minimum hours (per week)</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="input"
            placeholder="e.g. 20"
            value={minHours}
            onChange={(e) => {
              setMinHours(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await onSave({
                  full_name: fullName,
                  role: role || null,
                  start_date: startDate || null,
                  end_date: endDate || null,
                  contract_type: contractType || null,
                  pay_rate: payRate !== "" ? Number(payRate) : null,
                  min_hours: minHours !== "" ? Number(minHours) : null,
                });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving these details.");
              }
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
