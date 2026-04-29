import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { STT_SYSTEM, buildSTTPrompt } from "@/lib/gemini-prompts";
import { requireApproved } from "@/lib/auth-server";
import { logUsage } from "@/lib/usage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sttModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.0,
    maxOutputTokens: 1024,
  },
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApproved(request);
    if (auth instanceof NextResponse) return auth;

    const { audio, mimeType, lang } = await request.json();

    if (!audio || !lang) {
      return NextResponse.json(
        { error: "Missing required fields: audio, lang" },
        { status: 400 }
      );
    }

    const audioBytes = Math.floor((audio.length * 3) / 4);
    console.log(
      `[STT] lang=${lang} mime=${mimeType} base64Len=${audio.length} ~bytes=${audioBytes}`
    );

    if (audioBytes < 1024) {
      return NextResponse.json({ transcript: "" });
    }

    // Gemini's officially supported audio mime types for inlineData are
    // wav/mp3/aiff/aac/ogg/flac. MediaRecorder in Chromium emits webm/opus.
    // Opus-in-webm and opus-in-ogg share the same codec payload, so we
    // relabel the container as audio/ogg when sending to Gemini — this is
    // the label Gemini accepts, and empirically the opus bitstream decodes.
    const rawMime = (mimeType || "audio/webm").split(";")[0];
    const geminiMime = rawMime.includes("webm") ? "audio/ogg" : rawMime;

    const prompt = buildSTTPrompt(lang);

    const result = await sttModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: geminiMime,
                data: audio,
              },
            },
          ],
        },
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: STT_SYSTEM }],
      },
    });

    await logUsage({
      uid: auth.uid,
      username: auth.username,
      route: "/api/gemini/speech-to-text",
      model: "gemini-2.5-flash",
      usage: result.response?.usageMetadata,
    });

    const transcript = result.response.text().trim();

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    const errObj = error as {
      message?: string;
      errorDetails?: unknown;
      status?: number;
      statusText?: string;
    };
    const errMsg = errObj?.message ?? String(error);
    console.error("[STT] error message:", errMsg);
    console.error(
      "[STT] full error keys:",
      error && typeof error === "object" ? Object.keys(error) : typeof error
    );
    try {
      console.error("[STT] error stringified:", JSON.stringify(error));
    } catch {
      // non-serializable
    }
    if (errObj?.errorDetails) {
      console.error(
        "[STT] errorDetails:",
        JSON.stringify(errObj.errorDetails, null, 2)
      );
    }
    if (errObj?.status) {
      console.error("[STT] status:", errObj.status, errObj.statusText);
    }
    return NextResponse.json(
      { error: `Speech-to-text failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
