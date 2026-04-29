import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";

// TEMPORARY diagnostic endpoint — DELETE after debugging.
// Reveals which Firebase project the server is talking to and surfaces
// init/permission errors that bootstrap is failing on.
export async function GET() {
  const envProjectId = process.env.FIREBASE_PROJECT_ID || "(unset)";
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL || "(unset)";
  const clientEmailProject =
    envClientEmail.match(/@([^.]+)\.iam/)?.[1] || "(unparseable)";
  const privateKeyLooksValid = !!process.env.FIREBASE_PRIVATE_KEY?.includes(
    "BEGIN PRIVATE KEY"
  );
  const adminUsernames = process.env.ADMIN_USERNAMES || "(unset)";

  let adminInit: string;
  let listUsersTest: string;
  try {
    const auth = getAdminAuth();
    adminInit = "OK";
    try {
      const list = await auth.listUsers(1);
      listUsersTest = `OK (found ${list.users.length} user)`;
    } catch (err) {
      listUsersTest =
        "FAIL: " + (err instanceof Error ? err.message : String(err));
    }
  } catch (err) {
    adminInit = "FAIL: " + (err instanceof Error ? err.message : String(err));
    listUsersTest = "skipped";
  }

  return NextResponse.json({
    envProjectId,
    envClientEmail_projectPortion: clientEmailProject,
    envClientEmail_full: envClientEmail.replace(
      /@[^.]+\.iam/,
      `@${clientEmailProject}.iam`
    ),
    privateKeyLooksValid,
    adminUsernames,
    adminInit,
    listUsersTest,
  });
}
