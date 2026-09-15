"use client";

import { useState } from "react";
import { NewChildModal } from "./new-child-modal";
import { PlusIcon } from "@/components/icons";
import type { RosterRoom } from "@/lib/types";

export function NewChildButton({
  rooms,
  billPayerOptions,
}: {
  rooms: RosterRoom[];
  billPayerOptions: Array<{ id: string; full_name: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        Add child
      </button>
      <NewChildModal open={open} onClose={() => setOpen(false)} rooms={rooms} billPayerOptions={billPayerOptions} />
    </>
  );
}
