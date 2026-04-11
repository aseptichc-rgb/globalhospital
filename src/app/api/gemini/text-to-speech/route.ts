import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
// Kore is one of Gemini TTS's multilingual prebuilt voices — the same voice
// handles every language we support, so we don't need a per-language map.
const VOICE = "Kore";

function wavHeader(
  dataLength: number,
  sampleRate: number,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

export async function POST(request: NextRequest) {
  try {
    const { text, lang } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    console.log(`[TTS] lang=${lang} chars=${text.length}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;

    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE },
          },
        },
      },
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[TTS] upstream error:", upstream.status, errText);
      return NextResponse.json(
        { error: `TTS API error: ${upstream.status}` },
        { status: 500 }
      );
    }

    const data = await upstream.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const b64: string | undefined = part?.inlineData?.data;
    const mime: string = part?.inlineData?.mimeType ?? "";

    if (!b64) {
      console.error(
        "[TTS] no audio in response:",
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: "No audio in response" },
        { status: 500 }
      );
    }

    // Gemini returns raw 16-bit PCM. The mimeType looks like
    // "audio/L16;codec=pcm;rate=24000" — parse the sample rate so we can
    // build a matching WAV header (browsers won't play raw PCM directly).
    const rateMatch = mime.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    const pcm = Buffer.from(b64, "base64");
    const header = wavHeader(pcm.length, sampleRate);
    const wav = Buffer.concat([header, pcm]);

    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wav.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TTS] error:", msg);
    return NextResponse.json(
      { error: `Text-to-speech failed: ${msg}` },
      { status: 500 }
    );
  }
}
