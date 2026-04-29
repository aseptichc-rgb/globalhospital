import { getDb } from "./firebase";
import type { AppUser, UserStatus } from "@/types/user";

const COLLECTION = "users";

function getAdminUsernames(): string[] {
  return (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
}

export function isWhitelistedAdmin(username: string | undefined | null): boolean {
  if (!username) return false;
  return getAdminUsernames().includes(username.toLowerCase());
}

export async function getUser(uid: string): Promise<AppUser | null> {
  try {
    const doc = await getDb().collection(COLLECTION).doc(uid).get();
    if (!doc.exists) return null;
    return { uid: doc.id, ...doc.data() } as AppUser;
  } catch (err) {
    console.error("[users.getUser] error:", err);
    throw err;
  }
}

export async function findByUsername(username: string): Promise<AppUser | null> {
  try {
    const snap = await getDb()
      .collection(COLLECTION)
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, ...d.data() } as AppUser;
  } catch (err) {
    console.error("[users.findByUsername] error:", err);
    throw err;
  }
}

export async function createUser(
  uid: string,
  username: string,
  data: {
    displayName?: string;
    hospitalName?: string;
    role?: "user" | "admin";
    status?: UserStatus;
    approvedBy?: string;
  }
): Promise<AppUser> {
  try {
    const now = new Date().toISOString();
    const isAdmin = data.role === "admin" || isWhitelistedAdmin(username);
    const status: UserStatus =
      data.status || (isAdmin ? "approved" : "approved");
    const user: Omit<AppUser, "uid"> = {
      username: username.toLowerCase(),
      displayName: data.displayName,
      hospitalName: data.hospitalName,
      status,
      role: isAdmin ? "admin" : "user",
      createdAt: now,
      updatedAt: now,
      approvedAt: status === "approved" ? now : undefined,
      approvedBy:
        status === "approved" ? data.approvedBy || "system" : undefined,
    };
    const clean = Object.fromEntries(
      Object.entries(user).filter(([, v]) => v !== undefined)
    );
    await getDb().collection(COLLECTION).doc(uid).set(clean);
    return { uid, ...user };
  } catch (err) {
    console.error("[users.createUser] error:", err);
    throw err;
  }
}

export async function listUsers(filter?: {
  status?: UserStatus;
}): Promise<AppUser[]> {
  try {
    let q: FirebaseFirestore.Query = getDb().collection(COLLECTION);
    if (filter?.status) q = q.where("status", "==", filter.status);
    const snap = await q.get();
    const rows = snap.docs.map(
      (d) => ({ uid: d.id, ...d.data() }) as AppUser
    );
    return rows.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  } catch (err) {
    console.error("[users.listUsers] error:", err);
    throw err;
  }
}

export async function setUserStatus(
  uid: string,
  status: UserStatus,
  approvedBy: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const update: Record<string, string> = {
      status,
      updatedAt: now,
    };
    if (status === "approved") {
      update.approvedAt = now;
      update.approvedBy = approvedBy;
    }
    await getDb().collection(COLLECTION).doc(uid).update(update);
  } catch (err) {
    console.error("[users.setUserStatus] error:", err);
    throw err;
  }
}

export async function ensureWhitelistedAdmin(
  uid: string,
  username: string
): Promise<void> {
  if (!isWhitelistedAdmin(username)) return;
  try {
    const ref = getDb().collection(COLLECTION).doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return;
    const data = doc.data() as Partial<AppUser>;
    if (data.role === "admin" && data.status === "approved") return;
    await ref.update({
      role: "admin",
      status: "approved",
      approvedAt: data.approvedAt || new Date().toISOString(),
      approvedBy: data.approvedBy || "system",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[users.ensureWhitelistedAdmin] error:", err);
  }
}
