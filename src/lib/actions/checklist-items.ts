"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function addChecklistItem(criterionId: string, criterionCode: string, description: string) {
  if (!description.trim()) return;
  const supabase = createClient();

  const { count } = await supabase
    .from("beachkids_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("criterion_id", criterionId);

  await supabase.from("beachkids_checklist_items").insert({
    criterion_id: criterionId,
    description: description.trim(),
    sort_order: count ?? 0,
  });

  revalidatePath(`/checklist/${criterionCode}`);
}

export async function toggleChecklistItem(itemId: string, criterionCode: string, isChecked: boolean) {
  const supabase = createClient();
  const userId = await currentUserId();

  await supabase
    .from("beachkids_checklist_items")
    .update({
      is_checked: isChecked,
      checked_at: isChecked ? new Date().toISOString() : null,
      checked_by: isChecked ? userId : null,
    })
    .eq("id", itemId);

  revalidatePath(`/checklist/${criterionCode}`);
}

export async function deleteChecklistItem(itemId: string, criterionCode: string) {
  const supabase = createClient();
  await supabase.from("beachkids_checklist_items").delete().eq("id", itemId);
  revalidatePath(`/checklist/${criterionCode}`);
}
