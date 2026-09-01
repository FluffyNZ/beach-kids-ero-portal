"use client";

import { useState } from "react";
import { NewPolicyModal } from "./new-policy-modal";
import { PlusIcon } from "@/components/icons";

export function NewPolicyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        New policy
      </button>
      <NewPolicyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
