"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export function StatusSelect<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => Promise<void>;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<T>(value);

  return (
    <select
      className={cn("input cursor-pointer", pending && "opacity-60", className)}
      value={optimistic}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as T;
        setOptimistic(next);
        startTransition(async () => {
          await onChange(next);
        });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
