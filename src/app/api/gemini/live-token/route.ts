import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildLiveInterpretationSystem } from "@/lib/gemini-prompts";
import { requireApproved } from "@/lib/auth-server";
import { logUsage } from "@/lib/usage";

const CLIENT_MODEL = "gemini-live-2.5-flash-preview";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApproved(request);
    if (auth instanceof NextResponse) return auth;

    const { sourceLang, targetLang } = await request.json();

    if (!sourceLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing sourceLang or targetLang" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    // Live API streams tokens directly to the client, so we can't measure
    // per-call token counts here. Log the issuance event itself for visibility.
    await logUsage({
      uid: auth.uid,
      username: auth.username,
      route: "/api/gemini/live-token",
      model: CLIENT_MODEL,
      usage: undefined,
    });

    return NextResponse.json({
      token: token.name,
      model: CLIENT_MODEL,
      systemInstruction: buildLiveInterpretationSystem(sourceLang, targetLang),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("live-token error:", msg);
    return NextResponse.json(
      { error: `Failed to issue live token: ${msg}` },
      { status: 500 }
    );
  }
}
