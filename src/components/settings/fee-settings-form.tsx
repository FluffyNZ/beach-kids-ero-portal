"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFeeSettings } from "@/lib/actions/fees";
import type { FeeSettings } from "@/lib/types";

/** Edits the single centre-wide fee_settings row — the standard hourly
 * rate, sibling discount %, and 20 Hours ECE daily/weekly caps every
 * child's fee is calculated from. Sibling discount is entered as a whole
 * percent (e.g. 10) and stored as a fraction (0.10). */
export function FeeSettingsForm({ settings }: { settings: FeeSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [rate, setRate] = useState(String(settings.standard_hourly_rate));
  const [discountPercent, setDiscountPercent] = useState(String(settings.sibling_discount_percent * 100));
  const [dailyMax, setDailyMax] = useState(String(settings.ece_daily_max_hours));
  const [weeklyMax, setWeeklyMax] = useState(String(settings.ece_weekly_max_hours));

  return (
    <form
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          await updateFeeSettings({
            standard_hourly_rate: Number(rate) || 0,
            sibling_discount_percent: (Number(discountPercent) || 0) / 100,
            ece_daily_max_hours: Number(dailyMax) || 0,
            ece_weekly_max_hours: Number(weeklyMax) || 0,
          });
          setMessage("Saved.");
          router.refresh();
        });
      }}
    >
      <div>
        <label className="label">Standard hourly rate ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Sibling discount (%)</label>
        <input
          type="number"
          step="1"
          min="0"
          max="100"
          className="input"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">20 Hours ECE — daily cap (hours)</label>
        <input
          type="number"
          step="0.5"
          min="0"
          className="input"
          value={dailyMax}
          onChange={(e) => setDailyMax(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">20 Hours ECE — weekly cap (hours)</label>
        <input
          type="number"
          step="0.5"
          min="0"
          className="input"
          value={weeklyMax}
          onChange={(e) => setWeeklyMax(e.target.value)}
          required
        />
      </div>

      {message && <p className="rounded-lg bg-status-readyBg px-3 py-2 text-sm text-status-ready">{message}</p>}

      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Saving…" : "Save fee settings"}
      </button>
    </form>
  );
}
