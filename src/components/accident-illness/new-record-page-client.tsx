"use client";

import { useState } from "react";
import { PhotoBatchImportPanel } from "./photo-batch-import-panel";
import { RecordForm } from "./record-form";
import type { ChildMember, RosterRoom, StaffMember } from "@/lib/types";

export function NewRecordPageClient({
  allChildren,
  rooms,
  staff,
}: {
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  staff: StaffMember[];
}) {
  const [showManualForm, setShowManualForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PhotoBatchImportPanel allChildren={allChildren} rooms={rooms} staff={staff} />

      {showManualForm ? (
        <section className="card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            New record (filled in by hand)
          </h2>
          <RecordForm allChildren={allChildren} rooms={rooms} staff={staff} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualForm(true)}
          className="btn-ghost self-start text-sm"
        >
          Or fill one in by hand instead
        </button>
      )}
    </div>
  );
}
