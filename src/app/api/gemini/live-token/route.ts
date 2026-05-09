import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildLiveInterpretationSystem } from "@/lib/gemini-prompts";
import { requireApproved } from "@/lib/auth-server";
import { logUsage } from "@/lib/usage";

// Both `gemini-live-2.5-flash-preview` and `gemini-2.0-flash-live-001`
// are rejected on the v1alpha endpoint that ephemeral tokens require —
// the server only serves the native-audio dialog model there.
const CLIENT_MODEL = "gemini-2.5-flash-preview-native-audio-dialog";

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

    const systemInstruction = buildLiveInterpretationSystem(
      sourceLang,
      targetLang
    );

    const now = Date.now();
    // Ephemeral tokens hit the BidiGenerateContentConstrained endpoint,
    // which requires the model and Live config to be locked into the
    // token at creation time. Without `liveConnectConstraints`, the
    // server has nothing to bind to and closes the WS with code 1006.
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
        liveConnectConstraints: {
          model: CLIENT_MODEL,
          config: {
            responseModalities: [Modality.TEXT],
            systemInstruction,
            inputAudioTranscription: {},
          },
        },
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
      systemInstruction,
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
