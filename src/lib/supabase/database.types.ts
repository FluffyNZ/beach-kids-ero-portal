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
  | "secondary_identification"
  | "safety_check";
export type EmergencyDrillType = "fire_evacuation" | "earthquake" | "tsunami" | "lockdown" | "other";
export type StaffQualificationStatus = "not_qualified" | "qualified" | "studying";
export type ChildStatus = "active" | "left";

export type StockSupplier = "gilmours" | "qizzle" | "clean_boss";
export type StockOrderItemStatus = "pending" | "ordered";

export type FinancePaymentStatus = "unpaid" | "paid";
export type FinanceIncomeStatus = "pending" | "received";
export type FinanceIncomeSource = "moe_funding" | "parent_invoice" | "other";

export type LearningStoryStatus = "draft" | "awaiting_approval" | "returned_for_editing" | "published" | "archived";

export type HazardCheckCategory = "indoor" | "outdoor" | "allergy";
export type HazardRiskLevel = "low" | "medium" | "high";
export type LearningStoryMediaKind = "image" | "video" | "pdf";
export type StaffLeaveType = "annual" | "sick" | "unpaid" | "other" | "unavailable" | "day_off";
export type StaffLeaveStatus = "requested" | "approved" | "declined" | "cancelled";

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
  date_of_birth: string | null;
  photo_storage_path: string | null;
  notes: string | null;
  can_publish_learning_stories: boolean;
  room_id: string | null;
  // Added by migration 0061_staff_relief_flag.sql.
  is_relief: boolean;
  email: string | null;
  mobile_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type StaffAvailabilityRow = {
  staff_id: string;
  mon_start: string | null;
  mon_end: string | null;
  tue_start: string | null;
  tue_end: string | null;
  wed_start: string | null;
  wed_end: string | null;
  thu_start: string | null;
  thu_end: string | null;
  fri_start: string | null;
  fri_end: string | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
};

type StaffNotesRow = {
  id: string;
  staff_id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  // Optional single attachment (see migration 0058) — reuses the
  // staff-documents bucket, so these mirror staff_documents' own columns.
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
};

export type StaffGrowthCycleStatus = "open" | "closed";

type StaffGrowthCyclesRow = {
  id: string;
  staff_id: string;
  title: string;
  start_date: string | null;
  review_date: string | null;
  status: StaffGrowthCycleStatus;
  reflections: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type StaffGrowthGoalsRow = {
  id: string;
  cycle_id: string;
  description: string;
  is_complete: boolean;
  sort_order: number;
  created_at: string;
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
  recognised_service: string | null;
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

type RosterRoomsRow = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

export type RosterWeekStatus = "draft" | "approved";

type RosterWeeksRow = {
  id: string;
  week_start_date: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // See migration 0059.
  status: RosterWeekStatus;
  approved_by: string | null;
  approved_at: string | null;
  needs_review: boolean;
  last_modified_at: string | null;
};

type RosterShiftsRow = {
  id: string;
  week_id: string;
  staff_id: string;
  room_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BillPayersRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type ChildrenRow = {
  id: string;
  full_name: string;
  gender: string | null;
  age_years: number | null;
  age_months: number | null;
  age_as_of: string | null;
  date_of_birth: string | null;
  residential_address: string | null;
  primary_contact_email: string | null;
  room_id: string | null;
  room_notes: string | null;
  bill_payer_id: string | null;
  bill_payer_unlisted_note: string | null;
  status: ChildStatus;
  photo_storage_path: string | null;
  hourly_rate: number | null;
  twenty_hours_ece: boolean;
  special_weekly_override: number | null;
  notes: string | null;
  start_date: string | null;
  leaving_date: string | null;
  // Which sunblock to use for this child on the Sunblock Charts page --
  // see migration 0062. Separate from sunscreen consent, which this app
  // has no data model for yet.
  uses_own_sunblock: boolean;
  sunblock_instructions: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type FeeSettingsRow = {
  id: boolean;
  standard_hourly_rate: number;
  sibling_discount_percent: number;
  ece_daily_max_hours: number;
  ece_weekly_max_hours: number;
  updated_at: string;
  updated_by: string | null;
};

type FeeWeeksRow = {
  id: string;
  week_start_date: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

type ChildWeeklyHoursRow = {
  id: string;
  week_id: string;
  child_id: string;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  created_at: string;
  updated_at: string;
};

type ChildWinzSubsidiesRow = {
  id: string;
  child_id: string;
  caregiver_name: string | null;
  weekly_cca_hours: number | null;
  weekly_payment: number | null;
  renewal_date: string | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
};

type ChildEnrolledScheduleRow = {
  id: string;
  child_id: string;
  mon_start: string | null;
  mon_end: string | null;
  tue_start: string | null;
  tue_end: string | null;
  wed_start: string | null;
  wed_end: string | null;
  thu_start: string | null;
  thu_end: string | null;
  fri_start: string | null;
  fri_end: string | null;
  notes: string | null;
  tbc: boolean;
  updated_at: string;
  updated_by: string | null;
};

// ---------------------------------------------------------------------------
// Email feature (migration 0050) — see src/lib/data/email.ts /
// src/lib/actions/email.ts.
// ---------------------------------------------------------------------------

export type EmailTemplateCategoryDb = "enrolment" | "everyday" | "fees" | "events";

type EmailTemplatesRow = {
  id: string;
  key: string;
  label: string;
  category: EmailTemplateCategoryDb;
  icon: string;
  subject: string;
  body: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

type FamilyContactsRow = {
  id: string;
  bill_payer_id: string;
  full_name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type FamilyEnquiryStatusDb = "enquiry" | "converted" | "dismissed";

type FamilyEnquiriesRow = {
  id: string;
  child_full_name: string;
  parent_full_name: string;
  parent_email: string;
  parent_phone: string | null;
  intended_room_id: string | null;
  intended_start_date: string | null;
  status: FamilyEnquiryStatusDb;
  converted_child_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type EmailMessageStatusDb = "draft" | "sending" | "sent" | "failed";
export type EmailReminderKindDb = "birthday" | "welcome" | "farewell";

type EmailMessagesRow = {
  id: string;
  template_key: string | null;
  child_id: string | null;
  staff_id: string | null;
  bill_payer_id: string | null;
  family_enquiry_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  status: EmailMessageStatusDb;
  reminder_kind: EmailReminderKindDb | null;
  reminder_event_date: string | null;
  attachments: { name: string; storage_path: string; size: number }[];
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type StockOrderItemRow = {
  id: string;
  supplier: StockSupplier;
  item_name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  status: StockOrderItemStatus;
  ordered_at: string | null;
  ordered_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type StockOrderSettingsRow = {
  id: boolean;
  clean_boss_email: string | null;
  updated_at: string;
  updated_by: string | null;
};

type FinanceOutgoingRow = {
  id: string;
  expense_date: string;
  supplier: string | null;
  category: string | null;
  description: string | null;
  amount: number;
  gst_amount: number | null;
  status: FinancePaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  external_id: string | null;
  subcategory: string | null;
  xero_account: string | null;
  needs_more_detail: boolean;
  raw_description: string | null;
  source_detail: string | null;
  source_reference: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type FinanceIncomeRow = {
  id: string;
  income_date: string;
  source: FinanceIncomeSource;
  payer_name: string | null;
  description: string | null;
  invoice_number: string | null;
  amount: number;
  gst_amount: number | null;
  status: FinanceIncomeStatus;
  due_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type LearningTagSetsRow = {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type LearningTagsRow = {
  id: string;
  set_id: string;
  parent_tag_id: string | null;
  name: string;
  maori_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type LearningStoriesRow = {
  id: string;
  story_number: string;
  title: string;
  story_date: string;
  author_staff_id: string | null;
  status: LearningStoryStatus;
  content_blocks: unknown;
  requires_approval: boolean;
  review_comments: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  last_autosaved_at: string | null;
};

type LearningStoryChildrenRow = {
  story_id: string;
  child_id: string;
};

type LearningStoryTagsRow = {
  story_id: string;
  tag_id: string;
};

type LearningStoryMediaRow = {
  id: string;
  story_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  kind: LearningStoryMediaKind;
  caption: string | null;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_at: string;
};

type LearningStoryStatusHistoryRow = {
  id: string;
  story_id: string;
  from_status: LearningStoryStatus | null;
  to_status: LearningStoryStatus;
  comment: string | null;
  changed_by: string | null;
  changed_at: string;
};

type AccidentIllnessRecordsRow = {
  id: string;
  child_id: string;
  incident_date: string;
  incident_time: string | null;
  time_parent_contacted: string | null;
  description: string | null;
  equipment_involved: boolean | null;
  another_child_involved: boolean | null;
  first_aid_provided: string | null;
  further_first_aid_required: boolean | null;
  first_aid_supplies_used: string | null;
  staff_id: string | null;
  parent_signed: boolean;
  evidence_id: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

type HazardChecklistTemplatesRow = {
  id: string;
  room_id: string;
  category: HazardCheckCategory;
  item_text: string;
  sort_order: number;
  created_at: string;
};

type HazardChecksRow = {
  id: string;
  room_id: string;
  week_start_date: string;
  notes: string | null;
  evidence_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type HazardCheckDailySignoffsRow = {
  id: string;
  check_id: string;
  check_date: string;
  staff_id: string | null;
  completed_time: string | null;
  signed_off: boolean;
  signed_off_at: string | null;
  created_at: string;
  updated_at: string;
};

type HazardCheckItemsRow = {
  id: string;
  check_id: string;
  category: HazardCheckCategory;
  item_text: string;
  is_checked: boolean;
  sort_order: number;
};

type HazardLogEntriesRow = {
  id: string;
  check_id: string;
  hazard_description: string;
  risk_level: HazardRiskLevel;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type StaffLeaveRow = {
  id: string;
  staff_id: string;
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  status: StaffLeaveStatus;
  start_time: string | null;
  end_time: string | null;
  private_notes: string | null;
  decided_by: string | null;
  decided_at: string | null;
};

export interface Database {
  // Newer @supabase/postgrest-js releases look for this marker to resolve
  // the default schema; older hand-written Database types (like this one)
  // never had it. Harmless to include either way — purely additive.
  __InternalSupabase: {
    PostgrestVersion: string;
  };
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
      staff_availability: {
        Row: StaffAvailabilityRow;
        Insert: Partial<StaffAvailabilityRow> & {
          staff_id: string;
        };
        Update: Partial<StaffAvailabilityRow>;
        Relationships: [];
      };
      staff_notes: {
        Row: StaffNotesRow;
        Insert: Partial<StaffNotesRow> & {
          staff_id: string;
          body: string;
        };
        Update: Partial<StaffNotesRow>;
        Relationships: [];
      };
      staff_growth_cycles: {
        Row: StaffGrowthCyclesRow;
        Insert: Partial<StaffGrowthCyclesRow> & {
          staff_id: string;
          title: string;
        };
        Update: Partial<StaffGrowthCyclesRow>;
        Relationships: [];
      };
      staff_growth_goals: {
        Row: StaffGrowthGoalsRow;
        Insert: Partial<StaffGrowthGoalsRow> & {
          cycle_id: string;
          description: string;
        };
        Update: Partial<StaffGrowthGoalsRow>;
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
      roster_rooms: {
        Row: RosterRoomsRow;
        Insert: Partial<RosterRoomsRow> & {
          name: string;
          color: string;
        };
        Update: Partial<RosterRoomsRow>;
        Relationships: [];
      };
      roster_weeks: {
        Row: RosterWeeksRow;
        Insert: Partial<RosterWeeksRow> & {
          week_start_date: string;
        };
        Update: Partial<RosterWeeksRow>;
        Relationships: [];
      };
      roster_shifts: {
        Row: RosterShiftsRow;
        Insert: Partial<RosterShiftsRow> & {
          week_id: string;
          staff_id: string;
          shift_date: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<RosterShiftsRow>;
        Relationships: [];
      };
      bill_payers: {
        Row: BillPayersRow;
        Insert: Partial<BillPayersRow> & {
          full_name: string;
        };
        Update: Partial<BillPayersRow>;
        Relationships: [];
      };
      children: {
        Row: ChildrenRow;
        Insert: Partial<ChildrenRow> & {
          full_name: string;
        };
        Update: Partial<ChildrenRow>;
        Relationships: [];
      };
      child_winz_subsidies: {
        Row: ChildWinzSubsidiesRow;
        Insert: Partial<ChildWinzSubsidiesRow> & {
          child_id: string;
        };
        Update: Partial<ChildWinzSubsidiesRow>;
        Relationships: [];
      };
      fee_settings: {
        Row: FeeSettingsRow;
        Insert: Partial<FeeSettingsRow>;
        Update: Partial<FeeSettingsRow>;
        Relationships: [];
      };
      fee_weeks: {
        Row: FeeWeeksRow;
        Insert: Partial<FeeWeeksRow> & {
          week_start_date: string;
        };
        Update: Partial<FeeWeeksRow>;
        Relationships: [];
      };
      child_weekly_hours: {
        Row: ChildWeeklyHoursRow;
        Insert: Partial<ChildWeeklyHoursRow> & {
          week_id: string;
          child_id: string;
        };
        Update: Partial<ChildWeeklyHoursRow>;
        Relationships: [];
      };
      child_enrolled_schedule: {
        Row: ChildEnrolledScheduleRow;
        Insert: Partial<ChildEnrolledScheduleRow> & {
          child_id: string;
        };
        Update: Partial<ChildEnrolledScheduleRow>;
        Relationships: [];
      };
      stock_order_items: {
        Row: StockOrderItemRow;
        Insert: Partial<StockOrderItemRow> & {
          supplier: StockSupplier;
          item_name: string;
        };
        Update: Partial<StockOrderItemRow>;
        Relationships: [];
      };
      stock_order_settings: {
        Row: StockOrderSettingsRow;
        Insert: Partial<StockOrderSettingsRow>;
        Update: Partial<StockOrderSettingsRow>;
        Relationships: [];
      };
      finance_outgoings: {
        Row: FinanceOutgoingRow;
        Insert: Partial<FinanceOutgoingRow> & {
          expense_date: string;
          amount: number;
        };
        Update: Partial<FinanceOutgoingRow>;
        Relationships: [];
      };
      finance_income: {
        Row: FinanceIncomeRow;
        Insert: Partial<FinanceIncomeRow> & {
          income_date: string;
          amount: number;
        };
        Update: Partial<FinanceIncomeRow>;
        Relationships: [];
      };
      learning_tag_sets: {
        Row: LearningTagSetsRow;
        Insert: Partial<LearningTagSetsRow> & {
          key: string;
          name: string;
        };
        Update: Partial<LearningTagSetsRow>;
        Relationships: [];
      };
      learning_tags: {
        Row: LearningTagsRow;
        Insert: Partial<LearningTagsRow> & {
          set_id: string;
          name: string;
        };
        Update: Partial<LearningTagsRow>;
        Relationships: [];
      };
      learning_stories: {
        Row: LearningStoriesRow;
        Insert: Partial<LearningStoriesRow> & {
          story_number: string;
        };
        Update: Partial<LearningStoriesRow>;
        Relationships: [];
      };
      learning_story_children: {
        Row: LearningStoryChildrenRow;
        Insert: LearningStoryChildrenRow;
        Update: Partial<LearningStoryChildrenRow>;
        Relationships: [];
      };
      learning_story_tags: {
        Row: LearningStoryTagsRow;
        Insert: LearningStoryTagsRow;
        Update: Partial<LearningStoryTagsRow>;
        Relationships: [];
      };
      learning_story_media: {
        Row: LearningStoryMediaRow;
        Insert: Partial<LearningStoryMediaRow> & {
          story_id: string;
          storage_path: string;
          original_filename: string;
          kind: LearningStoryMediaKind;
        };
        Update: Partial<LearningStoryMediaRow>;
        Relationships: [];
      };
      learning_story_status_history: {
        Row: LearningStoryStatusHistoryRow;
        Insert: Partial<LearningStoryStatusHistoryRow> & {
          story_id: string;
          to_status: LearningStoryStatus;
        };
        Update: Partial<LearningStoryStatusHistoryRow>;
        Relationships: [];
      };
      accident_illness_records: {
        Row: AccidentIllnessRecordsRow;
        Insert: Partial<AccidentIllnessRecordsRow> & {
          child_id: string;
          incident_date: string;
        };
        Update: Partial<AccidentIllnessRecordsRow>;
        Relationships: [];
      };
      hazard_checklist_templates: {
        Row: HazardChecklistTemplatesRow;
        Insert: Partial<HazardChecklistTemplatesRow> & {
          room_id: string;
          category: HazardCheckCategory;
          item_text: string;
        };
        Update: Partial<HazardChecklistTemplatesRow>;
        Relationships: [];
      };
      hazard_checks: {
        Row: HazardChecksRow;
        Insert: Partial<HazardChecksRow> & {
          room_id: string;
          week_start_date: string;
        };
        Update: Partial<HazardChecksRow>;
        Relationships: [];
      };
      hazard_check_daily_signoffs: {
        Row: HazardCheckDailySignoffsRow;
        Insert: Partial<HazardCheckDailySignoffsRow> & {
          check_id: string;
          check_date: string;
        };
        Update: Partial<HazardCheckDailySignoffsRow>;
        Relationships: [];
      };
      hazard_check_items: {
        Row: HazardCheckItemsRow;
        Insert: Partial<HazardCheckItemsRow> & {
          check_id: string;
          category: HazardCheckCategory;
          item_text: string;
        };
        Update: Partial<HazardCheckItemsRow>;
        Relationships: [];
      };
      hazard_log_entries: {
        Row: HazardLogEntriesRow;
        Insert: Partial<HazardLogEntriesRow> & {
          check_id: string;
          hazard_description: string;
        };
        Update: Partial<HazardLogEntriesRow>;
        Relationships: [];
      };
      staff_leave: {
        Row: StaffLeaveRow;
        Insert: Partial<StaffLeaveRow> & {
          staff_id: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<StaffLeaveRow>;
        Relationships: [];
      };
      email_templates: {
        Row: EmailTemplatesRow;
        Insert: Partial<EmailTemplatesRow> & {
          key: string;
          label: string;
          category: EmailTemplateCategoryDb;
          subject: string;
          body: string;
        };
        Update: Partial<EmailTemplatesRow>;
        Relationships: [];
      };
      family_contacts: {
        Row: FamilyContactsRow;
        Insert: Partial<FamilyContactsRow> & {
          bill_payer_id: string;
          full_name: string;
        };
        Update: Partial<FamilyContactsRow>;
        Relationships: [];
      };
      family_enquiries: {
        Row: FamilyEnquiriesRow;
        Insert: Partial<FamilyEnquiriesRow> & {
          child_full_name: string;
          parent_full_name: string;
          parent_email: string;
        };
        Update: Partial<FamilyEnquiriesRow>;
        Relationships: [];
      };
      email_messages: {
        Row: EmailMessagesRow;
        Insert: Partial<EmailMessagesRow> & {
          recipient_email: string;
          subject: string;
          body: string;
        };
        Update: Partial<EmailMessagesRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
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
      child_status: ChildStatus;
      stock_supplier: StockSupplier;
      stock_order_item_status: StockOrderItemStatus;
      finance_payment_status: FinancePaymentStatus;
      finance_income_status: FinanceIncomeStatus;
      finance_income_source: FinanceIncomeSource;
      learning_story_status: LearningStoryStatus;
      learning_story_media_kind: LearningStoryMediaKind;
      hazard_check_category: HazardCheckCategory;
      hazard_risk_level: HazardRiskLevel;
      staff_leave_type: StaffLeaveType;
      staff_leave_status: StaffLeaveStatus;
      staff_growth_cycle_status: StaffGrowthCycleStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
