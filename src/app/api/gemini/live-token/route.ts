import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildLiveInterpretationSystem } from "@/lib/gemini-prompts";
import { requireApproved } from "@/lib/auth-server";
import { logUsage } from "@/lib/usage";

// v1alpha + ephemeral tokens only serve the model Google's official
// docs use in their ephemeral-token examples. The 2.0/2.5 Live preview
// model IDs we tried previously all return 1008 ("not found for API
// version v1main, or is not supported for bidiGenerateContent") on this
// endpoint. See https://ai.google.dev/gemini-api/docs/ephemeral-tokens.
const CLIENT_MODEL = "gemini-3.1-flash-live-preview";

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
            // gemini-3.1-flash-live-preview is an audio-audio model: it
            // closes with code 1011 if you ask for `[Modality.TEXT]`.
            // Take its audio output (we ignore the audio stream itself
            // on the client) and turn on outputAudioTranscription so the
            // model also emits a text transcription of what it's saying,
            // which is what we render word-by-word in the live bubble.
            responseModalities: [Modality.AUDIO],
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
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
