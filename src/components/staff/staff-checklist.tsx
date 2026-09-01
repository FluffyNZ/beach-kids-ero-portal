import { StaffChecklistItemRow } from "./staff-checklist-item-row";
import { updateStaffChecklistItem, uploadChecklistEvidence } from "@/lib/actions/staff";
import type { StaffChecklistArea } from "@/lib/types";

export function StaffChecklist({ staffId, areas }: { staffId: string; areas: StaffChecklistArea[] }) {
  if (areas.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">
        No checklist template found — run the staff checklist migration to load it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {areas.map((area) => {
        const checkedCount = area.items.filter((i) => i.is_checked).length;
        return (
          <div key={area.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal">{area.name}</h3>
              <span className="text-xs font-medium text-charcoal/50">
                {checkedCount}/{area.items.length} complete
              </span>
            </div>
            <div className="card divide-y divide-charcoal/5">
              {area.items.map((item) => (
                <StaffChecklistItemRow
                  key={item.id}
                  item={item}
                  onChange={updateStaffChecklistItem.bind(null, staffId, item.id)}
                  onUploadEvidence={uploadChecklistEvidence.bind(null, staffId, item.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
