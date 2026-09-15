"use client";

import type { LearningTagSet } from "@/lib/types";

export function TagPicker({
  tagSets,
  selectedTagIds,
  onChange,
}: {
  tagSets: LearningTagSet[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(tagId: string) {
    if (selectedTagIds.includes(tagId)) onChange(selectedTagIds.filter((id) => id !== tagId));
    else onChange([...selectedTagIds, tagId]);
  }

  if (tagSets.length === 0) {
    return <p className="text-sm text-charcoal/50">No learning tag sets set up yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {tagSets.map((set) => (
        <div key={set.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">{set.name}</p>
          <div className="flex flex-col gap-2">
            {set.tags.map((tag) => (
              <div key={tag.id}>
                <button
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className={`badge ${
                    selectedTagIds.includes(tag.id) ? "bg-burgundy-500 text-white" : "bg-sand-100 text-charcoal/70 hover:bg-sand-200"
                  }`}
                >
                  {tag.name}
                  {tag.maori_name ? ` | ${tag.maori_name}` : ""}
                </button>
                {tag.children.length > 0 && (
                  <div className="ml-4 mt-1.5 flex flex-wrap gap-1.5">
                    {tag.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => toggle(child.id)}
                        className={`badge ${
                          selectedTagIds.includes(child.id)
                            ? "bg-burgundy-500 text-white"
                            : "bg-sand-50 text-charcoal/60 hover:bg-sand-100"
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
