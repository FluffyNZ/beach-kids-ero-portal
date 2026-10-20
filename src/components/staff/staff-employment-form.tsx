"use client";

import { useState, useTransition } from "react";
import { STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import type { StaffContractType } from "@/lib/supabase/database.types";
import type { RosterRoom, StaffAccessLevel } from "@/lib/types";

export function StaffEmploymentForm({
  fullName: initialFullName,
  role: initialRole,
  startDate: initialStartDate,
  endDate: initialEndDate,
  contractType: initialContractType,
  payRate: initialPayRate,
  minHours: initialMinHours,
  roomId: initialRoomId,
  isRelief: initialIsRelief,
  taxCode: initialTaxCode,
  rooms,
  accessLevel,
  onSave,
}: {
  fullName: string;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  contractType: StaffContractType | null;
  payRate: number | null;
  minHours: number | null;
  roomId: string | null;
  isRelief: boolean;
  taxCode: string | null;
  rooms: RosterRoom[];
  accessLevel: StaffAccessLevel;
  onSave: (fields: {
    full_name?: string;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    contract_type?: StaffContractType | null;
    pay_rate?: number | null;
    min_hours?: number | null;
    room_id?: string | null;
    is_relief?: boolean;
    tax_code?: string | null;
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
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [isRelief, setIsRelief] = useState(initialIsRelief);
  const [taxCode, setTaxCode] = useState(initialTaxCode ?? "");

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div>
          <label className="label">Room</label>
          <select
            className="input"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              markDirty();
            }}
          >
            <option value="">Not assigned</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={isRelief}
          onChange={(e) => {
            setIsRelief(e.target.checked);
            markDirty();
          }}
        />
        <span>
          Relief / casual
          <span className="block text-xs font-normal text-charcoal/50">
            Shows under &quot;Relief&quot; instead of &quot;Float&quot; on the Weekly roster when they have no room
            set above. Doesn&apos;t change which room they&apos;re actually rostered to on any given shift.
          </span>
        </span>
      </label>

      <div>
        <label className="label">Employment type</label>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contracted hours (per week)</label>
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
        <div>
          <label className="label">
            Current pay rate ($/hour) <span className="text-charcoal/40">— restricted</span>
          </label>
          {accessLevel === "full" ? (
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
          ) : (
            <p className="input flex items-center bg-charcoal/[0.03] text-charcoal/40">
              Restricted — authorised management only
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tax code</label>
          <input
            className="input"
            placeholder="e.g. M, S, SL"
            value={taxCode}
            onChange={(e) => {
              setTaxCode(e.target.value);
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
                  min_hours: minHours !== "" ? Number(minHours) : null,
                  room_id: roomId || null,
                  is_relief: isRelief,
                  tax_code: taxCode.trim() || null,
                  ...(accessLevel === "full" ? { pay_rate: payRate !== "" ? Number(payRate) : null } : {}),
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
