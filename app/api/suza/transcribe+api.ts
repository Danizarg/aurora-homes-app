/**
 * POST /api/suza/transcribe — speech-to-text for the iOS/Android app.
 *
 * The phone records a short clip with expo-audio and posts it here as
 * multipart/form-data (`audio`, `language`). This route forwards it to an
 * OpenAI-compatible transcription endpoint (OpenAI by default; anything that
 * speaks the same API works) using a key that only exists on the server:
 *
 *   SUZA_STT_API_KEY   (falls back to OPENAI_API_KEY)
 *   SUZA_STT_URL       default https://api.openai.com/v1/audio/transcriptions
 *   SUZA_STT_MODEL     default gpt-4o-mini-transcribe
 *
 * GET returns { ok } so the app can tell whether voice input is configured
 * instead of guessing. Nothing is stored; the clip is forwarded and dropped.
 */
const STT_URL = process.env.SUZA_STT_URL || "https://api.openai.com/v1/audio/transcriptions";
const STT_MODEL = process.env.SUZA_STT_MODEL || "gpt-4o-mini-transcribe";
const MAX_BYTES = 8 * 1024 * 1024;

function key() {
  return process.env.SUZA_STT_API_KEY || process.env.OPENAI_API_KEY || "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export function GET() {
  return json({ ok: key().length > 0, provider: new URL(STT_URL).host, model: STT_MODEL });
}

export async function POST(request: Request) {
  const apiKey = key();
  if (!apiKey) return json({ error: "Transcription isn't configured on this server (set SUZA_STT_API_KEY or OPENAI_API_KEY)." }, 503);

  // Typed loosely: this file runs in Node, but the project's TS globals are React Native's.
  let form: { get(name: string): unknown };
  try {
    form = (await request.formData()) as unknown as { get(name: string): unknown };
  } catch {
    return json({ error: "Expected multipart/form-data with an `audio` file." }, 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return json({ error: "Missing `audio` file." }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "Clip too long." }, 413);
  const language = typeof form.get("language") === "string" ? String(form.get("language")).slice(0, 8) : undefined;

  const upstream = new FormData() as unknown as { append(name: string, value: unknown, filename?: string): void };
  const name = (audio as File).name || "speech.m4a";
  upstream.append("file", audio, name);
  upstream.append("model", STT_MODEL);
  upstream.append("response_format", "json");
  if (language) upstream.append("language", language);
  // Real-estate vocabulary the recogniser would otherwise mangle.
  upstream.append("prompt", "Zouza, Suza, Marbella, Puerto Banús, Málaga, Estepona, Sevilla, Valencia, apartment, villa, townhouse, bedrooms, pool, sea view.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(STT_URL, { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: upstream as unknown as BodyInit, signal: controller.signal });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[suza/transcribe] upstream", res.status, detail.slice(0, 300));
      return json({ error: `Transcription service error (${res.status}).` }, 502);
    }
    const data = (await res.json()) as { text?: string };
    return json({ text: (data.text ?? "").trim() });
  } catch (e) {
    console.warn("[suza/transcribe] failed", e);
    return json({ error: "Transcription timed out." }, 504);
  } finally {
    clearTimeout(timer);
  }
}
