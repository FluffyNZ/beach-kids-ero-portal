import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SECTION_META, STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import { percentage, daysUntil } from "@/lib/utils";
import { getNextDrillDue } from "@/lib/data/emergency-drills";
import { getOpenHazardsForDashboard } from "@/lib/data/hazard-checks";
import { HAZARD_RISK_LABEL } from "@/lib/constants";
import type { DashboardStats } from "@/lib/types";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

/** A criterion counts as fully ready when both its compliance position and
 * its supporting evidence are resolved — being compliant with an empty
 * evidence folder is deliberately NOT "done". */
function isCriterionReady(compliance: string, evidence: string) {
  return (compliance === "yes" || compliance === "na") && (evidence === "ready" || evidence === "not_required");
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const [{ data: sections }, { data: criteria }, { data: assessments }, { data: actions }, { data: evidence }] =
    await Promise.all([
      supabase.from("ero_sections").select("*").order("sort_order"),
      supabase.from("ero_criteria").select("id, section_id"),
      supabase.from("criterion_assessments").select("criterion_id, compliance_status, evidence_status"),
      supabase.from("actions").select("id, status, due_date"),
      supabase.from("evidence").select("id, review_date, expiry_date"),
    ]);

  const assessmentByCriterion = new Map((assessments ?? []).map((a) => [a.criterion_id, a]));

  const criteriaTotal = criteria?.length ?? 0;
  let criteriaCompleted = 0;
  let markedNo = 0;
  let markedUnsure = 0;
  let evidenceMissing = 0;

  (criteria ?? []).forEach((c) => {
    const a = assessmentByCriterion.get(c.id);
    const compliance = a?.compliance_status ?? "not_assessed";
    const evidenceStatus = a?.evidence_status ?? "missing";
    if (isCriterionReady(compliance, evidenceStatus)) criteriaCompleted += 1;
    if (compliance === "no") markedNo += 1;
    if (compliance === "unsure") markedUnsure += 1;
    if (evidenceStatus === "missing") evidenceMissing += 1;
  });

  const sectionStats = (sections ?? []).map((s) => {
    const sectionCriteria = (criteria ?? []).filter((c) => c.section_id === s.id);
    const total = sectionCriteria.length;
    const assessed = sectionCriteria.filter((c) => {
      const a = assessmentByCriterion.get(c.id);
      return isCriterionReady(a?.compliance_status ?? "not_assessed", a?.evidence_status ?? "missing");
    }).length;
    return {
      code: s.code,
      name: SECTION_META[s.code]?.short ?? s.name,
      percent: percentage(assessed, total),
      total,
      assessed,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openActions = (actions ?? []).filter((a) => a.status !== "completed");
  const overdueActions = openActions.filter((a) => a.due_date !== null && new Date(a.due_date) < today);

  const documentsApproachingReview = (evidence ?? []).filter((e) => {
    const reviewDays = daysUntil(e.review_date);
    const expiryDays = daysUntil(e.expiry_date);
    return (reviewDays !== null && reviewDays <= 90) || (expiryDays !== null && expiryDays <= 90);
  }).length;

  return {
    overallPercent: percentage(criteriaCompleted, criteriaTotal),
    sections: sectionStats,
    criteriaTotal,
    criteriaCompleted,
    criteriaRemaining: criteriaTotal - criteriaCompleted,
    markedNo,
    markedUnsure,
    evidenceMissing,
    openActions: openActions.length,
    overdueActions: overdueActions.length,
    documentsApproachingReview,
  };
}

export type NeedsAttentionItem = {
  kind:
    | "no"
    | "unsure"
    | "evidence_missing"
    | "action_overdue"
    | "document_expiring"
    | "staff_document_due"
    | "staff_review_due"
    | "emergency_drill_due"
    | "hazard_open";
  title: string;
  detail: string;
  href: string;
};

export async function getNeedsAttention(limit = 8): Promise<NeedsAttentionItem[]> {
  const supabase = createClient();

  const [
    { data: criteria },
    { data: assessments },
    { data: actions },
    { data: evidence },
    { data: activeStaff },
    { data: staffDocs },
    { data: staffQuals },
    nextDrillDue,
    openHazards,
  ] = await Promise.all([
    supabase.from("ero_criteria").select("id, code, title"),
    supabase.from("criterion_assessments").select("*"),
    supabase.from("actions").select("*").neq("status", "completed"),
    supabase.from("evidence").select("id, title, review_date, expiry_date"),
    supabase.from("staff").select("id, full_name").eq("status", "active"),
    supabase.from("staff_documents").select("id, staff_id, category, expiry_date").not("expiry_date", "is", null),
    supabase
      .from("staff_qualifications")
      .select("staff_id, next_review_date")
      .not("next_review_date", "is", null),
    getNextDrillDue(),
    getOpenHazardsForDashboard(),
  ]);

  const activeStaffById = new Map((activeStaff ?? []).map((s) => [s.id, s]));

  const criterionById = new Map((criteria ?? []).map((c) => [c.id, c]));
  const items: NeedsAttentionItem[] = [];

  (assessments ?? []).forEach((a) => {
    const criterion = criterionById.get(a.criterion_id);
    if (!criterion) return;
    if (a.compliance_status === "no") {
      items.push({
        kind: "no",
        title: `${criterion.code} — ${criterion.title}`,
        detail: "Marked non-compliant",
        href: `/checklist/${criterion.code}`,
      });
    } else if (a.compliance_status === "unsure") {
      items.push({
        kind: "unsure",
        title: `${criterion.code} — ${criterion.title}`,
        detail: "Marked unsure",
        href: `/checklist/${criterion.code}`,
      });
    }
    if (a.evidence_status === "missing" && a.compliance_status !== "not_assessed") {
      items.push({
        kind: "evidence_missing",
        title: `${criterion.code} — ${criterion.title}`,
        detail: "Evidence missing",
        href: `/checklist/${criterion.code}`,
      });
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  (actions ?? [])
    .filter((a) => a.due_date && new Date(a.due_date) < today)
    .forEach((a) => {
      const criterion = criterionById.get(a.criterion_id);
      items.push({
        kind: "action_overdue",
        title: a.description,
        detail: `Overdue — was due ${a.due_date}${criterion ? ` (${criterion.code})` : ""}`,
        href: criterion ? `/checklist/${criterion.code}` : "/actions",
      });
    });

  (evidence ?? []).forEach((e) => {
    const reviewDays = daysUntil(e.review_date);
    const expiryDays = daysUntil(e.expiry_date);
    const soonest = [reviewDays, expiryDays].filter((d): d is number => d !== null).sort((a, b) => a - b)[0];
    if (soonest !== undefined && soonest <= 30) {
      items.push({
        kind: "document_expiring",
        title: e.title,
        detail: soonest < 0 ? `Expired ${Math.abs(soonest)} day(s) ago` : `Due in ${soonest} day(s)`,
        href: "/evidence",
      });
    }
  });

  (staffDocs ?? []).forEach((d) => {
    const staffMember = activeStaffById.get(d.staff_id);
    if (!staffMember) return; // former staff don't clutter the dashboard
    const days = daysUntil(d.expiry_date);
    if (days !== null && days <= 30) {
      items.push({
        kind: "staff_document_due",
        title: `${staffMember.full_name} — ${STAFF_DOCUMENT_CATEGORY_LABEL[d.category as StaffDocumentCategory]}`,
        detail: days < 0 ? `Expired ${Math.abs(days)} day(s) ago` : `Due in ${days} day(s)`,
        href: `/staff/${staffMember.id}`,
      });
    }
  });

  (staffQuals ?? []).forEach((q) => {
    const staffMember = activeStaffById.get(q.staff_id);
    if (!staffMember) return;
    const days = daysUntil(q.next_review_date);
    if (days !== null && days <= 30) {
      items.push({
        kind: "staff_review_due",
        title: `${staffMember.full_name} — Qualification review`,
        detail: days < 0 ? `Overdue by ${Math.abs(days)} day(s)` : `Due in ${days} day(s)`,
        href: `/staff/${staffMember.id}`,
      });
    }
  });

  const drillDueDays = daysUntil(nextDrillDue.nextDueDate);
  if (nextDrillDue.lastDrillDate === null || (drillDueDays !== null && drillDueDays <= 30)) {
    items.push({
      kind: "emergency_drill_due",
      title: "Emergency drill due",
      detail:
        nextDrillDue.lastDrillDate === null
          ? "No drill has been logged yet"
          : drillDueDays !== null && drillDueDays < 0
            ? `Overdue by ${Math.abs(drillDueDays)} day(s)`
            : `Due in ${drillDueDays} day(s)`,
      href: "/emergency-drills",
    });
  }

  // Only an unresolved hazard log entry becomes a job here — a routine
  // tick-box left unchecked on a Daily Hazard Checklist usually just means
  // "not checked yet today", not a real flagged hazard.
  openHazards.forEach((h) => {
    items.push({
      kind: "hazard_open",
      title: `${h.room_name} — ${h.hazard_description}`,
      detail: `${HAZARD_RISK_LABEL[h.risk_level]} risk, logged ${h.check_date}`,
      href: `/records/hazards/${h.check_id}`,
    });
  });

  const priority: Record<NeedsAttentionItem["kind"], number> = {
    action_overdue: 0,
    hazard_open: 0,
    document_expiring: 1,
    staff_document_due: 1,
    staff_review_due: 2,
    emergency_drill_due: 2,
    no: 3,
    evidence_missing: 4,
    unsure: 5,
  };

  return items.sort((a, b) => priority[a.kind] - priority[b.kind]).slice(0, limit);
}
