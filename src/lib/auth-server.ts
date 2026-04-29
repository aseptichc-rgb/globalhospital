import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "./firebase";
import { ensureWhitelistedAdmin, getUser, isWhitelistedAdmin } from "./users";
import type { AppUser } from "@/types/user";

export const SESSION_COOKIE = "gh_session";

export interface AuthedRequest {
  uid: string;
  email: string;
  user: AppUser;
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (cookie?.value) return cookie.value;
  return null;
}

async function verifyAndLoad(req: NextRequest): Promise<AuthedRequest | null> {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.email) return null;
    await ensureWhitelistedAdmin(decoded.uid, decoded.email);
    const user = await getUser(decoded.uid);
    if (!user) return null;
    return { uid: decoded.uid, email: decoded.email, user };
  } catch (err) {
    console.error("[auth] token verification failed:", err);
    return null;
  }
}

export async function requireUser(
  req: NextRequest
): Promise<AuthedRequest | NextResponse> {
  const auth = await verifyAndLoad(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}

export async function requireApproved(
  req: NextRequest
): Promise<AuthedRequest | NextResponse> {
  const result = await requireUser(req);
  if (result instanceof NextResponse) return result;
  if (result.user.status !== "approved") {
    return NextResponse.json(
      { error: "Account not approved", status: result.user.status },
      { status: 403 }
    );
  }
  return result;
}

export async function requireAdmin(
  req: NextRequest
): Promise<AuthedRequest | NextResponse> {
  const result = await requireApproved(req);
  if (result instanceof NextResponse) return result;
  const isAdmin =
    result.user.role === "admin" || isWhitelistedAdmin(result.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
