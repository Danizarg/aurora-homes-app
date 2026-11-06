/**
 * GET /api/suza/clip/<id>.wav — a clip made by /api/suza/speak, at an address
 * that ends in ".wav".
 *
 * Phones need that ending. expo-audio downloads a clip before playing it and
 * names the file after the address's extension; with none (the old
 * `/api/suza/speak?id=…`) it guesses ".mp3". iOS then can't open what is really
 * a WAV, the clip never starts, and the app falls back to the phone's own voice
 * for the rest of the session.
 */
import { recall, serveClip } from "../../../../lib/suza/clipStore";

export async function GET(request: Request, { file }: Record<string, string>) {
  const id = (file ?? "").replace(/\.wav$/i, "");
  const clip = await recall(id);
  if (!clip) {
    console.warn(`[suza/speak] clip ${id} requested but not in the cache`);
    return new Response(JSON.stringify({ error: "Unknown clip; synthesise it again." }), {
      status: 404,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  // One line per fetch in the dev server's terminal, so "did the phone get the
  // clip?" is answered by looking, not by guessing.
  console.log(`[suza/speak] clip ${id} sent (${Math.round(clip.wav.byteLength / 1024)} KB${request.headers.get("range") ? ", ranged" : ""})`);
  return serveClip(request, clip);
}
