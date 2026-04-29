import { getDb } from "./firebase";
import type { AppUser, UserStatus } from "@/types/user";

const COLLECTION = "users";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isWhitelistedAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
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

export async function createUser(
  uid: string,
  email: string,
  data: { displayName?: string; hospitalName?: string }
): Promise<AppUser> {
  try {
    const now = new Date().toISOString();
    const isAdmin = isWhitelistedAdmin(email);
    const user: Omit<AppUser, "uid"> = {
      email,
      displayName: data.displayName,
      hospitalName: data.hospitalName,
      status: isAdmin ? "approved" : "pending",
      role: isAdmin ? "admin" : "user",
      createdAt: now,
      updatedAt: now,
      approvedAt: isAdmin ? now : undefined,
      approvedBy: isAdmin ? "system" : undefined,
    };
    // Firestore rejects undefined fields; strip them.
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
  email: string
): Promise<void> {
  // If a whitelisted admin email signs in but their Firestore record is stale
  // (created before the whitelist, or status got out of sync), repair it.
  if (!isWhitelistedAdmin(email)) return;
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
