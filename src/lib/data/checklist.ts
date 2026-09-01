import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import {
  DEFAULT_ASSESSMENT,
  type Assessment,
  type CriterionWithAssessment,
  type SectionWithCriteria,
} from "@/lib/types";

export async function getSectionsWithCriteria(options?: {
  search?: string;
  section?: string;
  flaggedOnly?: boolean;
}): Promise<SectionWithCriteria[]> {
  const supabase = createClient();

  let sectionsQuery = supabase.from("ero_sections").select("*").order("sort_order");
  if (options?.section) {
    sectionsQuery = sectionsQuery.eq("code", options.section);
  }

  let criteriaQuery = supabase.from("ero_criteria").select("*").order("sort_order");
  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    criteriaQuery = criteriaQuery.or(
      `code.ilike.%${term}%,title.ilike.%${term}%,official_requirement.ilike.%${term}%`
    );
  }

  const [{ data: sections }, { data: criteria }, { data: assessments }, { data: links }, { data: openActions }] =
    await Promise.all([
      sectionsQuery,
      criteriaQuery,
      supabase.from("criterion_assessments").select("*"),
      supabase.from("evidence_criteria_links").select("criterion_id"),
      supabase.from("actions").select("criterion_id").neq("status", "completed"),
    ]);

  const profiles = await getProfilesMap();

  const assessmentByCriterion = new Map<string, Assessment>();
  (assessments ?? []).forEach((a) => {
    assessmentByCriterion.set(a.criterion_id, {
      criterion_id: a.criterion_id,
      compliance_status: a.compliance_status,
      evidence_status: a.evidence_status,
      management_notes: a.management_notes,
      is_flagged: a.is_flagged,
      flag_notes: a.flag_notes,
      last_reviewed_at: a.last_reviewed_at,
      next_review_date: a.next_review_date,
      reviewed_by_name: a.reviewed_by ? profiles.get(a.reviewed_by)?.full_name ?? null : null,
      updated_at: a.updated_at,
    });
  });

  const evidenceCountByCriterion = new Map<string, number>();
  (links ?? []).forEach((l) => {
    evidenceCountByCriterion.set(l.criterion_id, (evidenceCountByCriterion.get(l.criterion_id) ?? 0) + 1);
  });

  const openActionsByCriterion = new Map<string, number>();
  (openActions ?? []).forEach((a) => {
    openActionsByCriterion.set(a.criterion_id, (openActionsByCriterion.get(a.criterion_id) ?? 0) + 1);
  });

  const criteriaBySection = new Map<string, CriterionWithAssessment[]>();
  (criteria ?? []).forEach((c) => {
    const enriched: CriterionWithAssessment = {
      ...c,
      assessment: assessmentByCriterion.get(c.id) ?? { criterion_id: c.id, ...DEFAULT_ASSESSMENT },
      evidence_count: evidenceCountByCriterion.get(c.id) ?? 0,
      open_actions_count: openActionsByCriterion.get(c.id) ?? 0,
    };
    if (options?.flaggedOnly && !enriched.assessment.is_flagged) return;
    const bucket = criteriaBySection.get(c.section_id) ?? [];
    bucket.push(enriched);
    criteriaBySection.set(c.section_id, bucket);
  });

  return (sections ?? []).map((s) => ({
    ...s,
    criteria: criteriaBySection.get(s.id) ?? [],
  }));
}

export async function getFlaggedCriteriaCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("criterion_assessments")
    .select("id", { count: "exact", head: true })
    .eq("is_flagged", true);
  return count ?? 0;
}

export async function getCriterionByCode(code: string): Promise<{
  criterion: CriterionWithAssessment;
  section: { id: string; code: string; name: string };
} | null> {
  const supabase = createClient();

  const { data: criterion } = await supabase
    .from("ero_criteria")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!criterion) return null;

  const [{ data: section }, { data: assessment }, { data: links }, { data: openActions }] = await Promise.all([
    supabase.from("ero_sections").select("id, code, name").eq("id", criterion.section_id).maybeSingle(),
    supabase.from("criterion_assessments").select("*").eq("criterion_id", criterion.id).maybeSingle(),
    supabase.from("evidence_criteria_links").select("id").eq("criterion_id", criterion.id),
    supabase.from("actions").select("id").eq("criterion_id", criterion.id).neq("status", "completed"),
  ]);

  const profiles = await getProfilesMap();

  const enrichedAssessment: Assessment = assessment
    ? {
        criterion_id: assessment.criterion_id,
        compliance_status: assessment.compliance_status,
        evidence_status: assessment.evidence_status,
        management_notes: assessment.management_notes,
        is_flagged: assessment.is_flagged,
        flag_notes: assessment.flag_notes,
        last_reviewed_at: assessment.last_reviewed_at,
        next_review_date: assessment.next_review_date,
        reviewed_by_name: assessment.reviewed_by
          ? profiles.get(assessment.reviewed_by)?.full_name ?? null
          : null,
        updated_at: assessment.updated_at,
      }
    : { criterion_id: criterion.id, ...DEFAULT_ASSESSMENT };

  return {
    criterion: {
      ...criterion,
      assessment: enrichedAssessment,
      evidence_count: links?.length ?? 0,
      open_actions_count: openActions?.length ?? 0,
    },
    section: section ?? { id: criterion.section_id, code: "", name: "" },
  };
}
