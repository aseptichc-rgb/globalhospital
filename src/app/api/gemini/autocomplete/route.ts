import { NextRequest, NextResponse } from "next/server";
import { geminiChatModel, recordGeminiUsage } from "@/lib/gemini";
import { requireApproved } from "@/lib/auth-server";

const MAX_SUGGESTIONS = 4;
const MAX_PREFIX_LENGTH = 200;

const SYSTEM_INSTRUCTION = `You are an autocomplete engine for a real-time medical interpretation app used between a Korean doctor and a non-Korean patient.

Given a partial utterance (prefix) and the speaker role, predict 3-4 natural completions of what the speaker is most likely to say next.

ABSOLUTE RULES:
1. Each suggestion MUST start with the EXACT given prefix, character-for-character. Do not paraphrase or alter the prefix.
2. Each suggestion is ONE complete, natural sentence appropriate for a clinical encounter.
3. Doctor suggestions are in Korean (한국어) and sound like a doctor speaking to a patient (clear, polite, clinical questions or instructions).
4. Patient suggestions are in the patient's language and sound like a patient describing symptoms, history, or answering the doctor.
5. Suggestions must be DISTINCT from each other (different clinical directions: onset, severity, location, associated symptoms, etc.).
6. Keep each suggestion short and conversational — typically under 20 words.
7. Return ONLY a JSON object: {"suggestions": ["...", "...", "..."]}. No code fences, no commentary.
8. If the prefix is empty, too short to be meaningful, or nonsensical, return {"suggestions": []}.`;

function buildPrompt(
  prefix: string,
  role: "doctor" | "patient",
  patientLang: string
): string {
  const speakerLang = role === "doctor" ? "Korean" : patientLang;
  const speakerDesc =
    role === "doctor"
      ? "the Korean doctor speaking to the patient"
      : `the patient (speaking ${patientLang}) responding to or describing symptoms to the doctor`;

  return `Speaker: ${speakerDesc}
Suggestion language: ${speakerLang}
Prefix (what the speaker has typed so far): "${prefix}"

Generate ${MAX_SUGGESTIONS} likely completions that each begin with the exact prefix above. Cover different clinical angles (timing, severity, location, associated symptoms, history, etc.) so the user has meaningful choices.

Return ONLY: {"suggestions": ["...", "...", "...", "..."]}`;
}

function safeParseSuggestions(raw: string, prefix: string): string[] {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || !Array.isArray(parsed.suggestions)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of parsed.suggestions) {
      if (typeof s !== "string") continue;
      const trimmed = s.trim();
      if (!trimmed) continue;
      // Enforce that each suggestion actually extends the user's prefix.
      // If the model dropped or altered the prefix, repair it by prepending.
      let final = trimmed;
      if (!trimmed.startsWith(prefix)) {
        if (prefix.trim() && trimmed.toLowerCase().startsWith(prefix.trim().toLowerCase())) {
          final = prefix + trimmed.slice(prefix.trim().length);
        } else {
          continue;
        }
      }
      if (seen.has(final)) continue;
      seen.add(final);
      out.push(final);
      if (out.length >= MAX_SUGGESTIONS) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApproved(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const prefixRaw = typeof body?.prefix === "string" ? body.prefix : "";
    const role = body?.role === "patient" ? "patient" : "doctor";
    const patientLang =
      typeof body?.patientLang === "string" && body.patientLang.trim()
        ? body.patientLang
        : "English";

    const prefix = prefixRaw.slice(0, MAX_PREFIX_LENGTH);

    if (!prefix.trim() || prefix.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const prompt = buildPrompt(prefix, role, patientLang);

    const result = await geminiChatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
    });

    await recordGeminiUsage({
      uid: auth.uid,
      username: auth.username,
      route: "/api/gemini/autocomplete",
      result,
    });

    const text = result.response.text();
    const suggestions = safeParseSuggestions(text, prefix);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
