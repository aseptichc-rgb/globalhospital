import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAdminAuth, getDb } from "@/lib/firebase";
import { getUser, setUserStatus } from "@/lib/users";

const MIN_PASSWORD_LEN = 6;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const { uid } = await params;
    const body = await request.json().catch(() => ({}));

    if (typeof body?.password === "string") {
      if (body.password.length < MIN_PASSWORD_LEN) {
        return NextResponse.json(
          { error: `비밀번호는 ${MIN_PASSWORD_LEN}자 이상이어야 합니다.` },
          { status: 400 }
        );
      }
      await getAdminAuth().updateUser(uid, { password: body.password });
      return NextResponse.json({ ok: true });
    }

    const status = body?.status;
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await setUserStatus(uid, status, result.username);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users/:uid PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const { uid } = await params;
    if (uid === result.uid) {
      return NextResponse.json(
        { error: "본인 계정은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    const target = await getUser(uid);
    if (target?.role === "admin") {
      return NextResponse.json(
        { error: "다른 관리자 계정은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    await getAdminAuth()
      .deleteUser(uid)
      .catch((err) => {
        // If the Firebase Auth user is already gone, continue with Firestore cleanup.
        console.warn("[api/admin/users/:uid DELETE] auth.deleteUser:", err);
      });
    await getDb().collection("users").doc(uid).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users/:uid DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
