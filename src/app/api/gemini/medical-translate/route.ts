import { NextRequest, NextResponse } from "next/server";
import { geminiChatModel } from "@/lib/gemini";
import {
  CHAT_TRANSLATE_SYSTEM,
  buildMedicalTranslatePrompt,
} from "@/lib/gemini-prompts";

export async function POST(request: NextRequest) {
  try {
    const { text, direction, patientLang } = await request.json();

    if (!text || !direction || !patientLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = buildMedicalTranslatePrompt(text, direction, patientLang);

    const result = await geminiChatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: CHAT_TRANSLATE_SYSTEM }],
      },
    });

    const translatedText = result.response.text().trim();

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Medical translation error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Translation failed: ${msg}` },
      { status: 500 }
    );
  }
}
