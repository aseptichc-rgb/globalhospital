import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { FOLLOWUP_SYSTEM, buildFollowUpPrompt } from "@/lib/gemini-prompts";

export async function POST(request: NextRequest) {
  try {
    const { chiefComplaint, chiefComplaintKorean, targetLang } =
      await request.json();

    if (!chiefComplaint || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = buildFollowUpPrompt(
      chiefComplaint,
      chiefComplaintKorean || chiefComplaint,
      targetLang
    );

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { role: "system", parts: [{ text: FOLLOWUP_SYSTEM }] },
    });

    const responseText = result.response.text().trim();

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse questions" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const items = parsed.slice(0, 5);

    // Support both bilingual objects and plain strings (fallback)
    if (items.length > 0 && typeof items[0] === "object" && items[0].original) {
      const questions = items.map((q: { original: string }) => q.original);
      const questionsKorean = items.map((q: { korean: string }) => q.korean || "");
      return NextResponse.json({ questions, questionsKorean });
    }

    const questions: string[] = items;
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Follow-up generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions" },
      { status: 500 }
    );
  }
}
