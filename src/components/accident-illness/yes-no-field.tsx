"use client";

/** A tri-state Yes / No / Not recorded control, submitted as a hidden radio
 * group. Deliberately three states, not two — an unanswered field on the
 * real paper form should stay honestly "not recorded" rather than being
 * forced to a default of "No". */
export function YesNoField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: boolean | null;
}) {
  const defaultOption = defaultValue === true ? "yes" : defaultValue === false ? "no" : "";

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1.5">
        {[
          { value: "", text: "Not recorded" },
          { value: "yes", text: "Yes" },
          { value: "no", text: "No" },
        ].map((opt) => (
          <label
            key={opt.value || "blank"}
            className="flex-1 cursor-pointer rounded-lg border border-charcoal/10 px-2 py-1.5 text-center text-xs font-medium text-charcoal/60 transition-colors has-[:checked]:border-burgundy-300 has-[:checked]:bg-burgundy-50 has-[:checked]:text-burgundy-700"
          >
            <input type="radio" name={name} value={opt.value} defaultChecked={defaultOption === opt.value} className="sr-only" />
            {opt.text}
          </label>
        ))}
      </div>
    </div>
  );
}
