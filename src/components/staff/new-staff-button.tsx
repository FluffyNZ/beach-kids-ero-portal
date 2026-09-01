"use client";

import { useState } from "react";
import { NewStaffModal } from "./new-staff-modal";
import { PlusIcon } from "@/components/icons";

export function NewStaffButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        Add staff member
      </button>
      <NewStaffModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
