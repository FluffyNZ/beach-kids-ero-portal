import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicyById } from "@/lib/data/policies";
import { updatePolicyDetails, addPolicyVersion, setPolicyStatus } from "@/lib/actions/policies";
import { PolicyDetailsForm } from "@/components/policies/policy-details-form";
import { AddVersionButton } from "@/components/policies/add-version-button";
import { VersionHistory } from "@/components/policies/version-history";
import { VersionRowActions } from "@/components/policies/version-row-actions";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import { POLICY_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime, formatFileSize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({ params }: { params: { id: string } }) {
  const policy = await getPolicyById(params.id);
  if (!policy) notFound();

  const current = policy.current_version;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/policies" className="hover:text-charcoal">
          Policies
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{policy.title}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{policy.title}</h1>
            <StatusBadge tone={policy.status === "active" ? "ready" : "neutral"}>
              {POLICY_STATUS_LABEL[policy.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-charcoal/60">{policy.category ?? "Uncategorised"}</p>
        </div>
        <form action={setPolicyStatus.bind(null, policy.id, policy.status === "active" ? "archived" : "active")}>
          <button type="submit" className="btn-ghost">
            {policy.status === "active" ? "Archive policy" : "Restore policy"}
          </button>
        </form>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Current version</h2>
        {current ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal">Version {current.version_number}</p>
                <StatusBadge tone="ready">Approved</StatusBadge>
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {current.original_filename} · {formatFileSize(current.file_size_bytes)}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/40">
                Approved {formatDateTime(current.approved_at)}
                {current.approved_by_name ? ` by ${current.approved_by_name}` : ""}
              </p>
            </div>
            <VersionRowActions storagePath={current.storage_path} />
          </div>
        ) : (
          <p className="text-sm text-charcoal/50">
            No version has been approved yet — approve a version below to make it current.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Policy details</h2>
        <PolicyDetailsForm
          title={policy.title}
          category={policy.category}
          description={policy.description}
          reviewCycle={policy.review_cycle}
          nextReviewDate={policy.next_review_date}
          onSave={updatePolicyDetails.bind(null, policy.id)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-charcoal">Version history</h2>
          <AddVersionButton onUpload={addPolicyVersion.bind(null, policy.id)} />
        </div>
        <VersionHistory policyId={policy.id} versions={policy.versions} currentVersionId={current?.id ?? null} />
      </section>
    </div>
  );
}
