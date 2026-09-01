import "server-only";
import { getSectionsWithCriteria } from "./checklist";
import { getEvidenceList } from "./evidence";
import { getActionsList } from "./actions";
import type { SectionWithCriteria } from "@/lib/types";
import type { EvidenceItem } from "@/lib/types";
import type { ActionItem } from "@/lib/types";

export type AuditPackData = {
  sections: SectionWithCriteria[];
  nonCompliant: SectionWithCriteria["criteria"];
  unsure: SectionWithCriteria["criteria"];
  actionsUnderway: ActionItem[];
  evidenceIndex: EvidenceItem[];
  generatedAt: string;
};

export async function getAuditPackData(): Promise<AuditPackData> {
  const [sections, evidenceIndex, actions] = await Promise.all([
    getSectionsWithCriteria(),
    getEvidenceList(),
    getActionsList(),
  ]);

  const allCriteria = sections.flatMap((s) => s.criteria);

  return {
    sections,
    nonCompliant: allCriteria.filter((c) => c.assessment.compliance_status === "no"),
    unsure: allCriteria.filter((c) => c.assessment.compliance_status === "unsure"),
    actionsUnderway: actions.filter((a) => a.status !== "completed"),
    evidenceIndex,
    generatedAt: new Date().toISOString(),
  };
}
