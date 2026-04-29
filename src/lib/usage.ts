import { getDb } from "./firebase";
import type { UsageLog } from "@/types/user";

const COLLECTION = "usage_logs";

export interface UsageMetadataLike {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export async function logUsage(args: {
  uid: string;
  email: string;
  route: string;
  model: string;
  usage: UsageMetadataLike | undefined;
}): Promise<void> {
  try {
    const u = args.usage || {};
    await getDb()
      .collection(COLLECTION)
      .add({
        uid: args.uid,
        email: args.email,
        route: args.route,
        model: args.model,
        promptTokens: u.promptTokenCount || 0,
        candidatesTokens: u.candidatesTokenCount || 0,
        totalTokens:
          u.totalTokenCount ||
          (u.promptTokenCount || 0) + (u.candidatesTokenCount || 0),
        createdAt: new Date().toISOString(),
      });
  } catch (err) {
    // Usage logging must never break the calling request.
    console.error("[usage.logUsage] failed to log:", err);
  }
}

export interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  byUser: Array<{
    uid: string;
    email: string;
    calls: number;
    totalTokens: number;
  }>;
  byRoute: Array<{ route: string; calls: number; totalTokens: number }>;
  byDay: Array<{ date: string; calls: number; totalTokens: number }>;
  recent: UsageLog[];
}

export async function getUsageStats(opts?: {
  sinceDays?: number;
}): Promise<UsageStats> {
  try {
    const since = new Date(
      Date.now() - (opts?.sinceDays ?? 30) * 24 * 60 * 60 * 1000
    ).toISOString();
    const snap = await getDb()
      .collection(COLLECTION)
      .where("createdAt", ">=", since)
      .get();
    const rows: UsageLog[] = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as UsageLog
    );

    const byUserMap = new Map<
      string,
      { uid: string; email: string; calls: number; totalTokens: number }
    >();
    const byRouteMap = new Map<
      string,
      { route: string; calls: number; totalTokens: number }
    >();
    const byDayMap = new Map<
      string,
      { date: string; calls: number; totalTokens: number }
    >();

    let totalTokens = 0;
    let totalPromptTokens = 0;
    let totalCandidatesTokens = 0;

    for (const r of rows) {
      const tokens = r.totalTokens || 0;
      totalTokens += tokens;
      totalPromptTokens += r.promptTokens || 0;
      totalCandidatesTokens += r.candidatesTokens || 0;

      const u = byUserMap.get(r.uid) || {
        uid: r.uid,
        email: r.email,
        calls: 0,
        totalTokens: 0,
      };
      u.calls += 1;
      u.totalTokens += tokens;
      byUserMap.set(r.uid, u);

      const rt = byRouteMap.get(r.route) || {
        route: r.route,
        calls: 0,
        totalTokens: 0,
      };
      rt.calls += 1;
      rt.totalTokens += tokens;
      byRouteMap.set(r.route, rt);

      const day = (r.createdAt || "").slice(0, 10);
      const d = byDayMap.get(day) || { date: day, calls: 0, totalTokens: 0 };
      d.calls += 1;
      d.totalTokens += tokens;
      byDayMap.set(day, d);
    }

    rows.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    return {
      totalCalls: rows.length,
      totalTokens,
      totalPromptTokens,
      totalCandidatesTokens,
      byUser: [...byUserMap.values()].sort(
        (a, b) => b.totalTokens - a.totalTokens
      ),
      byRoute: [...byRouteMap.values()].sort(
        (a, b) => b.totalTokens - a.totalTokens
      ),
      byDay: [...byDayMap.values()].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      recent: rows.slice(0, 50),
    };
  } catch (err) {
    console.error("[usage.getUsageStats] error:", err);
    throw err;
  }
}
