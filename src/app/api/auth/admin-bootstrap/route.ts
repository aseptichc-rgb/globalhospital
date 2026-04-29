import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";
import { createUser, isWhitelistedAdmin } from "@/lib/users";
import { isValidUsername, usernameToEmail } from "@/lib/username";

// Lazily creates the very first admin (whitelisted via ADMIN_USERNAMES) when
// they try to log in. Refuses if any Firebase user already exists for that
// synthetic email — re-running is not a way to reset the admin's password.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }
    if (!isWhitelistedAdmin(username)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password too short" },
        { status: 400 }
      );
    }

    const email = usernameToEmail(username);
    const auth = getAdminAuth();

    try {
      // If the user already exists, refuse — login should have succeeded then,
      // and exposing creation here would let anyone overwrite admin passwords.
      await auth.getUserByEmail(email);
      return NextResponse.json(
        { error: "Already exists" },
        { status: 409 }
      );
    } catch {
      // Not found → continue with creation.
    }

    const created = await auth.createUser({
      email,
      password,
      displayName: username,
    });
    await createUser(created.uid, username, {
      role: "admin",
      status: "approved",
      approvedBy: "bootstrap",
      displayName: username,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/auth/admin-bootstrap] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Bootstrap failed: ${msg}` },
      { status: 500 }
    );
  }
}
