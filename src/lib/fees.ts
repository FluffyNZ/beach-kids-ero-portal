import type { ChildEnrolledSchedule, ChildWeeklyFee, FeeSettings, WeekdayHours } from "@/lib/types";

/** Hours between two Postgres "HH:MM:SS" time strings — 0 if either is
 * missing, so a day with no booked slot contributes nothing. */
function timeRangeHours(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const minutes = endH * 60 + endM - (startH * 60 + startM);
  return minutes > 0 ? minutes / 60 : 0;
}

/** Turns a child's enrolled (regular booked) schedule into the same
 * Mon-Fri hours shape actual attendance is recorded in, so it can feed
 * the same fee calculation as a stand-in for a week nobody has entered
 * real hours for yet. */
export function scheduleToWeekdayHours(schedule: ChildEnrolledSchedule): WeekdayHours {
  return {
    mon_hours: timeRangeHours(schedule.mon_start, schedule.mon_end),
    tue_hours: timeRangeHours(schedule.tue_start, schedule.tue_end),
    wed_hours: timeRangeHours(schedule.wed_start, schedule.wed_end),
    thu_hours: timeRangeHours(schedule.thu_start, schedule.thu_end),
    fri_hours: timeRangeHours(schedule.fri_start, schedule.fri_end),
  };
}

/** The weekly fee calculation — same rules the uploaded fees report used:
 *
 * 1. A special weekly override, if set, replaces everything else.
 * 2. Otherwise: chargeable hours = weekly hours minus 20 Hours ECE free
 *    hours (capped per day, then capped again per week), times the
 *    child's hourly rate (or the centre's standard rate if they don't
 *    have their own).
 * 3. A 10% (or whatever fee_settings says) sibling discount is taken off
 *    that, when the child qualifies (a bill payer with more than one
 *    active child).
 * 4. What's left is what the centre earns from this child this week.
 *    Their WINZ subsidy (if any) is deducted from that to get what the
 *    parent themselves is actually billed — never the other way round.
 */
export function calculateChildWeeklyFee(input: {
  childId: string;
  fullName: string;
  roomName: string | null;
  roomColor: string | null;
  hours: WeekdayHours;
  hourlyRateOverride: number | null;
  twentyHoursEce: boolean;
  siblingDiscountEligible: boolean;
  specialWeeklyOverride: number | null;
  winzWeeklyPayment: number | null;
  settings: FeeSettings;
  isEstimated?: boolean;
}): ChildWeeklyFee {
  const { mon_hours, tue_hours, wed_hours, thu_hours, fri_hours } = input.hours;
  const dayHours = [mon_hours, tue_hours, wed_hours, thu_hours, fri_hours];
  const weeklyHours = dayHours.reduce((sum, h) => sum + h, 0);

  const hourlyRate = input.hourlyRateOverride ?? input.settings.standard_hourly_rate;

  let eceFreeHours = 0;
  if (input.twentyHoursEce) {
    const dailyCapped = dayHours.reduce((sum, h) => sum + Math.min(h, input.settings.ece_daily_max_hours), 0);
    eceFreeHours = Math.min(dailyCapped, input.settings.ece_weekly_max_hours);
  }

  const chargeableHours = Math.max(0, weeklyHours - eceFreeHours);
  const baseFee = chargeableHours * hourlyRate;
  const siblingDiscountAmount = input.siblingDiscountEligible ? baseFee * input.settings.sibling_discount_percent : 0;
  const calculatedFee = baseFee - siblingDiscountAmount;

  const isSpecialOverride = input.specialWeeklyOverride !== null;
  const feeTotal = isSpecialOverride ? (input.specialWeeklyOverride as number) : calculatedFee;

  const winzPayment = input.winzWeeklyPayment ?? 0;
  const parentPays = Math.max(0, feeTotal - winzPayment);

  return {
    child_id: input.childId,
    full_name: input.fullName,
    room_name: input.roomName,
    room_color: input.roomColor,
    hours: input.hours,
    weekly_hours: weeklyHours,
    ece_free_hours: eceFreeHours,
    chargeable_hours: chargeableHours,
    hourly_rate: hourlyRate,
    base_fee: baseFee,
    sibling_discount_amount: siblingDiscountAmount,
    fee_total: feeTotal,
    is_special_override: isSpecialOverride,
    winz_payment: winzPayment,
    parent_pays: parentPays,
    is_estimated: input.isEstimated ?? false,
  };
}
