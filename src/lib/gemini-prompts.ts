export const TRANSLATE_SYSTEM = `You are a professional medical translator working in a Korean hospital.
Translate medical text accurately, preserving medical terminology.
Return ONLY the translated text without any explanations, notes, or formatting.`;

export const FOLLOWUP_SYSTEM = `You are an experienced triage nurse at a Korean hospital.
Generate clinically relevant follow-up questions based on a patient's chief complaint.
Questions should help the doctor understand onset, severity, associated symptoms,
aggravating/relieving factors, and relevant medical history.`;

export const CHAT_TRANSLATE_SYSTEM = `You are a real-time medical interpreter in a Korean hospital.
Translate spoken dialogue naturally while preserving medical accuracy.
Keep the conversational tone. Return ONLY the translated text.`;

export function buildTranslatePrompt(
  text: string,
  from: string,
  to: string
): string {
  return `Translate the following from ${from} to ${to}:\n\n${text}`;
}

export function buildFollowUpPrompt(
  complaint: string,
  complaintKr: string,
  targetLang: string
): string {
  return `Chief complaint (Korean): ${complaintKr}
Chief complaint (original): ${complaint}

Generate exactly 5 follow-up questions in both ${targetLang} and Korean.
The questions should cover:
1. When did the symptoms start and how long have they lasted?
2. How severe is the symptom? (pain scale, frequency, etc.)
3. Are there any associated symptoms?
4. What makes it better or worse?
5. Any relevant past medical conditions related to this symptom?

Return ONLY a JSON array of exactly 5 objects, each with "original" (in ${targetLang}) and "korean" (in Korean) fields. No other text.
Example format: [{"original":"question in ${targetLang}","korean":"질문 한국어"},{"original":"question2","korean":"질문2"},{"original":"question3","korean":"질문3"},{"original":"question4","korean":"질문4"},{"original":"question5","korean":"질문5"}]`;
}

export const STT_SYSTEM = `You are a medical speech-to-text transcription specialist at a Korean hospital.
Transcribe the audio accurately, paying special attention to medical terminology.
Return ONLY the transcribed text without any explanations, notes, or formatting.
If the audio is unclear or silent, return an empty string.`;

export function buildSTTPrompt(lang: string): string {
  return `Transcribe the following audio in ${lang}.
Focus on medical terminology accuracy. Return ONLY the transcribed text.`;
}

export function buildMedicalTranslatePrompt(
  text: string,
  direction: "toKorean" | "fromKorean",
  patientLang: string
): string {
  if (direction === "toKorean") {
    return `Translate the following ${patientLang} medical dialogue to Korean:\n\n${text}`;
  }
  return `Translate the following Korean medical dialogue to ${patientLang}:\n\n${text}`;
}
