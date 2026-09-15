// Curated "what to collect" advice for the Curriculum criteria (C1–C16),
// grounded in the Licensing Criteria for Centre-Based ECE Services and
// Te Whāriki, and pointed at the systems Beach Kids already runs
// (Storypark, Policies, Staff, Children & Fees). This is a starting
// checklist for gathering real evidence, not a source of evidence itself —
// nothing here should ever be treated as if it were the evidence.
//
// Only Curriculum is covered for now. A criterion with no entry here
// simply shows no guidance panel — silence, not a placeholder.

export type EvidenceGuidance = {
  whatToCollect: string[];
  whereItLives: string;
  /** True for the three items C14 names explicitly as required
   * documentation, regardless of how the rest of the evidence is kept. */
  requiredByC14?: boolean;
};

export const CURRICULUM_EVIDENCE_GUIDANCE: Record<string, EvidenceGuidance> = {
  C1: {
    whatToCollect: [
      "Beach Kids' written philosophy/curriculum statement, showing how it's built around Te Whāriki (Ministry of Education, 2017).",
      "Programme plans that name Te Whāriki strands or goals, not just activity lists.",
      "Staff induction material showing new kaiako are oriented to Te Whāriki on starting.",
    ],
    whereItLives: "Policies (philosophy/curriculum policy) plus a couple of sample programme plans.",
  },
  C2: {
    whatToCollect: [
      "A handful of individual learning stories (Storypark) that show the full cycle — observation → assessment → a \"what next\" that actually gets followed up.",
      "Evidence a child's home life feeds in: an \"all about me\" or enrolment interest form, whānau input captured in a story.",
      "Internal evaluation notes — where the team reviewed whether a planned response actually worked.",
    ],
    whereItLives: "Storypark exports, plus enrolment/interest notes from Children & Fees.",
  },
  C3: {
    whatToCollect: [
      "Photos or learning-story excerpts showing warm, back-and-forth interaction (not just supervision).",
      "Primary caregiving or key-teacher assignment records, especially for Tainui (under-2s), where continuity of relationship matters most.",
      "Appraisal criteria that explicitly assess relationship quality, not just task completion.",
    ],
    whereItLives: "Staff appraisal records, plus a small, consented set of Storypark photos.",
  },
  C4: {
    whatToCollect: [
      "Qualification and practising-certificate records.",
      "PLD certificates or course records tied to child development theory (attachment, brain development, etc.).",
      "Team meeting minutes where a child's stage of development was discussed and connected to a practice decision.",
    ],
    whereItLives: "Staff → Qualifications, plus meeting minutes if you keep them.",
  },
  C5: {
    whatToCollect: [
      "Evidence te reo and tikanga Māori are part of the daily rhythm — waiata, karakia, routines — not confined to Te Wiki o te Reo Māori.",
      "Photos of bilingual signage, displays and resources actually in use in the rooms.",
      "Staff PLD records in te reo/tikanga Māori.",
      "Any record of contact or relationship with local mana whenua/iwi, if this exists.",
    ],
    whereItLives:
      "Evidence Library (category: Photo Evidence) plus Staff PLD records — flag as a gap if there's no iwi relationship on file.",
  },
  C6: {
    whatToCollect: [
      "Cultural background information gathered at enrolment, and evidence it actually shapes practice (not just filed away).",
      "Displays, resources or celebrations that reflect the cultures actually on your roll — not a generic multicultural poster set.",
      "Home-language support: translated materials, or a family's own language acknowledged in a learning story.",
    ],
    whereItLives: "Children & Fees enrolment notes, plus photo evidence of displays in use.",
  },
  C7: {
    whatToCollect: [
      "Individual support plans for any child with additional learning needs.",
      "Evidence of child-initiated choice — a choice board, photos of child-led play that shaped the next day's planning.",
      "Examples where a child's preference visibly changed what was offered.",
    ],
    whereItLives: "Support plans filed under the relevant child; Storypark for the choice/voice evidence.",
  },
  C8: {
    whatToCollect: [
      "Photos of a print-rich room — labels, books, mark-making areas, name cards.",
      "Programme plans showing deliberate oral-language time: story, song, group kōrero.",
      "Referral or support records for any child with an identified speech/language need (links to C13).",
    ],
    whereItLives: "Evidence Library (Photo Evidence) — cross-reference C13's agency records for any speech-language referrals.",
  },
  C9: {
    whatToCollect: [
      "A week or month of programme plans showing the indoor/outdoor and individual/group balance in practice, not just intent.",
      "Photos of environment set-up — provocations, outdoor learning areas.",
      "Records of any excursions or visitors that extended the programme.",
    ],
    whereItLives: "Programme plans plus photo evidence, ideally one cycle per room (Tainui / Pukewa / Ohinemuri).",
  },
  C10: {
    whatToCollect: [
      "A written positive-guidance policy describing the actual process staff use (not just \"we use positive guidance\").",
      "Evidence it's applied day-to-day — a restorative-conversation script, a \"solving problems together\" display used in the room.",
    ],
    whereItLives: "Policies — this exact document is one of the three C14 names explicitly.",
    requiredByC14: true,
  },
  C11: {
    whatToCollect: [
      "Enrolment or interest forms that ask what families actually want for their child, not just logistics.",
      "A learning story or plan that visibly responds to a stated family aspiration.",
    ],
    whereItLives: "Children & Fees enrolment notes, plus Storypark.",
  },
  C12: {
    whatToCollect: [
      "A written process describing how and how often families hear about their child's learning (this is the document C14 names specifically).",
      "Storypark communication logs, daily diaries (especially for infants), and any parent evenings or portfolio hand-backs.",
      "Family feedback or survey results, and a note on what changed because of them.",
    ],
    whereItLives: "Storypark, plus a short written policy — the second of the three C14 names explicitly.",
    requiredByC14: true,
  },
  C13: {
    whatToCollect: [
      "A directory of local specialist services and contacts (MoE Learning Support, Plunket, speech-language therapy, RTLB).",
      "A running record of when an agency was actually contacted, why, and what came of it — this is the record C14 names explicitly.",
      "Keep identifying child details in the confidential file, not the general evidence library.",
    ],
    whereItLives: "A simple contact log — the third of the three C14 names explicitly.",
    requiredByC14: true,
  },
  C14: {
    whatToCollect: [
      "This criterion doesn't ask for new evidence — it asks whether C1–C13 are documented somewhere, in whatever form suits how Beach Kids operates (portfolios, wall displays, policies).",
      "Three items are named explicitly regardless of format: a written positive-guidance process (feeds C10), a documented process for parent communication & involvement (feeds C12), and a record of information/guidance sought from agencies (feeds C13).",
    ],
    whereItLives: "Cross-check C10, C12 and C13 are each filed before marking this one — it's the checkpoint, not a new document.",
  },
  C15: {
    whatToCollect: [
      "Philosophy statement with each of Te Whāriki's four principles (empowerment, holistic development, family & community, relationships) named and given a Beach Kids-specific example — not just the wording copied in.",
      "A planning template or format that prompts staff to note which principle(s) an experience responds to.",
      "Appraisal or PLD notes that reference a principle in practice, not just in theory.",
    ],
    whereItLives: "Same philosophy document as C1 — this is really \"C1, made specific.\"",
  },
  C16: {
    whatToCollect: [
      "A curriculum overview or matrix showing all five strands (well-being, belonging, contribution, communication, exploration) appear across a term, not just the easy ones at the expense of contribution/belonging.",
      "A sample of learning stories or planning notes tagged or discussed against strand language.",
    ],
    whereItLives: "Storypark exports tagged by strand, if you use that feature, plus your planning template.",
  },
};
