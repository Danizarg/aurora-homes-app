/**
 * Suza's synthesised voice clips on the server, shared by the route that makes
 * them (app/api/suza/speak+api.ts) and the one that serves them as files
 * (app/api/suza/clip/[file]+api.ts). Server only: it uses the file system, so
 * nothing the app itself bundles may import it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Clip {
  wav: Uint8Array;
  durationMs: number;
  at: number;
}

const CACHE_MAX = 80;
const clips = new Map<string, Clip>();
// The dev server re-evaluates route modules per request and a hosted server may
// run several instances, so clips also go to disk, keyed by content hash.
const CACHE_DIR = join(tmpdir(), "zouza-suza-voice");

export async function remember(id: string, clip: Clip) {
  clips.set(id, clip);
  if (clips.size > CACHE_MAX) {
    const oldest = [...clips.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) clips.delete(oldest[0]);
  }
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${id}.wav`), clip.wav);
  } catch (e) {
    console.warn("[suza/speak] could not cache clip on disk", e);
  }
}

export async function recall(id: string): Promise<Clip | null> {
  const inMemory = clips.get(id);
  if (inMemory) return inMemory;
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  try {
    const wav = new Uint8Array(await readFile(join(CACHE_DIR, `${id}.wav`)));
    const clip: Clip = { wav, durationMs: 0, at: Date.now() };
    clips.set(id, clip);
    return clip;
  } catch {
    return null;
  }
}

/** The clip as a stereo 16-bit WAV response, answering byte-range requests too. */
export function serveClip(request: Request, clip: Clip): Response {
  clip.at = Date.now();
  const total = clip.wav.byteLength;
  const common = { "content-type": "audio/wav", "cache-control": "private, max-age=3600", "accept-ranges": "bytes" };
  // Native players (AVPlayer in particular) fetch media with byte ranges; answer them properly.
  const range = request.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { ...common, "content-range": `bytes */${total}` } });
    const part = clip.wav.subarray(start, end + 1);
    return new Response(part as unknown as BodyInit, {
      status: 206,
      headers: { ...common, "content-length": String(part.byteLength), "content-range": `bytes ${start}-${end}/${total}` },
    });
  }
  return new Response(clip.wav as unknown as BodyInit, { status: 200, headers: { ...common, "content-length": String(total) } });
}
