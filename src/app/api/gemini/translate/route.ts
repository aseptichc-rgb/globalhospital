import { NextRequest, NextResponse } from "next/server";
import { geminiModel, recordGeminiUsage } from "@/lib/gemini";
import { TRANSLATE_SYSTEM, buildTranslatePrompt } from "@/lib/gemini-prompts";
import { requireApproved } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApproved(request);
    if (auth instanceof NextResponse) return auth;

    const { text, sourceLang, targetLang } = await request.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = buildTranslatePrompt(text, sourceLang, targetLang);

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { role: "system", parts: [{ text: TRANSLATE_SYSTEM }] },
    });

    await recordGeminiUsage({
      uid: auth.uid,
      username: auth.username,
      route: "/api/gemini/translate",
      result,
    });

    const translatedText = result.response.text().trim();

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
