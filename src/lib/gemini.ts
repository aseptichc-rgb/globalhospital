import { GoogleGenerativeAI, type GenerateContentResult } from "@google/generative-ai";
import { logUsage } from "./usage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

export const geminiModel = genAI.getGenerativeModel({
  model: GEMINI_DEFAULT_MODEL,
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 1024,
  },
});

export const geminiChatModel = genAI.getGenerativeModel({
  model: GEMINI_DEFAULT_MODEL,
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 256,
  },
});

export async function recordGeminiUsage(args: {
  uid: string;
  username: string;
  route: string;
  model?: string;
  result: GenerateContentResult;
}): Promise<void> {
  const usage = args.result.response?.usageMetadata;
  await logUsage({
    uid: args.uid,
    username: args.username,
    route: args.route,
    model: args.model || GEMINI_DEFAULT_MODEL,
    usage,
  });
}
