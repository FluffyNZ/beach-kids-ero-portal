// Beach Kids ERO Self-Audit Portal
//
// The digital version of the real "Induction Pack for Kaiako" — every
// tick-box and sign-off page in that PDF, transcribed section by section so
// nothing gets summarised or invented. This file is the single source of
// truth for what the induction checklist contains: there is no matching
// database table of items, only a `staff_inductions` row per staff member
// that records which of these keys have been ticked (see
// src/lib/data/induction.ts). That means adding, rewording or reordering an
// item here is safe — it only changes what's displayed and never touches
// stored data — but an item's `key` must never be reused for a different
// item, since that key is what a person's saved progress is keyed against.
//
// Two sections from the original pack are deliberately left out here:
// - The "Forms & Checklists" pages' own per-form descriptions aren't
//   reproduced — only an acknowledgement item per form, since the
//   descriptions themselves are reference material, not something to tick.
// - The final "For Management" pages (Job Description / Advertising
//   Description / Recruitment Process / Contracts) are the recruitment
//   paper-trail for HIRING someone, not part of inducting them once
//   they're on staff — they belong with the job-description work already
//   in progress, not this checklist.

export type StaffInductionItem = {
  key: string;
  text: string;
};

export type StaffInductionSection = {
  key: string;
  title: string;
  /** Shown under the section heading — mirrors the pack's own intro line
   * for that page/group where it had one. */
  description?: string;
  items: StaffInductionItem[];
};

export const STAFF_INDUCTION_SECTIONS: StaffInductionSection[] = [
  {
    key: "intro",
    title: "Introduction Procedure",
    description: "What to expect during your first week at Beach Kids.",
    items: [
      { key: "intro.centre_tour", text: "Centre Tour — shown around, introduced to staff rostered on, staff profile form" },
      {
        key: "intro.month_one",
        text: "Month One — procedures, forms & checklists, policies, and hands-on technology (Storypark, printer, Discover)",
      },
    ],
  },
  {
    key: "policies",
    title: "Policies",
    description:
      "Read the full policy handbook (on the shelf in the foyer) and sign off on each policy once it's been read and understood.",
    items: [
      { key: "policies.childrens_code_of_rights", text: "Children's Code of Rights" },
      { key: "policies.child_protection", text: "Child Protection" },
      { key: "policies.parent_whanau_involvement", text: "Parent / Whānau Involvement" },
      { key: "policies.child_supervision", text: "Child Supervision" },
      { key: "policies.positive_guidance", text: "Positive Guidance" },
      { key: "policies.collecting_of_children", text: "Collecting of Children" },
      { key: "policies.appraisals", text: "Appraisals" },
      { key: "policies.emergency_evacuation", text: "Emergency Evacuation" },
      { key: "policies.phones_devices_cloud", text: "Phones, Centre Devices & Cloud storage" },
      { key: "policies.excursion", text: "Excursion" },
      { key: "policies.privacy_of_information", text: "Privacy of Information" },
      { key: "policies.hazard_management", text: "Hazard Management" },
      { key: "policies.accident_policy", text: "Accident Policy" },
      { key: "policies.laundry", text: "Laundry" },
      { key: "policies.administration_of_medicine", text: "Administration of Medicine" },
      { key: "policies.nappy_changing", text: "Nappy Changing" },
      { key: "policies.sleeping_and_resting_children", text: "Sleeping and Resting Children" },
      { key: "policies.smoking_alcohol_drugs", text: "Smoking, Alcohol & Drugs" },
    ],
  },
  {
    key: "forms",
    title: "Forms & Checklists",
    description: "Talked through each of these forms and knows when and how to use it.",
    items: [
      { key: "forms.administration_of_medicine", text: "Administration of Medicine Form" },
      { key: "forms.individual_health_plan", text: "Individual Child's Health Plan Document / Consent" },
      { key: "forms.baking", text: "Baking Form" },
      { key: "forms.emergency_evacuation", text: "Emergency Evacuation Form" },
      { key: "forms.hazard_management", text: "Hazard Management Form" },
      { key: "forms.major_illness_accident", text: "Major Illness or Accident Form" },
      { key: "forms.minor_accident", text: "Minor Accident Form" },
      { key: "forms.minor_illness", text: "Minor Illness Form" },
      { key: "forms.local_excursion", text: "Local Excursion Form" },
      { key: "forms.special_excursion", text: "Special Excursion Form" },
      { key: "forms.nappy_charts", text: "Nappy Charts" },
      { key: "forms.sleep_charts", text: "Sleep Charts" },
      { key: "forms.welcome_to_ohinemuri", text: "Welcome to Ohinemuri Form" },
      { key: "forms.transition_to_pukewa", text: "Transition to Pukewa Form" },
      { key: "forms.ordering", text: "Ordering process (staff room whiteboard)" },
      { key: "forms.annual_leave_request", text: "Request for Annual Leave Form" },
    ],
  },
  {
    key: "hs_foyer",
    title: "Health & Safety — Foyer",
    description: "The entrance area to Beach Kids Waihi.",
    items: [
      { key: "hs_foyer.entrance_slippery", text: "Entrance can get slippery" },
      { key: "hs_foyer.door_latched", text: "Ensure door is latched if open to prevent hands jammed" },
      { key: "hs_foyer.mat_trip_hazard", text: "The mat by front door may be a trip hazard" },
      { key: "hs_foyer.doors_closed_high_wind", text: "Ensure doors remain closed during high wind" },
      { key: "hs_foyer.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_main_kitchen",
    title: "Health & Safety — Main Kitchen (Ohinemuri)",
    items: [
      { key: "hs_main_kitchen.hot_water_slippery", text: "Hot water from tap, slippery surfaces" },
      { key: "hs_main_kitchen.sharp_cutlery_chemicals", text: "Sharp cutlery, chemicals under kitchen sink" },
      { key: "hs_main_kitchen.hot_glass_oven", text: "Hot glass on the oven and elements" },
      { key: "hs_main_kitchen.items_falling_cupboards", text: "Items falling off shelves when cupboard doors are opened" },
      { key: "hs_main_kitchen.jug_hot_water", text: "Jug / hot water" },
      { key: "hs_main_kitchen.children_locked_out", text: "Children accessing the kitchen to be locked at all times" },
      { key: "hs_main_kitchen.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_childrens_wharepaku",
    title: "Health & Safety — Children's Wharepaku",
    description: "Next to Ohinemuri room and Pukewa back room.",
    items: [
      { key: "hs_childrens_wharepaku.slippery_surfaces", text: "Slippery surfaces — water from hand basin, urine" },
      { key: "hs_childrens_wharepaku.fecal_matter", text: "Fecal matter on surfaces (walls, floors, toilets)" },
      { key: "hs_childrens_wharepaku.toilet_bowl", text: "Toilet bowl" },
      { key: "hs_childrens_wharepaku.hand_wash_sinks", text: "Hand wash over sinks" },
      { key: "hs_childrens_wharepaku.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_staff_wharepaku",
    title: "Health & Safety — Staff Wharepaku",
    description: "Located in the Pukewa back room.",
    items: [
      { key: "hs_staff_wharepaku.slippery_surfaces", text: "Slippery surfaces — water from hand basin, urine" },
      { key: "hs_staff_wharepaku.mop_broom_storage", text: "Storage of mop and broom — falling objects" },
    ],
  },
  {
    key: "hs_laundry",
    title: "Health & Safety — Laundry",
    description: "Located next to the staffroom.",
    items: [
      { key: "hs_laundry.chemicals", text: "Chemicals" },
      { key: "hs_laundry.slippery_water_chemicals", text: "Slippery surfaces — water, chemicals" },
      { key: "hs_laundry.items_falling_shelves", text: "Items falling from shelves when removing items" },
      { key: "hs_laundry.hot_water_tub", text: "Hot water from tub" },
      { key: "hs_laundry.mops_falling", text: "Mops falling over" },
      { key: "hs_laundry.electrical_appliances", text: "Electrical appliances — drier and washing machine" },
      { key: "hs_laundry.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_staffroom_noncontact",
    title: "Health & Safety — Staff Room & Non-Contact Area",
    description: "The staffroom is located next to the sleep room.",
    items: [
      { key: "hs_staffroom_noncontact.chemicals", text: "Chemicals" },
      { key: "hs_staffroom_noncontact.slippery_water_chemicals", text: "Slippery surfaces — water, chemicals" },
      { key: "hs_staffroom_noncontact.items_falling_shelves", text: "Items falling from shelves when removing items" },
      { key: "hs_staffroom_noncontact.hot_water_tub", text: "Hot water from tub" },
      { key: "hs_staffroom_noncontact.mops_falling", text: "Mops falling over" },
      { key: "hs_staffroom_noncontact.electrical_appliances", text: "Electrical appliances — drier and washing machine" },
      { key: "hs_staffroom_noncontact.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_sleep_room",
    title: "Health & Safety — Sleep Room",
    description: "Located between the foyer and staffroom.",
    items: [
      { key: "hs_sleep_room.objects_on_floor", text: "Objects lying on the floor — clothes, bedding etc" },
      { key: "hs_sleep_room.objects_falling_shelves", text: "Objects falling on shelves — ensure secure at all times" },
      { key: "hs_sleep_room.items_falling_shelves", text: "Items falling from shelves when removing items" },
      { key: "hs_sleep_room.hot_water_tub", text: "Hot water from tub" },
      { key: "hs_sleep_room.children_accessing_staffroom", text: "Children gaining access to the staffroom" },
      { key: "hs_sleep_room.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_nappy_pukewa",
    title: "Health & Safety — Nappy Changing Area (Pukewa)",
    description: "Located in the Pukewa back room.",
    items: [
      { key: "hs_nappy_pukewa.children_falling_off_table", text: "Children falling off the change table" },
      { key: "hs_nappy_pukewa.back_injuries_lifting", text: "Back injuries due to lifting children" },
      { key: "hs_nappy_pukewa.cleaning_agents_locked", text: "Cleaning agents to be locked away" },
      { key: "hs_nappy_pukewa.sockets_covered", text: "Electrical sockets covered" },
    ],
  },
  {
    key: "hs_pukewa_inside",
    title: "Health & Safety — Pukewa Inside Areas",
    description: "The main play area and back rooms of the Pukewa room.",
    items: [
      { key: "hs_pukewa_inside.sliding_door_fingers", text: "Children jamming fingers in sliding door, between shelves" },
      { key: "hs_pukewa_inside.toys_on_floor", text: "Toys/resources lying on floor — a trip hazard (especially around the water jug and cups)" },
      { key: "hs_pukewa_inside.resource_cupboards_locked", text: "Children gaining access to the resource cupboards or store room — to be locked at all times" },
      { key: "hs_pukewa_inside.art_tub_cupboard_locked", text: "Children gaining access to the cupboard by the art tubs — to be locked at all times" },
      { key: "hs_pukewa_inside.water_on_floor", text: "Water on floor from water cups — slip hazard" },
      { key: "hs_pukewa_inside.sockets_covered", text: "Electrical sockets covered" },
      { key: "hs_pukewa_inside.chairs_not_pushed_in", text: "Chairs not pushed in" },
      { key: "hs_pukewa_inside.children_climbing_furniture", text: "Children climbing on furniture (tables, chairs etc.)" },
      { key: "hs_pukewa_inside.small_items_choking", text: "Small items may be a choking hazard and to be removed" },
      { key: "hs_pukewa_inside.children_hiding_blankets", text: "Children hiding under blankets" },
      { key: "hs_pukewa_inside.seated_while_eating", text: "Children are to be seated while eating — choking hazard" },
      { key: "hs_pukewa_inside.walking_with_ipad", text: "Walking around with iPad — trip/fall hazard due to inattention" },
      { key: "hs_pukewa_inside.entrance_door_slamming", text: "Entrance door slamming — jammed fingers" },
      { key: "hs_pukewa_inside.outdoor_deck_door_locked", text: "Door to outdoor deck to be locked at all times" },
      { key: "hs_pukewa_inside.shelves_climbing", text: "Shelves — climbing hazard" },
    ],
  },
  {
    key: "hs_pukewa_outside",
    title: "Health & Safety — Pukewa Outside Areas",
    items: [
      {
        key: "hs_pukewa_outside.resource_shed",
        text: "No children in the resource shed unsupervised — closed and locked at all times when not in use (fall/choking/tool hazards)",
      },
      {
        key: "hs_pukewa_outside.carpentry_tools",
        text: "Carpentry tools supervised — hammers/saws kept below head level, tools stay on the woodworking table, covered shoes worn",
      },
      { key: "hs_pukewa_outside.sandpit_fall_hazard", text: "Areas around the sandpit — potential fall hazards" },
      {
        key: "hs_pukewa_outside.water_drowning_hazard",
        text: "Areas that can contain water — drowning hazard (troughs, dams). Fully supervised at all times or emptied/lidded",
      },
      {
        key: "hs_pukewa_outside.sandpit_spades",
        text: "Sandpit spades kept below shoulder height, no throwing sand/dirt (eye hazard)",
      },
      { key: "hs_pukewa_outside.bikes_helmets", text: "Bikes — all children wear helmets and shoes" },
      { key: "hs_pukewa_outside.deck_trip_hazard", text: "Deck — a potential trip hazard, kept free from debris" },
      { key: "hs_pukewa_outside.sensory_path_uneven", text: "Sensory path is uneven — potential trip hazard" },
      { key: "hs_pukewa_outside.no_climbing_fences", text: "No children climbing on any fences or gates" },
      { key: "hs_pukewa_outside.climbing_furniture_outside", text: "Climbing on furniture (chairs, tables, couch, woodwork table) outside — fall hazard" },
      { key: "hs_pukewa_outside.walking_with_ipad", text: "Walking around with iPad — trip/fall hazard due to inattention" },
      { key: "hs_pukewa_outside.climbing_boxes", text: "Climbing boxes / falling hazards" },
      { key: "hs_pukewa_outside.side_outdoor_access", text: "Access to side outdoor area without teacher supervision" },
    ],
  },
  {
    key: "hs_ohinemuri_inside",
    title: "Health & Safety — Ohinemuri Inside Area",
    description: "Next to the foyer.",
    items: [
      { key: "hs_ohinemuri_inside.sliding_door_fingers", text: "Children jamming fingers in sliding door, between shelves" },
      { key: "hs_ohinemuri_inside.toys_on_floor", text: "Toys/resources lying on floor — a trip hazard (especially around the water jug and cups)" },
      { key: "hs_ohinemuri_inside.resource_cupboards_locked", text: "Children gaining access to the resource cupboards — to be locked at all times" },
      { key: "hs_ohinemuri_inside.art_tub_cupboard_locked", text: "Children gaining access to the cupboard by the art tubs — to be locked at all times" },
      { key: "hs_ohinemuri_inside.water_on_floor", text: "Water on floor from water cups — slip hazard" },
      { key: "hs_ohinemuri_inside.sockets_covered", text: "Electrical sockets covered" },
      { key: "hs_ohinemuri_inside.chairs_not_pushed_in", text: "Chairs not pushed in" },
      { key: "hs_ohinemuri_inside.children_climbing_furniture", text: "Children climbing on furniture (tables, chairs etc.)" },
      { key: "hs_ohinemuri_inside.small_items_choking", text: "Small items may be a choking hazard and to be removed" },
      { key: "hs_ohinemuri_inside.children_hiding_blankets", text: "Children hiding under blankets" },
      { key: "hs_ohinemuri_inside.seated_while_eating", text: "Children are to be seated while eating — choking hazard" },
      { key: "hs_ohinemuri_inside.walking_with_ipad", text: "Walking around with iPad — trip/fall hazard due to inattention" },
      { key: "hs_ohinemuri_inside.entrance_door_slamming", text: "Entrance door slamming — jammed fingers" },
      { key: "hs_ohinemuri_inside.outdoor_deck_door_locked", text: "Door to outdoor deck to be locked at all times" },
      { key: "hs_ohinemuri_inside.shelves_climbing", text: "Shelves — climbing hazard" },
      { key: "hs_ohinemuri_inside.sunscreen_locked", text: "Sunscreen is to be stored in locked resource cupboard" },
    ],
  },
  {
    key: "hs_ohinemuri_outside",
    title: "Health & Safety — Ohinemuri Outside Areas",
    items: [
      {
        key: "hs_ohinemuri_outside.resource_shed",
        text: "No children in the resource shed unsupervised — closed and locked at all times when not in use (fall/choking/tool hazards)",
      },
      {
        key: "hs_ohinemuri_outside.carpentry_tools",
        text: "Carpentry tools supervised — hammers/saws kept below head level, tools stay on the woodworking table, covered shoes worn",
      },
      { key: "hs_ohinemuri_outside.sandpit_fall_hazard", text: "Areas around the sandpit — potential fall hazards" },
      {
        key: "hs_ohinemuri_outside.water_drowning_hazard",
        text: "Areas that can contain water — drowning hazard (troughs, dams). Fully supervised at all times or emptied/lidded",
      },
      {
        key: "hs_ohinemuri_outside.sandpit_spades",
        text: "Sandpit spades kept below shoulder height, no throwing sand/dirt (eye hazard)",
      },
      { key: "hs_ohinemuri_outside.bikes_helmets", text: "Bikes — all children wear helmets and shoes" },
      { key: "hs_ohinemuri_outside.sandpit_falling_backwards", text: "Sandpit area — child falling backwards onto concrete" },
      { key: "hs_ohinemuri_outside.deck_trip_hazard", text: "Deck — a potential trip hazard, kept free from debris" },
      { key: "hs_ohinemuri_outside.no_climbing_fences", text: "No children climbing on any fences or gates" },
      { key: "hs_ohinemuri_outside.climbing_furniture_outside", text: "Climbing on furniture (chairs, tables, couch, woodwork table) outside — fall hazard" },
      { key: "hs_ohinemuri_outside.climbing_boxes", text: "Climbing boxes / falling hazards" },
      { key: "hs_ohinemuri_outside.walking_with_ipad", text: "Walking around with iPad — trip/fall hazard due to inattention" },
      { key: "hs_ohinemuri_outside.side_outdoor_access", text: "Access to side outdoor area without teacher supervision" },
    ],
  },
  {
    key: "evacuation",
    title: "Emergency Evacuation Procedures (Centre Wide)",
    description: "Drills are carried out at least once a term. Exit ways and fire exits are kept clear at all times.",
    items: [
      { key: "evacuation.children_exiting_gates", text: "Children exiting gates without teachers in front" },
      { key: "evacuation.running_across_carpark", text: "Running across carpark — danger from cars and slippery concrete surfaces" },
      {
        key: "evacuation.supervision_in_carpark",
        text: "Supervision of children in carpark — teachers front/rear/middle, small children carried if needed",
      },
    ],
  },
];

export function getStaffInductionTotalItemCount(): number {
  return STAFF_INDUCTION_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);
}

export function getStaffInductionItemKeys(): string[] {
  return STAFF_INDUCTION_SECTIONS.flatMap((section) => section.items.map((item) => item.key));
}
