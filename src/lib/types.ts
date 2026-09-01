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

export type Section = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type Criterion = {
  id: string;
  section_id: string;
  code: string;
  title: string;
  official_requirement: string;
  source_reference: string | null;
  sort_order: number;
};

export type Assessment = {
  criterion_id: string;
  compliance_status: ComplianceStatus;
  evidence_status: EvidenceStatusValue;
  management_notes: string | null;
  is_flagged: boolean;
  flag_notes: string | null;
  last_reviewed_at: string | null;
  next_review_date: string | null;
  reviewed_by_name: string | null;
  updated_at: string | null;
};

export const DEFAULT_ASSESSMENT: Omit<Assessment, "criterion_id"> = {
  compliance_status: "not_assessed",
  evidence_status: "missing",
  management_notes: null,
  is_flagged: false,
  flag_notes: null,
  last_reviewed_at: null,
  next_review_date: null,
  reviewed_by_name: null,
  updated_at: null,
};

export type CriterionWithAssessment = Criterion & {
  assessment: Assessment;
  evidence_count: number;
  open_actions_count: number;
};

export type SectionWithCriteria = Section & {
  criteria: CriterionWithAssessment[];
};

export type EvidenceItem = {
  id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  description: string | null;
  category: string | null;
  document_date: string | null;
  review_date: string | null;
  expiry_date: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  notes: string | null;
  linked_criteria: Array<{ link_id: string; criterion_id: string; code: string; title: string }>;
};

export type ActionItem = {
  id: string;
  criterion_id: string;
  criterion_code: string;
  criterion_title: string;
  section_code: string;
  description: string;
  responsible_person: string;
  due_date: string | null;
  priority: ActionPriority;
  status: ActionStatusValue;
  completion_date: string | null;
  created_at: string;
};

export type PolicyVersion = {
  id: string;
  policy_id: string;
  version_number: number;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  change_summary: string | null;
  status: PolicyVersionStatus;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  created_by_name: string | null;
};

export type PolicyItem = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  status: PolicyStatus;
  review_cycle: PolicyReviewCycle | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
  current_version: PolicyVersion | null;
  version_count: number;
};

export type PolicyWithVersions = PolicyItem & {
  versions: PolicyVersion[];
};

export type StaffDocument = {
  id: string;
  staff_id: string;
  category: StaffDocumentCategory;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  document_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
};

export type StaffChecklistItem = {
  id: string;
  area_id: string;
  description: string;
  sort_order: number;
  document_category: StaffDocumentCategory | null;
  supports_expiry: boolean;
  is_checked: boolean;
  checked_at: string | null;
  checked_by_name: string | null;
  notes: string | null;
  document: StaffDocument | null;
};

export type StaffChecklistArea = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  items: StaffChecklistItem[];
};

export type StaffQualification = {
  qualification_status: StaffQualificationStatus;
  qualification_level: string | null;
  registration_status: string | null;
  pay_parity_step: string | null;
  next_review_date: string | null;
  is_studying: boolean;
  studying_qualification: string | null;
  expected_completion_date: string | null;
  notes: string | null;
  updated_at: string | null;
};

export const DEFAULT_STAFF_QUALIFICATION: StaffQualification = {
  qualification_status: "not_qualified",
  qualification_level: null,
  registration_status: null,
  pay_parity_step: null,
  next_review_date: null,
  is_studying: false,
  studying_qualification: null,
  expected_completion_date: null,
  notes: null,
  updated_at: null,
};

export type StaffMember = {
  id: string;
  full_name: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  status: StaffStatus;
  contract_type: StaffContractType | null;
  pay_rate: number | null;
  min_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
  nearest_document_expiry: string | null;
  qualification: StaffQualification;
  required_docs_completed: number;
  required_docs_total: number;
};

export type StaffWithDetails = StaffMember & {
  documents: StaffDocument[];
};

export type EmergencyDrill = {
  id: string;
  drill_type: EmergencyDrillType;
  drill_date: string;
  duration_minutes: number | null;
  children_involved: boolean;
  children_present: number | null;
  staff_present: number | null;
  assembly_point: string | null;
  conducted_by: string | null;
  what_happened: string | null;
  what_went_well: string | null;
  improvements_needed: string | null;
  evaluation_notes: string | null;
  next_due_date: string | null;
  evidence_id: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  overallPercent: number;
  sections: Array<{ code: string; name: string; percent: number; total: number; assessed: number }>;
  criteriaTotal: number;
  criteriaCompleted: number; // compliance_status in (yes, na) AND evidence_status in (ready, not_required)
  criteriaRemaining: number;
  markedNo: number;
  markedUnsure: number;
  evidenceMissing: number;
  openActions: number;
  overdueActions: number;
  documentsApproachingReview: number;
};
