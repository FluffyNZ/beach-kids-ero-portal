import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { processDueMarketingPosts } from "@/lib/cron/marketing-publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered by Vercel Cron (see vercel.json) every 15 minutes — this is
// what makes Marketing scheduling work even when nobody has the site open
// (the brief's "must work when the website is closed" requirement), and
// is the ONLY way Instagram posts actually go out at all, since Instagram
// has no native scheduling of its own. Same shared-secret pattern as
// weekly-invoices: public in middleware.ts (the "/api/cron" prefix), auth
// checked here instead via the CRON_SECRET Vercel sends automatically.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueMarketingPosts();
    revalidatePath("/marketing");
    revalidatePath("/marketing/drafts");
    revalidatePath("/marketing/published");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
