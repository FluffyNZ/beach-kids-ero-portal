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
  ChildStatus,
  StockSupplier,
  FinanceIncomeSource,
  LearningStoryStatus,
  HazardCheckCategory,
  HazardRiskLevel,
} from "@/lib/supabase/database.types";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/checklist", label: "ERO Checklist", icon: "checklist" },
  { href: "/evidence", label: "Evidence Library", icon: "library" },
  { href: "/policies", label: "Policies", icon: "policies" },
  { href: "/records", label: "Records & Compliance", icon: "records" },
  { href: "/learning/stories", label: "Learning Stories", icon: "learning" },
  { href: "/staff", label: "Staff", icon: "staff" },
  { href: "/roster", label: "Roster", icon: "roster" },
  { href: "/children", label: "Children & Fees", icon: "children" },
  { href: "/stock-orders", label: "Stock Orders", icon: "stock" },
  { href: "/finances", label: "Finances", icon: "finances" },
  { href: "/actions", label: "Actions", icon: "actions" },
  { href: "/audit-pack", label: "Audit Pack", icon: "pack" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export const STOCK_SUPPLIERS: StockSupplier[] = ["gilmours", "qizzle", "clean_boss"];

export const STOCK_SUPPLIER_LABEL: Record<StockSupplier, string> = {
  gilmours: "Gilmours",
  qizzle: "Qizzle",
  clean_boss: "Clean Boss",
};

// Suggestions only, offered via a datalist on the outgoing form — not an
// enforced enum, since real overhead categories vary business to business
// and shouldn't be limited to a fixed list.
export const FINANCE_OUTGOING_CATEGORY_SUGGESTIONS = [
  "Rent",
  "Power",
  "Water",
  "Insurance",
  "Wages & PAYE",
  "Cleaning & Supplies",
  "Food & Kitchen",
  "Educational Resources",
  "Repairs & Maintenance",
  "Telephone & Internet",
  "Accounting & Professional Fees",
  "Bank Fees",
  "Vehicle",
  "Other",
];

export const FINANCE_INCOME_SOURCE_LABEL: Record<FinanceIncomeSource, string> = {
  moe_funding: "MOE Funding",
  parent_invoice: "Parent Invoice",
  other: "Other Income",
};

export const CHILD_STATUSES: ChildStatus[] = ["active", "left"];

export const CHILD_STATUS_LABEL: Record<ChildStatus, string> = {
  active: "Active",
  left: "No longer attending",
};

export function childStatusTone(status: ChildStatus): StatusTone {
  return status === "active" ? "ready" : "neutral";
}

// 20 Hours ECE is a government subsidy every child qualifies for from this
// age — not a per-child judgement call, so eligibility is derived from age
// rather than set manually (see isEceEligible below).
export const ECE_ELIGIBLE_AGE_YEARS = 3;

export function isEceEligible(ageYears: number | null): boolean {
  return ageYears !== null && ageYears >= ECE_ELIGIBLE_AGE_YEARS;
}

/** "1y 7m" style label from a child's stored age snapshot, matching the
 * format the source fees report itself uses. */
export function formatChildAge(years: number | null, months: number | null): string {
  if (years === null && months === null) return "Age not set";
  return `${years ?? 0}y ${months ?? 0}m`;
}

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

export const HAZARD_CATEGORY_LABEL: Record<HazardCheckCategory, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  allergy: "Allergy",
};

export const HAZARD_RISK_LABEL: Record<HazardRiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function hazardRiskTone(risk: HazardRiskLevel): StatusTone {
  switch (risk) {
    case "high":
      return "action";
    case "medium":
      return "attention";
    case "low":
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

// The roster's four rooms are seeded with a `color` value that's just the
// name of one of the Tailwind colour families already used across the app
// (see tailwind.config.ts) — this maps that name to the actual classes,
// so the roster reuses the app's existing palette instead of inventing one.
const ROOM_COLOR_CLASSES: Record<string, { bg: string; text: string; chip: string }> = {
  kelp: { bg: "bg-kelp-100", text: "text-kelp-600", chip: "bg-kelp-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", chip: "bg-blue-500" },
  pink: { bg: "bg-pink-100", text: "text-pink-600", chip: "bg-pink-500" },
  orange: { bg: "bg-orange-100", text: "text-orange-600", chip: "bg-orange-500" },
};

const DEFAULT_ROOM_COLOR_CLASSES = { bg: "bg-sand-200", text: "text-charcoal/60", chip: "bg-charcoal/30" };

export function getRoomColorClasses(color: string | null | undefined) {
  if (!color) return DEFAULT_ROOM_COLOR_CLASSES;
  return ROOM_COLOR_CLASSES[color] ?? DEFAULT_ROOM_COLOR_CLASSES;
}

export const REVIEW_WINDOWS = [30, 60, 90] as const;

// The 11 Records & Compliance modules, as specified. Three (Emergency
// Drills, Staff Compliance Records, Policy & Procedure Reviews) already
// have substantial real functionality elsewhere in the app — their cards
// link straight there instead of duplicating it. The rest are awaiting the
// detailed field-level spec before they're built for real, so their cards
// say so honestly rather than pretending to be finished.
export type RecordsModuleStatus = "linked" | "coming_soon";

export type RecordsModule = {
  key: string;
  label: string;
  description: string;
  status: RecordsModuleStatus;
  href?: string;
  linkedNote?: string;
};

export const RECORDS_MODULES: RecordsModule[] = [
  {
    key: "daily_hazard_checks",
    label: "Daily Hazard Checks",
    description: "Structured daily walk-through checks of each area of the centre.",
    status: "linked",
    href: "/records/hazards",
    linkedNote: "Built from Beach Kids' real Daily Hazard Checklist — indoor, outdoor and allergy items match the paper original for each room.",
  },
  {
    key: "hazard_register",
    label: "Hazard Register",
    description: "A running log of identified hazards, their risk level, and how they were resolved.",
    status: "linked",
    href: "/records/hazards/register",
    linkedNote: "The Hazard & Location log from every Daily Hazard Checklist, in one filterable list.",
  },
  {
    key: "accidents_incidents_illness",
    label: "Accidents / Incidents & Illness",
    description: "Records of accidents, incidents and illness involving children or staff.",
    status: "linked",
    href: "/records/accidents-illness",
    linkedNote: "Built from Beach Kids' real Accident & Illness Form — every field matches the paper original.",
  },
  {
    key: "serious_incident_records",
    label: "Serious Incident Records",
    description: "Records requiring management review and, where relevant, notification.",
    status: "coming_soon",
  },
  {
    key: "medication_records",
    label: "Medication Records",
    description: "Medication authorised, administered and signed for.",
    status: "coming_soon",
  },
  {
    key: "sleep_records",
    label: "Sleep Records",
    description: "Sleep checks and monitoring records.",
    status: "coming_soon",
  },
  {
    key: "emergency_drills",
    label: "Emergency Drills",
    description: "Fire, earthquake, tsunami and lockdown drills, and how each one was evaluated.",
    status: "linked",
    href: "/emergency-drills",
    linkedNote: "Already built — this links to the existing Emergency Drills register.",
  },
  {
    key: "excursions_rams",
    label: "Excursions & RAMS",
    description: "Excursion plans and their Risk Assessment & Management Systems paperwork.",
    status: "coming_soon",
  },
  {
    key: "food_records",
    label: "Food Records",
    description: "Menus, food safety checks and allergen records.",
    status: "coming_soon",
  },
  {
    key: "staff_compliance_records",
    label: "Staff Compliance Records",
    description: "First aid, police vets, practising certificates and other renewal-tracked documents.",
    status: "linked",
    href: "/staff",
    linkedNote: "Already built — this links to the existing Staff documents, which already track expiry.",
  },
  {
    key: "policy_procedure_reviews",
    label: "Policy & Procedure Reviews",
    description: "Policy versions, review cycles and approval history.",
    status: "linked",
    href: "/policies",
    linkedNote: "Already built — this links to the existing Policies register.",
  },
];

// ---------------------------------------------------------------------------
// Learning Stories
// ---------------------------------------------------------------------------

export const LEARNING_STORY_STATUSES: LearningStoryStatus[] = [
  "draft",
  "awaiting_approval",
  "returned_for_editing",
  "published",
  "archived",
];

export const LEARNING_STORY_STATUS_LABEL: Record<LearningStoryStatus, string> = {
  draft: "Draft",
  awaiting_approval: "Awaiting Approval",
  returned_for_editing: "Returned for Editing",
  published: "Published",
  archived: "Archived",
};

export function learningStoryStatusTone(status: LearningStoryStatus): StatusTone {
  switch (status) {
    case "published":
      return "ready";
    case "awaiting_approval":
    case "returned_for_editing":
      return "attention";
    case "draft":
      return "neutral";
    case "archived":
    default:
      return "neutral";
  }
}

/** Tracker-specific tone: a child with no story yet is a RED flag here,
 * distinct from the softer grey a plain draft badge normally gets — the
 * whole point of the tracker is to make "nobody's started" stand out. */
export function trackerCellTone(status: LearningStoryStatus | "none"): StatusTone {
  if (status === "none") return "action";
  if (status === "published") return "ready";
  return "attention";
}

export const LEARNING_STORY_WRITING_PROMPTS = [
  "What happened?",
  "What learning did you notice?",
  "What strengths or interests did you notice?",
  "How could this learning be extended?",
];

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
