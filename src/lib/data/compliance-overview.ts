import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getNextDrillDue } from "@/lib/data/emergency-drills";
import { getAccidentIllnessCountThisMonth } from "@/lib/data/accident-illness";
import { getChecksDueTodayCount, getOpenHazardCount, getHighRiskOpenHazardCount } from "@/lib/data/hazard-checks";
import { getDeadlineAlert } from "@/lib/evidence-deadline";

export type ComplianceOverviewStat = {
  key: string;
  label: string;
  /** null = genuinely not tracked yet (the underlying module doesn't exist
   * yet) — rendered as "—", never as a fabricated 0. */
  value: number | null;
  tone: "ready" | "attention" | "action" | "neutral";
  note?: string;
};

/**
 * The Compliance Overview strip at the top of /records. Every number here
 * is either computed from data that genuinely already exists in the app
 * (emergency drills, staff document expiries, ERO checklist actions) or is
 * left as an honest "not tracked yet" — nothing is invented just to fill a
 * box. As the remaining Records & Compliance modules get built, more of
 * these will turn into real counts.
 */
export async function getComplianceOverview(): Promise<ComplianceOverviewStat[]> {
  const supabase = createClient();

  const [
    { lastDrillDate, nextDueDate },
    { data: staffDocs },
    { data: actionRows },
    accidentIllnessThisMonth,
    checksDueToday,
    openHazards,
    highRiskHazards,
  ] = await Promise.all([
    getNextDrillDue(),
    supabase.from("staff_documents").select("expiry_date").not("expiry_date", "is", null),
    supabase.from("actions").select("id, status, due_date").neq("status", "completed"),
    getAccidentIllnessCountThisMonth(),
    getChecksDueTodayCount(),
    getOpenHazardCount(),
    getHighRiskOpenHazardCount(),
  ]);

  const drillAlert = getDeadlineAlert(null, nextDueDate);
  const emergencyDrillsDueSoon = lastDrillDate === null ? 1 : drillAlert ? 1 : 0;

  const staffComplianceExpiringSoon = (staffDocs ?? []).filter(
    (d) => getDeadlineAlert(null, d.expiry_date) !== null
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueActions = (actionRows ?? []).filter((a) => a.due_date !== null && new Date(a.due_date) < today).length;

  return [
    {
      key: "checks_due_today",
      label: "Checks due today",
      value: checksDueToday,
      tone: checksDueToday > 0 ? "attention" : "ready",
      note: "Rooms without a signed-off Daily Hazard Checklist for today",
    },
    {
      key: "open_hazards",
      label: "Open hazards",
      value: openHazards,
      tone: openHazards > 0 ? "action" : "ready",
      note: "From the Hazard Register",
    },
    {
      key: "high_risk_hazards",
      label: "High-risk hazards",
      value: highRiskHazards,
      tone: highRiskHazards > 0 ? "action" : "ready",
      note: "From the Hazard Register",
    },
    {
      key: "accident_illness_records_this_month",
      label: "Accident & illness records this month",
      value: accidentIllnessThisMonth,
      tone: "ready",
      note: "From the Accident & Illness Records module",
    },
    {
      key: "serious_incidents_requiring_review",
      label: "Serious incidents requiring review",
      value: null,
      tone: "neutral",
      note: "Serious Incident Records not built yet",
    },
    {
      key: "medication_requiring_action",
      label: "Medication records requiring action",
      value: null,
      tone: "neutral",
      note: "Medication Records not built yet",
    },
    {
      key: "overdue_actions",
      label: "Overdue actions",
      value: overdueActions,
      tone: overdueActions > 0 ? "action" : "ready",
      note: "From the existing ERO Checklist Actions register",
    },
    {
      key: "emergency_drills_due_soon",
      label: "Emergency drills due soon",
      value: emergencyDrillsDueSoon,
      tone: emergencyDrillsDueSoon > 0 ? "attention" : "ready",
      note: lastDrillDate ? undefined : "No drill has been logged yet",
    },
    {
      key: "staff_compliance_expiring_soon",
      label: "Staff compliance items expiring soon",
      value: staffComplianceExpiringSoon,
      tone: staffComplianceExpiringSoon > 0 ? "attention" : "ready",
    },
  ];
}
