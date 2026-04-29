import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listUsers } from "@/lib/users";
import type { UserStatus } from "@/types/user";

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "rejected"
        ? (statusParam as UserStatus)
        : undefined;

    const users = await listUsers(status ? { status } : undefined);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[api/admin/users] error:", err);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
