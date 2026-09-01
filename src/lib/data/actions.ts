import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActionItem } from "@/lib/types";
import type { ActionPriority, ActionStatusValue } from "@/lib/supabase/database.types";

export async function getActionsForCriterion(criterionId: string): Promise<ActionItem[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("actions")
    .select("*")
    .eq("criterion_id", criterionId)
    .order("created_at", { ascending: false });

  return (rows ?? []).map((r) => ({
    id: r.id,
    criterion_id: r.criterion_id,
    criterion_code: "",
    criterion_title: "",
    section_code: "",
    description: r.description,
    responsible_person: r.responsible_person,
    due_date: r.due_date,
    priority: r.priority,
    status: r.status,
    completion_date: r.completion_date,
    created_at: r.created_at,
  }));
}

export type ActionFilters = {
  status?: ActionStatusValue | "overdue" | "due_soon";
  priority?: ActionPriority;
  sectionCode?: string;
  responsiblePerson?: string;
};

export async function getActionsList(filters?: ActionFilters): Promise<ActionItem[]> {
  const supabase = createClient();

  let query = supabase.from("actions").select("*").order("due_date", { ascending: true, nullsFirst: false });

  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.responsiblePerson) query = query.eq("responsible_person", filters.responsiblePerson);
  if (filters?.status && filters.status !== "overdue" && filters.status !== "due_soon") {
    query = query.eq("status", filters.status);
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const criterionIds = Array.from(new Set(rows.map((r) => r.criterion_id)));
  const { data: criteria } = await supabase
    .from("ero_criteria")
    .select("id, code, title, section_id")
    .in("id", criterionIds);

  const sectionIds = Array.from(new Set((criteria ?? []).map((c) => c.section_id)));
  const { data: sections } = await supabase.from("ero_sections").select("id, code").in("id", sectionIds);

  const sectionCodeById = new Map((sections ?? []).map((s) => [s.id, s.code]));
  const criterionById = new Map((criteria ?? []).map((c) => [c.id, c]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let items: ActionItem[] = rows.map((r) => {
    const criterion = criterionById.get(r.criterion_id);
    return {
      id: r.id,
      criterion_id: r.criterion_id,
      criterion_code: criterion?.code ?? "—",
      criterion_title: criterion?.title ?? "",
      section_code: criterion ? sectionCodeById.get(criterion.section_id) ?? "" : "",
      description: r.description,
      responsible_person: r.responsible_person,
      due_date: r.due_date,
      priority: r.priority,
      status: r.status,
      completion_date: r.completion_date,
      created_at: r.created_at,
    };
  });

  if (filters?.sectionCode) {
    items = items.filter((a) => a.section_code === filters.sectionCode);
  }

  if (filters?.status === "overdue") {
    items = items.filter(
      (a) => a.status !== "completed" && a.due_date !== null && new Date(a.due_date) < today
    );
  }

  if (filters?.status === "due_soon") {
    const in14 = new Date(today);
    in14.setDate(in14.getDate() + 14);
    items = items.filter(
      (a) =>
        a.status !== "completed" &&
        a.due_date !== null &&
        new Date(a.due_date) >= today &&
        new Date(a.due_date) <= in14
    );
  }

  return items;
}
