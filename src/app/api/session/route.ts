import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const sessionId = await createSession({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      languageCode: data.languageCode,
      languageName: data.languageName,
      status: "in-progress",
      formData: data.formData,
      followUpQA: data.followUpQA || [],
      chatMessages: data.chatMessages || [],
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
