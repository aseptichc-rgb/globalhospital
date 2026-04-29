import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { setUserStatus } from "@/lib/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const { uid } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body?.status;
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    await setUserStatus(uid, status, result.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users/:uid] error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
