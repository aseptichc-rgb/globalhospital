import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAdminAuth } from "@/lib/firebase";
import { createUser, findByUsername, listUsers } from "@/lib/users";
import { isValidUsername, usernameToEmail } from "@/lib/username";
import type { UserStatus } from "@/types/user";

const MIN_PASSWORD_LEN = 6;

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
    console.error("[api/admin/users GET] error:", err);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const body = await request.json().catch(() => ({}));
    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password =
      typeof body?.password === "string" ? body.password : "";
    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.slice(0, 100)
        : undefined;
    const hospitalName =
      typeof body?.hospitalName === "string"
        ? body.hospitalName.slice(0, 200)
        : undefined;

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "아이디는 영문 소문자/숫자/_ 3-20자여야 합니다." },
        { status: 400 }
      );
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `비밀번호는 ${MIN_PASSWORD_LEN}자 이상이어야 합니다.` },
        { status: 400 }
      );
    }

    const existing = await findByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }

    const email = usernameToEmail(username);
    const created = await getAdminAuth().createUser({
      email,
      password,
      displayName: displayName || username,
    });
    const user = await createUser(created.uid, username, {
      displayName,
      hospitalName,
      role: "user",
      status: "approved",
      approvedBy: result.username,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[api/admin/users POST] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `회원 생성에 실패했습니다: ${msg}` },
      { status: 500 }
    );
  }
}
