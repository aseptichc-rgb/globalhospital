import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getUsageStats } from "@/lib/usage";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const parsed = daysParam ? parseInt(daysParam, 10) : DEFAULT_DAYS;
    const sinceDays =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_DAYS)
        : DEFAULT_DAYS;

    const stats = await getUsageStats({ sinceDays });
    return NextResponse.json({ sinceDays, stats });
  } catch (err) {
    console.error("[api/admin/usage] error:", err);
    return NextResponse.json(
      { error: "Failed to load usage stats" },
      { status: 500 }
    );
  }
}
