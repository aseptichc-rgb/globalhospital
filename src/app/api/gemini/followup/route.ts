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

    // Parse JSON object with questions and questionsKorean
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: try parsing as array (old format)
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        return NextResponse.json(
          { error: "Failed to parse questions" },
          { status: 500 }
        );
      }
      const questions: string[] = JSON.parse(arrayMatch[0]);
      return NextResponse.json({ questions: questions.slice(0, 5), questionsKorean: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions: string[] = (parsed.questions || []).slice(0, 5);
    const questionsKorean: string[] = (parsed.questionsKorean || []).slice(0, 5);

    return NextResponse.json({ questions, questionsKorean });
  } catch (error) {
    console.error("Follow-up generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions" },
      { status: 500 }
    );
  }
}
