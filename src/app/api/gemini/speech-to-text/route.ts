import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { STT_SYSTEM, buildSTTPrompt } from "@/lib/gemini-prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sttModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.0,
    maxOutputTokens: 1024,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { audio, mimeType, lang } = await request.json();

    if (!audio || !lang) {
      return NextResponse.json(
        { error: "Missing required fields: audio, lang" },
        { status: 400 }
      );
    }

    const prompt = buildSTTPrompt(lang);

    const result = await sttModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: audio,
              },
            },
            { text: prompt },
          ],
        },
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: STT_SYSTEM }],
      },
    });

    const transcript = result.response.text().trim();

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Speech-to-text error:", errMsg);
    return NextResponse.json(
      { error: `Speech-to-text failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
