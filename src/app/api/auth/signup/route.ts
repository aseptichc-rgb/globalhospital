import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";
import { createUser, getUser } from "@/lib/users";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const existing = await getUser(decoded.uid);
    if (existing) {
      return NextResponse.json({ user: existing });
    }

    const body = await request.json().catch(() => ({}));
    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.slice(0, 100)
        : undefined;
    const hospitalName =
      typeof body?.hospitalName === "string"
        ? body.hospitalName.slice(0, 200)
        : undefined;

    const user = await createUser(decoded.uid, decoded.email, {
      displayName,
      hospitalName,
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[api/auth/signup] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Signup failed: ${msg}` },
      { status: 500 }
    );
  }
}
