import { NextResponse } from "next/server";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "@/lib/firebase";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

// Validation rules — kept here as named constants (no magic numbers)
const USERNAME_MIN = 4;
const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
// At least one letter and one digit
const PASSWORD_HAS_LETTER = /[A-Za-z]/;
const PASSWORD_HAS_DIGIT = /[0-9]/;

// scrypt params
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

const STAFF_COLLECTION = "hospitalStaff";

type SignupBody = {
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
};

function maskUsername(u: string): string {
  if (u.length <= 2) return "**";
  return `${u[0]}***${u[u.length - 1]}`;
}

function validate(body: SignupBody): { username: string; password: string; displayName: string } | string {
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `아이디는 ${USERNAME_MIN}~${USERNAME_MAX}자여야 합니다 · Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "아이디는 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다 · Username may only contain lowercase letters, digits, and underscore";
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다 · Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (!PASSWORD_HAS_LETTER.test(password) || !PASSWORD_HAS_DIGIT.test(password)) {
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다 · Password must contain both letters and digits";
  }
  if (displayName.length > 40) {
    return "이름은 40자 이내여야 합니다 · Name must be 40 characters or fewer";
  }
  return { username, password, displayName };
}

async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return { salt: salt.toString("hex"), hash: derived.toString("hex") };
}

// Exported for future verification if needed; uses constant-time compare.
export async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scryptAsync(password, salt, expected.length);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch (error) {
    console.error("verifyPassword error:", error);
    return false;
  }
}

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청입니다 · Invalid request body" },
      { status: 400 },
    );
  }

  const result = validate(body);
  if (typeof result === "string") {
    return NextResponse.json({ error: result }, { status: 400 });
  }
  const { username, password, displayName } = result;

  try {
    const db = getDb();
    const docRef = db.collection(STAFF_COLLECTION).doc(username);

    const { salt, hash } = await hashPassword(password);

    // Atomic create — fails if the username doc already exists.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists) {
        throw new Error("USERNAME_TAKEN");
      }
      tx.create(docRef, {
        username,
        displayName: displayName || null,
        passwordHash: hash,
        passwordSalt: salt,
        algo: "scrypt",
        createdAt: new Date().toISOString(),
      });
    });

    console.log("[hospital/signup] created:", maskUsername(username));
    return NextResponse.json({ ok: true, username }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다 · Username already taken" },
        { status: 409 },
      );
    }
    console.error("[hospital/signup] error:", error);
    return NextResponse.json(
      { error: "회원가입에 실패했습니다 · Signup failed" },
      { status: 500 },
    );
  }
}
