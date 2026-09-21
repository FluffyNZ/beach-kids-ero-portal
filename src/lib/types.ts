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
  StockOrderItemStatus,
  FinancePaymentStatus,
  FinanceIncomeStatus,
  FinanceIncomeSource,
  LearningStoryStatus,
  LearningStoryMediaKind,
  HazardCheckCategory,
  HazardRiskLevel,
  StaffLeaveType,
} from "@/lib/supabase/database.types";

// Re-exported so other modules can `import type { HazardCheckCategory }
// from "@/lib/types"` alongside the rest of this file's types, rather than
// reaching into "@/lib/supabase/database.types" directly for just these two.
export type { HazardCheckCategory, HazardRiskLevel, StaffLeaveType };

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

export type ChecklistItem = {
  id: string;
  criterion_id: string;
  description: string;
  sort_order: number;
  is_checked: boolean;
  checked_at: string | null;
  checked_by_name: string | null;
  created_at: string;
  updated_at: string;
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
  date_of_birth: string | null;
  photo_storage_path: string | null;
  photo_url: string | null;
  notes: string | null;
  can_publish_learning_stories: boolean;
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

export type RosterRoom = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

export type RosterShift = {
  id: string;
  staff_id: string;
  room_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
};

export type RosterWeekSummary = {
  id: string;
  week_start_date: string;
  notes: string | null;
  shift_count: number;
};

export type RosterWeekDetail = {
  id: string;
  week_start_date: string;
  notes: string | null;
  shifts: RosterShift[];
};

export type BillPayer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildWinzSubsidy = {
  caregiver_name: string | null;
  weekly_cca_hours: number | null;
  weekly_payment: number | null;
  renewal_date: string | null;
  notes: string | null;
  updated_at: string | null;
};

export type ChildSibling = {
  id: string;
  full_name: string;
};

export type ChildMember = {
  id: string;
  full_name: string;
  gender: string | null;
  age_years: number | null;
  age_months: number | null;
  age_as_of: string | null;
  date_of_birth: string | null;
  residential_address: string | null;
  // The report's "PC 1" contact — the family's primary contact, which is
  // sometimes a different person from whoever the bill payer is.
  primary_contact_email: string | null;
  room_id: string | null;
  room_name: string | null;
  room_color: string | null;
  room_notes: string | null;
  bill_payer_id: string | null;
  bill_payer_name: string | null;
  bill_payer_unlisted_note: string | null;
  status: ChildStatus;
  // A short-lived signed URL (the photo lives in a private storage
  // bucket) — null when no photo has been uploaded yet.
  photo_url: string | null;
  hourly_rate: number | null;
  twenty_hours_ece: boolean;
  special_weekly_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Derived, not stored: true when this child's bill payer is also billed
  // for at least one other active child — matches how the uploaded fees
  // report decides the 10% sibling discount, so nothing needs to be kept
  // in sync by hand.
  sibling_discount_eligible: boolean;
  siblings: ChildSibling[];
  has_winz_subsidy: boolean;
};

// The child's regular booked days/times (a template of a normal week),
// transcribed from the centre's own attendance report — distinct from
// child_weekly_hours, which is what actually happened in one given week.
// Times are Postgres "HH:MM:SS" strings; a null pair means not enrolled
// that day.
export type ChildEnrolledSchedule = {
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
  updated_at: string;
};

export type ChildWithDetails = ChildMember & {
  bill_payer: BillPayer | null;
  winz_subsidy: ChildWinzSubsidy | null;
  enrolled_schedule: ChildEnrolledSchedule | null;
};

export type FeeSettings = {
  standard_hourly_rate: number;
  sibling_discount_percent: number;
  ece_daily_max_hours: number;
  ece_weekly_max_hours: number;
  updated_at: string;
};

export type WeekdayHours = {
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
};

export type ChildWeeklyFee = {
  child_id: string;
  full_name: string;
  room_name: string | null;
  room_color: string | null;
  hours: WeekdayHours;
  weekly_hours: number;
  ece_free_hours: number;
  chargeable_hours: number;
  hourly_rate: number;
  base_fee: number;
  sibling_discount_amount: number;
  // What the centre earns from this child this week in total, before the
  // WINZ/parent split — a special weekly override replaces this entirely.
  fee_total: number;
  is_special_override: boolean;
  winz_payment: number;
  // fee_total minus winz_payment, floored at 0.
  parent_pays: number;
  // true when `hours` came from the child's enrolled schedule (their usual
  // booked days/times) because nobody has entered this week's actual
  // attendance yet — false once a real child_weekly_hours row exists,
  // even if its values happen to match the schedule exactly.
  is_estimated: boolean;
};

export type WeeklyFeesSummary = {
  weekStartDate: string;
  hasAnyHoursEntered: boolean;
  children: ChildWeeklyFee[];
  totalFees: number;
  totalWinz: number;
  totalParentPays: number;
};

export type StockOrderItem = {
  id: string;
  supplier: StockSupplier;
  item_name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  status: StockOrderItemStatus;
  ordered_at: string | null;
  created_at: string;
};

// One supplier's section of the Stock Orders page: its still-to-order
// items, plus a quick summary of the last time an order was placed so
// it's obvious at a glance whether anything's been sent recently.
export type StockSupplierSummary = {
  supplier: StockSupplier;
  pendingItems: StockOrderItem[];
  lastOrder: { orderedAt: string; itemCount: number } | null;
};

export type StockOrderSettings = {
  cleanBossEmail: string | null;
};

export type FinanceOutgoing = {
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
};

export type FinanceIncomeEntry = {
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
};

// The auto-calculated slice of income that comes from the Children & Fees
// area — parent payments plus WINZ payments across whatever weeks fall in
// the period, pulled in live rather than re-entered by hand. `confirmedWeeks`
// vs `estimatedWeeks` tells you how much of this figure is real recorded
// attendance vs a schedule-based estimate for weeks nobody's confirmed yet.
export type FeeRevenueForPeriod = {
  totalParentPays: number;
  totalWinz: number;
  total: number;
  confirmedWeeks: number;
  estimatedWeeks: number;
  totalWeeks: number;
};

export type FinanceOverview = {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  feeRevenue: FeeRevenueForPeriod;
  otherIncomeReceived: number;
  totalIncome: number;
  totalOutgoings: number;
  estimatedProfitBeforeTax: number;
  outstandingBillsCount: number;
  outstandingBillsAmount: number;
  outstandingIncomeCount: number;
  outstandingIncomeAmount: number;
};

// ---------------------------------------------------------------------------
// Learning Stories
// ---------------------------------------------------------------------------

export type LearningTag = {
  id: string;
  set_id: string;
  set_key: string;
  set_name: string;
  parent_tag_id: string | null;
  name: string;
  maori_name: string | null;
  sort_order: number;
};

export type LearningTagSet = {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  // Top-level tags (e.g. Te Whāriki's 5 strands) with any child tags
  // (goals) nested underneath them.
  tags: Array<LearningTag & { children: LearningTag[] }>;
};

export type LearningStoryHeadingBlock = { id: string; type: "heading"; text: string; level: 2 | 3 };
export type LearningStoryParagraphBlock = { id: string; type: "paragraph"; html: string };
export type LearningStoryImageBlock = { id: string; type: "image"; mediaId: string | null };
export type LearningStoryImagePairBlock = { id: string; type: "image_pair"; mediaIds: (string | null)[] };
export type LearningStoryVideoBlock = { id: string; type: "video"; mediaId: string | null };
export type LearningStoryPdfBlock = { id: string; type: "pdf"; mediaId: string | null };

export type LearningStoryBlock =
  | LearningStoryHeadingBlock
  | LearningStoryParagraphBlock
  | LearningStoryImageBlock
  | LearningStoryImagePairBlock
  | LearningStoryVideoBlock
  | LearningStoryPdfBlock;

export type LearningStoryMedia = {
  id: string;
  story_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  kind: LearningStoryMediaKind;
  caption: string | null;
  sort_order: number;
  uploaded_by_name: string | null;
  uploaded_at: string;
  url: string | null;
};

export type LearningStoryChildRef = {
  id: string;
  full_name: string;
  room_name: string | null;
  room_color: string | null;
  photo_url: string | null;
};

export type LearningStoryStatusHistoryEntry = {
  id: string;
  from_status: LearningStoryStatus | null;
  to_status: LearningStoryStatus;
  comment: string | null;
  changed_by_name: string | null;
  changed_at: string;
};

export type LearningStory = {
  id: string;
  story_number: string;
  title: string;
  story_date: string;
  status: LearningStoryStatus;
  author_staff_id: string | null;
  author_name: string | null;
  content_blocks: LearningStoryBlock[];
  media: LearningStoryMedia[];
  children: LearningStoryChildRef[];
  tags: LearningTag[];
  requires_approval: boolean;
  review_comments: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_by_name: string | null;
  updated_at: string;
  submitted_by_name: string | null;
  submitted_at: string | null;
  reviewed_by_name: string | null;
  approved_at: string | null;
  published_at: string | null;
  last_autosaved_at: string | null;
  status_history: LearningStoryStatusHistoryEntry[];
};

// The condensed shape used for story cards and list views — everything a
// card needs, nothing a full editor needs.
export type LearningStoryListItem = {
  id: string;
  story_number: string;
  title: string;
  story_date: string;
  status: LearningStoryStatus;
  author_name: string | null;
  children: LearningStoryChildRef[];
  coverMediaUrl: string | null;
  tags: LearningTag[];
};

export type LearningStoriesOverview = {
  monthLabel: string;
  childrenWithPublished: number;
  childrenNeedingStory: number;
  totalActiveChildren: number;
  draftCount: number;
  awaitingApprovalCount: number;
  publishedThisMonthCount: number;
};

export type MonthlyTrackerChildCell = {
  id: string;
  full_name: string;
  status: LearningStoryStatus | "none";
  storyId: string | null;
};

export type MonthlyTrackerRoomRow = {
  room: { id: string; name: string; color: string } | null;
  children: MonthlyTrackerChildCell[];
};

// ---------------------------------------------------------------------------
// Accident & Illness Records
// ---------------------------------------------------------------------------

/** Mirrors the real Beach Kids "Accident & Illness Form" field for field.
 * "Staff Signature" and "Parent Signature" are not captured digital
 * signatures — staff_name records who filled the form in, and parent_signed
 * is an acknowledgement checkbox. The actual signed paper is the legal
 * record, filed as evidencePhotoUrl. */
export type AccidentIllnessRecord = {
  id: string;
  child_id: string;
  child_name: string;
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
  staff_name: string | null;
  parent_signed: boolean;
  evidence_id: string | null;
  evidencePhotoUrl: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AccidentIllnessYesNoGuess = "yes" | "no" | "unclear";

/** What AI Story Assist's photo-import counterpart returns after reading a
 * photo of a completed, signed paper form — a draft to review and edit,
 * never data that gets saved on its own. child_name_guess/staff_name_guess
 * are plain text hints for a human to match against the real children/staff
 * lists; nothing here is ever wired directly to a real record's id. */
export type AccidentIllnessDraft = {
  child_name_guess: string | null;
  staff_name_guess: string | null;
  incident_date: string | null;
  incident_time: string | null;
  time_parent_contacted: string | null;
  description: string | null;
  equipment_involved: AccidentIllnessYesNoGuess;
  another_child_involved: AccidentIllnessYesNoGuess;
  first_aid_provided: string | null;
  further_first_aid_required: AccidentIllnessYesNoGuess;
  first_aid_supplies_used: string | null;
  parent_signed_guess: boolean | null;
  low_confidence_fields: string[];
};

/** A single checklist item as it appears on one specific hazard check —
 * already a snapshot of the template text at the time the check was
 * created, so later template edits never rewrite history. */
export type HazardCheckItem = {
  id: string;
  category: HazardCheckCategory;
  item_text: string;
  is_checked: boolean;
  sort_order: number;
};

/** One "Hazard & location / Risk / Resolved" row on a check. This is the
 * same data the Hazard Register lists across every check — an unresolved
 * entry is what surfaces as a job on the dashboard. */
export type HazardLogEntry = {
  id: string;
  check_id: string;
  hazard_description: string;
  risk_level: HazardRiskLevel;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

/** One day's sign-off within a week's hazard chart — its own staff member,
 * time, and signed-off state, mirroring one "Mon/Tue/Wed/Thu/Fri" column
 * on the real paper chart. */
export type HazardCheckDailySignoff = {
  id: string;
  check_date: string;
  staff_id: string | null;
  staff_name: string | null;
  completed_time: string | null;
  signed_off: boolean;
  signed_off_at: string | null;
};

/** A completed (or in-progress) Weekly Hazard Checklist for one room, one
 * week — mirrors the real paper chart: the tick-box sections and embedded
 * hazard log cover the whole week, while each weekday gets its own
 * sign-off (see dailySignoffs) since a different staff member may do the
 * walk-through on different days. */
export type HazardCheck = {
  id: string;
  room_id: string;
  room_name: string;
  room_color: string;
  week_start_date: string;
  notes: string | null;
  createdAt: string;
  items: HazardCheckItem[];
  logEntries: HazardLogEntry[];
  dailySignoffs: HazardCheckDailySignoff[];
  evidence_id: string | null;
  evidencePhotoUrl: string | null;
};

/** One room's fixed checklist item, as defined in hazard_checklist_templates
 * — used both to render a fresh check's tick-boxes and, during photo
 * import, as the exact known list the AI is asked to match against (it is
 * never allowed to invent a new item). */
export type HazardChecklistTemplateItem = {
  category: HazardCheckCategory;
  item_text: string;
  sort_order: number;
};

export type HazardCheckItemGuess = {
  item_text: string;
  checked: "yes" | "no" | "unclear";
};

export type HazardLogEntryGuess = {
  hazard_description: string;
  risk_level: HazardRiskLevel;
};

/** What a photo of one day's completed Daily Hazard Checklist yields before
 * a human reviews it — nothing here is saved until the room is confirmed,
 * anything misread is corrected, and the reviewer clicks Save. The date
 * read from the photo decides which week (and which weekday's sign-off
 * column within that week) this photo's data attaches to — the week
 * itself is found or created automatically. room_name_guess is only ever
 * matched against the real rooms with a checklist; it's never wired to a
 * room id without an exact match or an explicit human pick, and item_text
 * values are always the room's own known items, never invented. */
export type HazardCheckDraft = {
  room_name_guess: string | null;
  check_date: string | null;
  items: HazardCheckItemGuess[];
  hazard_log_entries: HazardLogEntryGuess[];
  notes: string | null;
  staff_name_guess: string | null;
  completed_time: string | null;
  signed_off_guess: boolean | null;
  low_confidence_fields: string[];
};

/** A lighter-weight row for list views — no items/log detail, just enough
 * to show progress and how many of the week's weekdays are signed off. */
export type HazardCheckSummary = {
  id: string;
  room_id: string;
  room_name: string;
  room_color: string;
  week_start_date: string;
  daysSignedOff: number;
  totalWeekdays: number;
  itemsTotal: number;
  itemsChecked: number;
  openHazardCount: number;
};

/** A hazard register row — a hazard_log_entries record together with
 * enough context (room, week) to make sense of it outside its own check. */
export type HazardRegisterEntry = HazardLogEntry & {
  room_id: string;
  room_name: string;
  week_start_date: string;
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

// ---------------------------------------------------------------------------
// Centre Calendar — NZ public holidays (computed, never stored), staff
// leave, and staff/child birthdays (only ever shown once a real date of
// birth has been entered on that person's own profile).
// ---------------------------------------------------------------------------

export type StaffLeave = {
  id: string;
  staff_id: string;
  staff_name: string;
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent =
  | { kind: "public_holiday"; date: string; name: string }
  | { kind: "staff_leave"; date: string; leave: StaffLeave }
  | { kind: "staff_birthday"; date: string; staffId: string; name: string; photoUrl: string | null }
  | { kind: "child_birthday"; date: string; childId: string; name: string; photoUrl: string | null };

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  events: CalendarEvent[];
};
