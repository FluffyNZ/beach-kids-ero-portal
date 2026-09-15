import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LearningTag, LearningTagSet } from "@/lib/types";

/** All active learning tag sets (Te Whāriki today; Beach Kids Values,
 * Learning Dispositions, Interests, Te Reo Māori and School Readiness can
 * be added later as more rows — no schema change needed), each with its
 * tags nested strand → goal. */
export async function getLearningTagSets(): Promise<LearningTagSet[]> {
  const supabase = createClient();
  const [{ data: sets }, { data: tags }] = await Promise.all([
    supabase.from("learning_tag_sets").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("learning_tags").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  const setById = new Map((sets ?? []).map((s) => [s.id, s]));

  const flatTags: LearningTag[] = (tags ?? []).map((t) => {
    const set = setById.get(t.set_id);
    return {
      id: t.id,
      set_id: t.set_id,
      set_key: set?.key ?? "",
      set_name: set?.name ?? "",
      parent_tag_id: t.parent_tag_id,
      name: t.name,
      maori_name: t.maori_name,
      sort_order: t.sort_order,
    };
  });

  return (sets ?? []).map((s) => {
    const topLevel = flatTags.filter((t) => t.set_id === s.id && t.parent_tag_id === null);
    return {
      id: s.id,
      key: s.key,
      name: s.name,
      sort_order: s.sort_order,
      tags: topLevel.map((t) => ({
        ...t,
        children: flatTags.filter((c) => c.parent_tag_id === t.id),
      })),
    };
  });
}

/** Every tag, flat — for building a filter dropdown or resolving ids back
 * to display names without re-walking the tree. */
export async function getAllLearningTagsFlat(): Promise<LearningTag[]> {
  const sets = await getLearningTagSets();
  const flat: LearningTag[] = [];
  sets.forEach((s) => {
    s.tags.forEach((t) => {
      flat.push(t);
      t.children.forEach((c) => flat.push(c));
    });
  });
  return flat;
}
