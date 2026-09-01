import { StatusBadge } from "@/components/status-badge";
import { VersionRowActions } from "./version-row-actions";
import { approvePolicyVersion } from "@/lib/actions/policies";
import { POLICY_VERSION_STATUS_LABEL, policyVersionTone } from "@/lib/constants";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import type { PolicyVersion } from "@/lib/types";

export function VersionHistory({
  policyId,
  versions,
  currentVersionId,
}: {
  policyId: string;
  versions: PolicyVersion[];
  currentVersionId: string | null;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-charcoal/50">No versions uploaded yet.</p>;
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {versions.map((v) => {
        const isCurrent = v.id === currentVersionId;
        return (
          <div key={v.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal">Version {v.version_number}</p>
                {isCurrent && <StatusBadge tone="ready">Current</StatusBadge>}
                <StatusBadge tone={policyVersionTone(v.status)}>{POLICY_VERSION_STATUS_LABEL[v.status]}</StatusBadge>
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {v.original_filename} · {formatFileSize(v.file_size_bytes)} · uploaded{" "}
                {formatDateTime(v.created_at)}
                {v.created_by_name ? ` by ${v.created_by_name}` : ""}
              </p>
              {v.change_summary && <p className="mt-1 text-xs text-charcoal/60">{v.change_summary}</p>}
              {v.status === "approved" && v.approved_at && (
                <p className="mt-0.5 text-xs text-charcoal/40">
                  Approved {formatDateTime(v.approved_at)}{v.approved_by_name ? ` by ${v.approved_by_name}` : ""}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {v.status === "draft" && (
                <form action={approvePolicyVersion.bind(null, policyId, v.id)}>
                  <button type="submit" className="btn-secondary">
                    Approve
                  </button>
                </form>
              )}
              <VersionRowActions storagePath={v.storage_path} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
