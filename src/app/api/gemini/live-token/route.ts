import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildLiveInterpretationSystem } from "@/lib/gemini-prompts";

const CLIENT_MODEL = "gemini-live-2.5-flash-preview";

export async function POST(request: NextRequest) {
  try {
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
