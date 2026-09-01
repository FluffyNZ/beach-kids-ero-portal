import { getAuditPackData } from "@/lib/data/audit-pack";
import { StatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/audit-pack/print-button";
import {
  COMPLIANCE_LABEL,
  EVIDENCE_STATUS_LABEL,
  ACTION_PRIORITY_LABEL,
  complianceTone,
  evidenceTone,
  priorityTone,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPackPage() {
  const data = await getAuditPackData();
  const allCriteria = data.sections.flatMap((s) => s.criteria);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 print:max-w-none">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">
            Beach Kids ERO Self-Audit Summary
          </h1>
          <p className="mt-1 text-sm text-ocean-500">Generated {formatDateTime(data.generatedAt)}</p>
        </div>
        <PrintButton />
      </div>

      {allCriteria.length === 0 && (
        <div className="card border-ocean-200 bg-ocean-50/60 p-5 text-sm text-ocean-700">
          No ERO criteria are loaded yet — this pack will populate automatically once the official checklist has
          been seeded.
        </div>
      )}

      {data.sections.map((section) => (
        <section key={section.id} className="break-inside-avoid">
          <h2 className="mb-3 font-display text-lg font-semibold text-ocean-950">
            {section.code} — {section.name}
          </h2>
          {section.criteria.length === 0 ? (
            <p className="text-sm text-ocean-500">No criteria in this section.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ocean-50 text-xs uppercase tracking-wide text-ocean-500">
                    <th className="px-4 py-3 font-medium">Criterion</th>
                    <th className="px-4 py-3 font-medium">Official requirement</th>
                    <th className="px-4 py-3 font-medium">Compliance</th>
                    <th className="px-4 py-3 font-medium">Evidence</th>
                    <th className="px-4 py-3 font-medium"># Evidence</th>
                    <th className="px-4 py-3 font-medium">Open actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ocean-50">
                  {section.criteria.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-ocean-900">{c.code}</td>
                      <td className="max-w-md px-4 py-3 text-ocean-700">{c.official_requirement}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={complianceTone(c.assessment.compliance_status)}>
                          {COMPLIANCE_LABEL[c.assessment.compliance_status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={evidenceTone(c.assessment.evidence_status)}>
                          {EVIDENCE_STATUS_LABEL[c.assessment.evidence_status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-ocean-700">{c.evidence_count}</td>
                      <td className="px-4 py-3 text-ocean-700">{c.open_actions_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className="break-inside-avoid">
        <h2 className="mb-3 font-display text-lg font-semibold text-ocean-950">
          Areas of Self-Identified Non-Compliance
        </h2>
        {data.nonCompliant.length === 0 ? (
          <p className="text-sm text-ocean-500">None recorded.</p>
        ) : (
          <ul className="card divide-y divide-ocean-50">
            {data.nonCompliant.map((c) => (
              <li key={c.id} className="px-5 py-3">
                <p className="text-sm font-medium text-ocean-950">{c.code} — {c.title}</p>
                {c.assessment.management_notes && (
                  <p className="mt-0.5 text-xs text-ocean-500">{c.assessment.management_notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 font-display text-lg font-semibold text-ocean-950">Corrective Actions Underway</h2>
        {data.actionsUnderway.length === 0 ? (
          <p className="text-sm text-ocean-500">No open actions.</p>
        ) : (
          <ul className="card divide-y divide-ocean-50">
            {data.actionsUnderway.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ocean-950">
                    {a.criterion_code} — {a.description}
                  </p>
                  <p className="text-xs text-ocean-500">
                    {a.responsible_person} · due {formatDate(a.due_date)}
                  </p>
                </div>
                <StatusBadge tone={priorityTone(a.priority)}>{ACTION_PRIORITY_LABEL[a.priority]}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 font-display text-lg font-semibold text-ocean-950">Items Marked Unsure</h2>
        {data.unsure.length === 0 ? (
          <p className="text-sm text-ocean-500">None recorded.</p>
        ) : (
          <ul className="card divide-y divide-ocean-50">
            {data.unsure.map((c) => (
              <li key={c.id} className="px-5 py-3 text-sm font-medium text-ocean-950">
                {c.code} — {c.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 font-display text-lg font-semibold text-ocean-950">Evidence Index</h2>
        {data.evidenceIndex.length === 0 ? (
          <p className="text-sm text-ocean-500">No evidence uploaded yet.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-ocean-50 text-xs uppercase tracking-wide text-ocean-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Linked criteria</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {data.evidenceIndex.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-ocean-900">{e.title}</td>
                    <td className="px-4 py-3 text-ocean-700">{e.category ?? "—"}</td>
                    <td className="px-4 py-3 text-ocean-700">
                      {e.linked_criteria.map((l) => l.code).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-ocean-700">{formatDate(e.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
