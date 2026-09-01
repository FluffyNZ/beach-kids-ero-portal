"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionPriority, ActionStatusValue } from "@/lib/supabase/database.types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type ActionInput = {
  description: string;
  responsible_person: string;
  due_date: string | null;
  priority: ActionPriority;
};

export async function createAction(criterionId: string, criterionCode: string, input: ActionInput) {
  const supabase = createClient();
  const userId = await currentUserId();

  await supabase.from("actions").insert({
    criterion_id: criterionId,
    description: input.description,
    responsible_person: input.responsible_person,
    due_date: input.due_date,
    priority: input.priority,
    created_by: userId,
  });

  await supabase.from("activity_log").insert({
    criterion_id: criterionId,
    entity_type: "action",
    event_type: "action_created",
    description: `Action created: "${input.description}"`,
    performed_by: userId,
  });

  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
}

export async function updateAction(
  actionId: string,
  criterionCode: string,
  fields: Partial<ActionInput> & { status?: ActionStatusValue }
) {
  const supabase = createClient();
  await supabase.from("actions").update(fields).eq("id", actionId);
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
}

export async function completeAction(actionId: string, criterionId: string, criterionCode: string) {
  const supabase = createClient();
  const userId = await currentUserId();
  const today = new Date().toISOString().slice(0, 10);

  await supabase
    .from("actions")
    .update({ status: "completed", completion_date: today })
    .eq("id", actionId);

  await supabase.from("activity_log").insert({
    criterion_id: criterionId,
    entity_type: "action",
    entity_id: actionId,
    event_type: "action_completed",
    description: "Action marked complete",
    performed_by: userId,
  });

  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
}

export async function deleteAction(actionId: string, criterionCode: string) {
  const supabase = createClient();
  await supabase.from("actions").delete().eq("id", actionId);
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/actions");
  revalidatePath("/dashboard");
}
