// Hand-written to match supabase/migrations/0001_init.sql.
// If the schema changes, update this alongside the migration. When the
// Supabase CLI is available in your environment you can instead generate
// this file with:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
//
// Each table's row shape is declared as its own named type below (ProfilesRow,
// EroSectionsRow, etc.) rather than looked up back out of the Database
// interface while that same interface is still being defined. The
// self-referencing version worked fine for ordinary reads, but broke
// TypeScript's type-checking of supabase-js's `.insert()` calls (it was
// resolving to `never` instead of the real row shape) — this flat style is
// also what the real `supabase gen types` output uses.

export type ComplianceStatus = "not_assessed" | "yes" | "no" | "unsure" | "na";
export type EvidenceStatusValue = "missing" | "partial" | "ready" | "not_required";
export type ActionPriority = "low" | "medium" | "high" | "critical";
export type ActionStatusValue = "open" | "in_progress" | "completed";
export type AppRole = "admin" | "manager";
export type PolicyStatus = "active" | "archived";
export type PolicyVersionStatus = "draft" | "approved";
export type PolicyReviewCycle = "annual" | "biannual" | "three_yearly";
export type StaffStatus = "active" | "former";
export type StaffContractType = "permanent" | "fixed_term" | "casual" | "relief" | "director";
export type StaffDocumentCategory =
  | "contract"
  | "identification"
  | "police_vet"
  | "first_aid"
  | "qualification"
  | "visa_work_entitlement"
  | "other"
  | "professional_growth_cycle"
  | "staff_profile_form"
  | "cv_work_history"
  | "job_description"
  | "interview_recruitment"
  | "induction"
  | "child_protection"
  | "tax_kiwisaver"
  | "cv_interview"
  | "pay_parity_agreement"
  | "secondary_identification";
export type EmergencyDrillType = "fire_evacuation" | "earthquake" | "tsunami" | "lockdown" | "other";
export type StaffQualificationStatus = "not_qualified" | "qualified" | "studying";

type ProfilesRow = {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

type EroSectionsRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type EroCriteriaRow = {
  id: string;
  section_id: string;
  code: string;
  title: string;
  official_requirement: string;
  source_reference: string | null;
  sort_order: number;
  created_at: string;
};

type BeachkidsChecklistItemsRow = {
  id: string;
  criterion_id: string;
  description: string;
  sort_order: number;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
};

type CriterionAssessmentsRow = {
  id: string;
  criterion_id: string;
  compliance_status: ComplianceStatus;
  evidence_status: EvidenceStatusValue;
  management_notes: string | null;
  is_flagged: boolean;
  flag_notes: string | null;
  last_reviewed_at: string | null;
  next_review_date: string | null;
  reviewed_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

type EvidenceRow = {
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
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string | null;
  updated_at: string;
};

type EvidenceCriteriaLinksRow = {
  id: string;
  evidence_id: string;
  criterion_id: string;
  linked_at: string;
  linked_by: string | null;
};

type ActionsRow = {
  id: string;
  criterion_id: string;
  description: string;
  responsible_person: string;
  due_date: string | null;
  priority: ActionPriority;
  status: ActionStatusValue;
  completion_date: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

type PoliciesRow = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  status: PolicyStatus;
  review_cycle: PolicyReviewCycle | null;
  next_review_date: string | null;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type PolicyVersionsRow = {
  id: string;
  policy_id: string;
  version_number: number;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  change_summary: string | null;
  status: PolicyVersionStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  created_by: string | null;
};

type StaffRow = {
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
  created_by: string | null;
};

type StaffDocumentsRow = {
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
  uploaded_by: string | null;
  uploaded_at: string;
};

type StaffQualificationsRow = {
  id: string;
  staff_id: string;
  qualification_level: string | null;
  registration_status: string | null;
  pay_parity_step: string | null;
  next_review_date: string | null;
  is_studying: boolean;
  studying_qualification: string | null;
  expected_completion_date: string | null;
  qualification_status: StaffQualificationStatus;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
};

type StaffChecklistAreasRow = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
};

type StaffChecklistItemsRow = {
  id: string;
  area_id: string;
  description: string;
  sort_order: number;
  document_category: StaffDocumentCategory | null;
  supports_expiry: boolean;
  created_at: string;
};

type StaffChecklistStatusRow = {
  id: string;
  staff_id: string;
  item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  document_id: string | null;
  notes: string | null;
};

type ActivityLogRow = {
  id: string;
  criterion_id: string | null;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  description: string;
  performed_by: string | null;
  created_at: string;
};

type EmergencyDrillsRow = {
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
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: Partial<ProfilesRow> & {
          id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<ProfilesRow>;
        Relationships: [];
      };
      ero_sections: {
        Row: EroSectionsRow;
        Insert: Partial<EroSectionsRow> & {
          code: string;
          name: string;
        };
        Update: Partial<EroSectionsRow>;
        Relationships: [];
      };
      ero_criteria: {
        Row: EroCriteriaRow;
        Insert: Partial<EroCriteriaRow> & {
          section_id: string;
          code: string;
          title: string;
          official_requirement: string;
        };
        Update: Partial<EroCriteriaRow>;
        Relationships: [];
      };
      beachkids_checklist_items: {
        Row: BeachkidsChecklistItemsRow;
        Insert: Partial<BeachkidsChecklistItemsRow> & {
          criterion_id: string;
          description: string;
        };
        Update: Partial<BeachkidsChecklistItemsRow>;
        Relationships: [];
      };
      criterion_assessments: {
        Row: CriterionAssessmentsRow;
        Insert: Partial<CriterionAssessmentsRow> & {
          criterion_id: string;
        };
        Update: Partial<CriterionAssessmentsRow>;
        Relationships: [];
      };
      evidence: {
        Row: EvidenceRow;
        Insert: Partial<EvidenceRow> & {
          title: string;
          original_filename: string;
          storage_path: string;
        };
        Update: Partial<EvidenceRow>;
        Relationships: [];
      };
      evidence_criteria_links: {
        Row: EvidenceCriteriaLinksRow;
        Insert: Partial<EvidenceCriteriaLinksRow> & {
          evidence_id: string;
          criterion_id: string;
        };
        Update: Partial<EvidenceCriteriaLinksRow>;
        Relationships: [];
      };
      actions: {
        Row: ActionsRow;
        Insert: Partial<ActionsRow> & {
          criterion_id: string;
          description: string;
          responsible_person: string;
        };
        Update: Partial<ActionsRow>;
        Relationships: [];
      };
      policies: {
        Row: PoliciesRow;
        Insert: Partial<PoliciesRow> & {
          title: string;
        };
        Update: Partial<PoliciesRow>;
        Relationships: [];
      };
      policy_versions: {
        Row: PolicyVersionsRow;
        Insert: Partial<PolicyVersionsRow> & {
          policy_id: string;
          version_number: number;
          storage_path: string;
          original_filename: string;
        };
        Update: Partial<PolicyVersionsRow>;
        Relationships: [];
      };
      staff: {
        Row: StaffRow;
        Insert: Partial<StaffRow> & {
          full_name: string;
        };
        Update: Partial<StaffRow>;
        Relationships: [];
      };
      staff_documents: {
        Row: StaffDocumentsRow;
        Insert: Partial<StaffDocumentsRow> & {
          staff_id: string;
          storage_path: string;
          original_filename: string;
        };
        Update: Partial<StaffDocumentsRow>;
        Relationships: [];
      };
      staff_qualifications: {
        Row: StaffQualificationsRow;
        Insert: Partial<StaffQualificationsRow> & {
          staff_id: string;
        };
        Update: Partial<StaffQualificationsRow>;
        Relationships: [];
      };
      staff_checklist_areas: {
        Row: StaffChecklistAreasRow;
        Insert: Partial<StaffChecklistAreasRow> & {
          code: string;
          name: string;
        };
        Update: Partial<StaffChecklistAreasRow>;
        Relationships: [];
      };
      staff_checklist_items: {
        Row: StaffChecklistItemsRow;
        Insert: Partial<StaffChecklistItemsRow> & {
          area_id: string;
          description: string;
        };
        Update: Partial<StaffChecklistItemsRow>;
        Relationships: [];
      };
      staff_checklist_status: {
        Row: StaffChecklistStatusRow;
        Insert: Partial<StaffChecklistStatusRow> & {
          staff_id: string;
          item_id: string;
        };
        Update: Partial<StaffChecklistStatusRow>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: Partial<ActivityLogRow> & {
          entity_type: string;
          event_type: string;
          description: string;
        };
        Update: Partial<ActivityLogRow>;
        Relationships: [];
      };
      emergency_drills: {
        Row: EmergencyDrillsRow;
        Insert: Partial<EmergencyDrillsRow> & {
          drill_type: EmergencyDrillType;
          drill_date: string;
        };
        Update: Partial<EmergencyDrillsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      compliance_status: ComplianceStatus;
      evidence_status: EvidenceStatusValue;
      action_priority: ActionPriority;
      action_status: ActionStatusValue;
      app_role: AppRole;
      policy_status: PolicyStatus;
      policy_version_status: PolicyVersionStatus;
      policy_review_cycle: PolicyReviewCycle;
      staff_status: StaffStatus;
      staff_document_category: StaffDocumentCategory;
      staff_contract_type: StaffContractType;
      emergency_drill_type: EmergencyDrillType;
      staff_qualification_status: StaffQualificationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
