import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import {
  DYNAMIC_FOLLOWUP_SYSTEM,
  buildDynamicFollowUpPrompt,
  FollowUpQAContext,
} from "@/lib/gemini-prompts";

export async function POST(request: NextRequest) {
  try {
    const {
      chiefComplaint,
      chiefComplaintKorean,
      targetLang,
      previousQA,
      questionNumber,
      totalQuestions,
    } = await request.json();

    if (!chiefComplaint || !targetLang || !questionNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = buildDynamicFollowUpPrompt(
      chiefComplaint,
      chiefComplaintKorean || chiefComplaint,
      targetLang,
      (previousQA || []) as FollowUpQAContext[],
      questionNumber,
      totalQuestions || 5
    );

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: DYNAMIC_FOLLOWUP_SYSTEM }],
      },
    });

    const responseText = result.response.text().trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse question" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const question: string = parsed.question || "";
    const questionKorean: string = parsed.questionKorean || "";

    return NextResponse.json({ question, questionKorean });
  } catch (error) {
    console.error("Dynamic follow-up generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up question" },
      { status: 500 }
    );
  }
}
