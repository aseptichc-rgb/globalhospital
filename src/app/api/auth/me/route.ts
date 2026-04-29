import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const result = await requireUser(request);
    if (result instanceof NextResponse) return result;
    return NextResponse.json({ user: result.user });
  } catch (err) {
    console.error("[api/auth/me] error:", err);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}
