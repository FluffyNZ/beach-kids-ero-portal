"use client";

import { useTransition } from "react";
import { updateStaffPublishPermission } from "@/lib/actions/staff";

/** Whether this educator's Learning Stories publish immediately or need a
 * reviewer first. Deliberately labelled as a workflow setting, not access
 * control — see the comment on updateStaffPublishPermission. */
export function LearningStoryPermissionToggle({
  staffId,
  canPublishDirectly,
}: {
  staffId: string;
  canPublishDirectly: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={canPublishDirectly}
        disabled={pending}
        onChange={(e) => startTransition(() => updateStaffPublishPermission(staffId, e.target.checked))}
        className="mt-0.5 h-4 w-4 rounded border-charcoal/30 text-burgundy-500 focus:ring-burgundy-500"
      />
      <span>
        <span className="block text-sm font-medium text-charcoal">Can publish Learning Stories directly</span>
        <span className="block text-xs text-charcoal/50">
          Off by default — their stories go to Awaiting Approval instead of publishing straight away.
        </span>
      </span>
    </label>
  );
}
