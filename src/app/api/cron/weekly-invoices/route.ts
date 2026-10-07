import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createWeeklyDraftInvoices } from "@/lib/cron/weekly-invoices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered by Vercel Cron (see vercel.json) every Tuesday morning NZ
// time. Not behind the normal login wall — a cron request carries no user
// session at all — so this route is public in middleware.ts (the
// "/api/cron" prefix) and instead checks this shared secret itself.
// Vercel automatically sends "Authorization: Bearer $CRON_SECRET" on cron
// invocations once CRON_SECRET is set as a project environment variable;
// anyone else calling this URL without that exact header gets a 401.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await createWeeklyDraftInvoices();
    revalidatePath("/finances/invoices");
    revalidatePath("/children/fees-by-family");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
