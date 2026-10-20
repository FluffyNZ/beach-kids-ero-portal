import type { MarketingSettings, MarketingSuggestion } from "@/lib/types";
import { getNzPublicHolidaysInRange } from "@/lib/nz-public-holidays";
import { addDaysIso, todayIso } from "@/lib/marketing/timezone";

// ---------------------------------------------------------------------------
// Editable, non-fabricated post suggestions. A hard rule drives every
// template below: nothing here states a fact Beach Kids hasn't actually
// confirmed — no invented event, no invented "X spots left", no asserted
// closure date. Date-driven suggestions (public holidays, Christmas) use
// real dates (verified NZ public holidays, or Ethan's own entered
// Christmas dates); everything else is a deliberately generic, editable
// prompt that leaves the real specifics for Ethan/staff to fill in before
// it ever leaves Draft. See src/lib/nz-public-holidays.ts for where the
// holiday dates themselves come from and how they were verified.
// ---------------------------------------------------------------------------

const EVERGREEN_CATEGORIES: { category: MarketingSuggestion["category"]; title: string; body: string }[] = [
  {
    category: "enrolment",
    title: "Spaces available",
    body: "Let families know you've got room for new tamariki.",
  },
  {
    category: "activity",
    title: "A look at what we've been up to",
    body: "Share a recent activity, project or outing from one of the rooms.",
  },
  {
    category: "staff_intro",
    title: "Meet the team",
    body: "Introduce a staff member to your whānau community.",
  },
  {
    category: "whanau_reminder",
    title: "A reminder for our whānau",
    body: "A practical reminder — drop-off/pick-up, parking, weather plans, anything useful.",
  },
  {
    category: "event",
    title: "An upcoming event",
    body: "An open day, working bee, fun run or anything else coming up at the centre.",
  },
];

function evergreenCaption(category: MarketingSuggestion["category"], staffName: string | null, staffRole: string | null) {
  switch (category) {
    case "enrolment":
      return "We've got space for new friends at Beach Kids! [Add which room/age group and how many spots are available]";
    case "activity":
      return "Here's a little look at what we've been up to at Beach Kids! [Add a few lines about a recent activity in your rooms]";
    case "staff_intro":
      return staffName
        ? `Meet ${staffName}! ${staffName} is one of our wonderful ${staffRole ?? "team members"} here at Beach Kids. [Add a fun fact or two about ${staffName}]`
        : "Meet one of our team! [Pick a staff member and add a fun fact or two about them]";
    case "whanau_reminder":
      return "A quick reminder for our Beach Kids whānau — [add your reminder here, e.g. drop-off times, parking, an upcoming closure]";
    case "event":
      return "Got something coming up at Beach Kids? [Add the event details — what, when, and who it's for]";
    default:
      return "[Add your post content here]";
  }
}

export type MarketingSuggestionInputs = {
  settings: MarketingSettings;
  alreadyDraftedKeys: Set<string>;
  dismissedKeys: Set<string>;
  // One real, active staff member to feature this month in the "Meet the
  // team" suggestion — pass null if there's no one to suggest (e.g. no
  // active staff, or the data layer couldn't find one). Never fabricated.
  featuredStaff: { name: string; role: string | null } | null;
  lookAheadDays?: number; // how far ahead to surface public holidays, default 45
};

/** Pure function — every real input (today's date, settings, which
 * suggestions already have a draft or were dismissed, which staff member
 * to feature) is passed in rather than fetched here, so this stays easy to
 * reason about and test. See getMarketingSuggestions in
 * src/lib/data/marketing.ts for where those real inputs come from. */
export function buildMarketingSuggestions(inputs: MarketingSuggestionInputs): MarketingSuggestion[] {
  const today = todayIso();
  const lookAheadDays = inputs.lookAheadDays ?? 45;
  const monthKey = today.slice(0, 7); // YYYY-MM, scopes evergreen suggestions to "this month"

  const suggestions: MarketingSuggestion[] = [];

  function include(key: string, suggestion: Omit<MarketingSuggestion, "key" | "alreadyDrafted">) {
    if (inputs.dismissedKeys.has(key)) return;
    suggestions.push({ key, alreadyDrafted: inputs.alreadyDraftedKeys.has(key), ...suggestion });
  }

  // --- Public holiday closures — real, verified dates. Never asserts the
  // centre is actually closed; always prompts confirmation first, per
  // Ethan's own instruction. ---------------------------------------------
  const holidays = getNzPublicHolidaysInRange(today, addDaysIso(today, lookAheadDays));
  for (const holiday of holidays) {
    include(`public_holiday:${holiday.date}`, {
      category: "public_holiday",
      title: `${holiday.name} — ${holiday.date}`,
      description: "Confirm whether Beach Kids is closed before scheduling this.",
      suggestedCaption: `A reminder that ${holiday.date} is ${holiday.name}. [Confirm whether Beach Kids is open or closed, and add any details for whānau]`,
      relevantDate: holiday.date,
    });
  }

  // --- Christmas closure / reopening — ONLY once Ethan has entered real
  // dates in Marketing settings. No suggestion is generated at all until
  // then (see the Overview page's own "add your dates" prompt instead). --
  if (inputs.settings.christmasClosureStart) {
    const year = inputs.settings.christmasClosureStart.slice(0, 4);
    include(`christmas_closure:${year}`, {
      category: "christmas_closure",
      title: `Christmas closure — ${inputs.settings.christmasClosureStart}`,
      description: "Let whānau know when Beach Kids closes for the holidays.",
      suggestedCaption: `Beach Kids will be closed from ${inputs.settings.christmasClosureStart} for the Christmas/New Year break. [Add anything else whānau should know]`,
      relevantDate: inputs.settings.christmasClosureStart,
    });
  }
  if (inputs.settings.christmasReopeningDate) {
    const year = inputs.settings.christmasReopeningDate.slice(0, 4);
    include(`christmas_reopening:${year}`, {
      category: "christmas_reopening",
      title: `Reopening — ${inputs.settings.christmasReopeningDate}`,
      description: "Let whānau know when Beach Kids reopens after the break.",
      suggestedCaption: `We'll be back open from ${inputs.settings.christmasReopeningDate} — looking forward to seeing everyone again! [Add anything else whānau should know]`,
      relevantDate: inputs.settings.christmasReopeningDate,
    });
  }

  // --- Evergreen, generic prompts — scoped to the current month so
  // dismissing one doesn't hide it forever. -------------------------------
  for (const evergreen of EVERGREEN_CATEGORIES) {
    include(`${evergreen.category}:${monthKey}`, {
      category: evergreen.category,
      title: evergreen.title,
      description: evergreen.body,
      suggestedCaption: evergreenCaption(
        evergreen.category,
        inputs.featuredStaff?.name ?? null,
        inputs.featuredStaff?.role ?? null
      ),
      relevantDate: null,
    });
  }

  return suggestions.sort((a, b) => {
    if (a.relevantDate && b.relevantDate) return a.relevantDate.localeCompare(b.relevantDate);
    if (a.relevantDate) return -1;
    if (b.relevantDate) return 1;
    return a.title.localeCompare(b.title);
  });
}
