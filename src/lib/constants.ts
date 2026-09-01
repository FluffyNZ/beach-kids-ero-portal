import type {
  ActionPriority,
  ActionStatusValue,
  ComplianceStatus,
  EvidenceStatusValue,
  PolicyStatus,
  PolicyVersionStatus,
  PolicyReviewCycle,
  StaffStatus,
  StaffDocumentCategory,
  StaffContractType,
  EmergencyDrillType,
  StaffQualificationStatus,
} from "@/lib/supabase/database.types";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/checklist", label: "ERO Checklist", icon: "checklist" },
  { href: "/evidence", label: "Evidence Library", icon: "library" },
  { href: "/policies", label: "Policies", icon: "policies" },
  { href: "/staff", label: "Staff", icon: "staff" },
  { href: "/actions", label: "Actions", icon: "actions" },
  { href: "/audit-pack", label: "Audit Pack", icon: "pack" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

// Aligned with the four official ERO sections, since that's how Beach
// Kids' own policy review calendar organises things — plus a catch-all.
export const POLICY_CATEGORIES = [
  "Curriculum",
  "Premises & Facilities",
  "Health & Safety",
  "Governance, Management & Administration",
  "Other",
];

export const REVIEW_CYCLE_LABEL: Record<PolicyReviewCycle, string> = {
  annual: "Annual",
  biannual: "Bi-annual",
  three_yearly: "3 yearly",
};

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const POLICY_VERSION_STATUS_LABEL: Record<PolicyVersionStatus, string> = {
  draft: "Draft",
  approved: "Approved",
};

export function policyVersionTone(status: PolicyVersionStatus): StatusTone {
  return status === "approved" ? "ready" : "attention";
}

export const STAFF_STATUS_LABEL: Record<StaffStatus, string> = {
  active: "Active",
  former: "Former staff",
};

export const STAFF_CONTRACT_TYPES: StaffContractType[] = [
  "permanent",
  "fixed_term",
  "casual",
  "relief",
  "director",
];

export const STAFF_CONTRACT_TYPE_LABEL: Record<StaffContractType, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed-term",
  casual: "Casual",
  relief: "Relief",
  director: "Director",
};

// A distinct colour per contract type so they're distinguishable at a
// glance on the staff list, not just by their text label.
export const STAFF_CONTRACT_TYPE_BADGE: Record<StaffContractType, string> = {
  permanent: "bg-kelp-50 text-kelp-600",
  fixed_term: "bg-orange-50 text-orange-600",
  casual: "bg-blue-50 text-blue-600",
  relief: "bg-yellow-50 text-yellow-600",
  director: "bg-purple-50 text-purple-600",
};

export const STAFF_QUALIFICATION_STATUSES: StaffQualificationStatus[] = ["not_qualified", "qualified", "studying"];

export const STAFF_QUALIFICATION_STATUS_LABEL: Record<StaffQualificationStatus, string> = {
  not_qualified: "Not qualified",
  qualified: "Qualified",
  studying: "Student (in training)",
};

export function staffQualificationTone(status: StaffQualificationStatus): StatusTone {
  switch (status) {
    case "qualified":
      return "ready";
    case "studying":
      return "attention";
    case "not_qualified":
    default:
      return "neutral";
  }
}

export const EMERGENCY_DRILL_TYPES: EmergencyDrillType[] = [
  "fire_evacuation",
  "earthquake",
  "tsunami",
  "lockdown",
  "other",
];

export const EMERGENCY_DRILL_TYPE_LABEL: Record<EmergencyDrillType, string> = {
  fire_evacuation: "Fire evacuation",
  earthquake: "Earthquake (drop, cover, hold)",
  tsunami: "Tsunami",
  lockdown: "Lockdown",
  other: "Other",
};

// The fixed set of documents every staff profile needs on file — this is
// what the Required Documents ring on each profile is built from. Order
// here is the display order on the profile.
export const REQUIRED_STAFF_DOCUMENT_CATEGORIES: StaffDocumentCategory[] = [
  "contract",
  "police_vet",
  "staff_profile_form",
  "identification",
  "secondary_identification",
  "induction",
  "tax_kiwisaver",
  "cv_interview",
  "job_description",
];

// Two more required documents, only once someone is ticked "Qualified" in
// their Qualifications & pay parity section.
export const REQUIRED_QUALIFIED_DOCUMENT_CATEGORIES: StaffDocumentCategory[] = [
  "qualification",
  "pay_parity_agreement",
];

export function getRequiredStaffDocumentCategories(
  qualificationStatus: StaffQualificationStatus
): StaffDocumentCategory[] {
  if (qualificationStatus === "qualified") {
    // Qualified staff aren't required to have a Police Verification on
    // file here — swap in the 2 qualified-only documents instead.
    const base = REQUIRED_STAFF_DOCUMENT_CATEGORIES.filter((c) => c !== "police_vet");
    return [...base, ...REQUIRED_QUALIFIED_DOCUMENT_CATEGORIES];
  }
  return REQUIRED_STAFF_DOCUMENT_CATEGORIES;
}

// Everything else — optional extras, offered in the "Other documents"
// upload dropdown rather than counted toward the required-documents ring.
// cv_work_history/interview_recruitment are older enum values superseded
// by the combined "CV & Interview" required category above — deliberately
// left out of this list, same as before (see migration 0009).
export const STAFF_DOCUMENT_CATEGORIES: StaffDocumentCategory[] = [
  "first_aid",
  "visa_work_entitlement",
  "child_protection",
  "professional_growth_cycle",
  "other",
];

export const STAFF_DOCUMENT_CATEGORY_LABEL: Record<StaffDocumentCategory, string> = {
  contract: "Contract",
  identification: "Identification",
  police_vet: "Police Verification",
  child_protection: "Child protection",
  first_aid: "First aid certificate",
  qualification: "Qualification & Teacher Registration",
  visa_work_entitlement: "Visa / work entitlement",
  professional_growth_cycle: "Professional Growth Cycle record",
  staff_profile_form: "Staff Profile Form",
  cv_work_history: "CV / work history",
  job_description: "Job Description",
  interview_recruitment: "Interview / recruitment evidence",
  induction: "Induction",
  tax_kiwisaver: "Tax & KiwiSaver",
  cv_interview: "CV & Interview",
  pay_parity_agreement: "Pay Parity Agreement",
  secondary_identification: "Identification (2nd form)",
  other: "Other",
};

export const SECTION_META: Record<string, { short: string; blurb: string }> = {
  C: { short: "Curriculum", blurb: "Teaching, learning and Te Whāriki." },
  PF: { short: "Premises & Facilities", blurb: "The physical environment." },
  HS: { short: "Health & Safety", blurb: "Health, safety and wellbeing." },
  GMA: {
    short: "Governance, Management & Administration",
    blurb: "Governance, management and administration.",
  },
};

export const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  not_assessed: "Not Assessed",
  yes: "Yes",
  no: "No",
  unsure: "Unsure",
  na: "N/A",
};

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatusValue, string> = {
  missing: "Missing",
  partial: "Partial",
  ready: "Ready",
  not_required: "Not Required",
};

export const ACTION_PRIORITY_LABEL: Record<ActionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ACTION_STATUS_LABEL: Record<ActionStatusValue, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
};

// Status "tone" drives the shared green/amber/red/grey colour language used
// across the dashboard, checklist and audit pack.
export type StatusTone = "ready" | "attention" | "action" | "neutral";

export function complianceTone(status: ComplianceStatus): StatusTone {
  switch (status) {
    case "yes":
      return "ready";
    case "unsure":
      return "attention";
    case "no":
      return "action";
    case "na":
    case "not_assessed":
    default:
      return "neutral";
  }
}

export function evidenceTone(status: EvidenceStatusValue): StatusTone {
  switch (status) {
    case "ready":
      return "ready";
    case "partial":
      return "attention";
    case "missing":
      return "action";
    case "not_required":
    default:
      return "neutral";
  }
}

export function priorityTone(priority: ActionPriority): StatusTone {
  switch (priority) {
    case "critical":
      return "action";
    case "high":
      return "attention";
    case "medium":
      return "neutral";
    case "low":
    default:
      return "neutral";
  }
}

export const REVIEW_WINDOWS = [30, 60, 90] as const;

export const EVIDENCE_CATEGORIES = [
  "Policy",
  "Procedure",
  "First Aid",
  "Police Vet / Safety Check",
  "Practising Certificate",
  "Fire & Emergency",
  "Building / WOF",
  "Enrolment",
  "Attendance",
  "Curriculum",
  "HR / Staff File",
  "Visa / Work Entitlement",
  "Governance",
  "Photo Evidence",
  "Other",
];
