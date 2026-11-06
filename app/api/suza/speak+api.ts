/**
 * /api/suza/speak — Suza's neural voice.
 *
 * POST { text }  → synthesises the line with an OpenAI-compatible text-to-speech
 *                  endpoint, then shapes it on the server: its S and Z sounds
 *                  softened, then a soft, slightly
 *                  echoing, room-around-her delivery (early reflections, a
 *                  low-passed feedback echo and a stereo spread) so it sounds
 *                  like a calm presence in a space rather than a flat phone
 *                  voice. The result is cached by content hash and the
 *                  response is { id, durationMs }.
 * GET ?id=…      → streams that cached clip as a stereo 16-bit WAV, so the
 *                  app's audio player can load it by URL.
 * GET            → { ok } health, like the other Suza routes.
 *
 * Server env (never bundled): SUZA_TTS_API_KEY or SUZA_STT_API_KEY or
 * OPENAI_API_KEY; optional SUZA_TTS_URL, SUZA_TTS_MODEL, SUZA_TTS_VOICE,
 * SUZA_TTS_INSTRUCTIONS.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TTS_URL = process.env.SUZA_TTS_URL || "https://api.openai.com/v1/audio/speech";
const TTS_MODEL = process.env.SUZA_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.SUZA_TTS_VOICE || "sage";
const TTS_INSTRUCTIONS =
  process.env.SUZA_TTS_INSTRUCTIONS ||
  "You are Suza, a calm, composed AI companion with the poise of a classic film computer assistant. Speak softly and unhurriedly, warm and intimate, slightly breathy, with gentle wonder, as if from a quiet, spacious room. Never bright, chirpy or salesy. Natural human phrasing, light British poise.";
const MAX_CHARS = 600;
const CACHE_MAX = 80;
/** Bump when `shape` changes so cached clips are re-rendered. */
const SHAPE_VERSION = 4;

function key() {
  return process.env.SUZA_TTS_API_KEY || process.env.SUZA_STT_API_KEY || process.env.OPENAI_API_KEY || "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

// ---------------------------------------------------------------- cache

interface Clip {
  wav: Uint8Array;
  durationMs: number;
  at: number;
}
const clips = new Map<string, Clip>();
const pending = new Map<string, Promise<Clip>>();
// The dev server re-evaluates this module per request and a hosted server may
// run several instances, so clips also go to disk, keyed by content hash.
const CACHE_DIR = join(tmpdir(), "zouza-suza-voice");

async function remember(id: string, clip: Clip) {
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

async function recall(id: string): Promise<Clip | null> {
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

// ---------------------------------------------------------------- WAV

/** Reads a 16-bit PCM WAV into mono float samples. */
function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 44 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "RIFF") throw new Error("not a wav");
  let offset = 12;
  let sampleRate = 24000;
  let channels = 1;
  let bits = 16;
  let data: { start: number; length: number } | null = null;
  while (offset + 8 <= bytes.length) {
    const tag = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    if (tag === "fmt ") {
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
    } else if (tag === "data") {
      data = { start: offset + 8, length: Math.min(size, bytes.length - offset - 8) };
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) throw new Error("unsupported wav");
  const frames = Math.floor(data.length / 2 / channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += view.getInt16(data.start + (i * channels + c) * 2, true) / 32768;
    samples[i] = sum / channels;
  }
  return { samples, sampleRate };
}

/** Writes stereo float samples as a 16-bit PCM WAV. */
function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const frames = left.length;
  const out = new Uint8Array(44 + frames * 4);
  const view = new DataView(out.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, "RIFF"); view.setUint32(4, 36 + frames * 4, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, frames * 4, true);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    view.setInt16(o, Math.max(-1, Math.min(1, left[i])) * 32767, true);
    view.setInt16(o + 2, Math.max(-1, Math.min(1, right[i])) * 32767, true);
    o += 4;
  }
  return out;
}

// ---------------------------------------------------------------- the voice

/** A second-order Butterworth low- or high-pass, run over a whole buffer. */
function biquad(input: Float32Array, sr: number, type: "lp" | "hp", freq: number): Float32Array {
  const w = (2 * Math.PI * freq) / sr;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / Math.SQRT2;
  const b0 = type === "lp" ? (1 - cos) / 2 : (1 + cos) / 2;
  const b1 = type === "lp" ? 1 - cos : -(1 + cos);
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

/**
 * The same filter run forwards and then backwards over the clip: twice as
 * steep, and with no phase shift. That matters when the band it splits off is
 * subtracted from the voice. A one-way high-pass is shifted against the voice
 * near its cutoff, so subtracting it barely cancels there: at full strength
 * it took about 4 dB off the hiss band, however hard it was pushed.
 */
function zeroPhase(input: Float32Array, sr: number, type: "lp" | "hp", freq: number): Float32Array {
  return biquad(biquad(input, sr, type, freq).reverse(), sr, type, freq).reverse();
}

/**
 * A clip's vowel level: the median RMS of its voiced 10 ms frames, where the
 * body of the voice (100 Hz–3.5 kHz) clearly outweighs the hiss band. 0 when
 * there is too little voiced speech to tell.
 */
function vowelLevel(x: Float32Array, sr: number): number {
  const body = biquad(biquad(x, sr, "hp", 100), sr, "lp", 3500);
  const hiss = biquad(x, sr, "hp", 4500);
  const frame = Math.round(sr * 0.01);
  const levels: number[] = [];
  for (let s = 0; s + frame <= x.length; s += frame) {
    let b = 0, h = 0;
    for (let i = s; i < s + frame; i++) { b += body[i] * body[i]; h += hiss[i] * hiss[i]; }
    const rms = Math.sqrt(b / frame);
    if (rms > 0.0056 && b > 16 * h) levels.push(rms); // above -45 dBFS, hiss 12 dB down
  }
  if (levels.length < 5) return 0;
  levels.sort((a, b) => a - b);
  return levels[Math.floor(levels.length / 2)];
}

/**
 * Soften her S and Z sounds. The model's own voice puts them well above her
 * vowels (measured on the dry output: the 4.5 kHz-and-up band ran 3–6 dB over
 * the vowel level in the middle of an "s" and 10–11 dB over it at the
 * loudest), and a phone speaker is brightest right there, so they sizzle.
 * Rewording the voice instructions made no measurable difference. This turns
 * down only that band, and only while it is louder than this clip's own
 * vowels, so vowels keep their air.
 */
function deEss(voice: Float32Array, sr: number): Float32Array {
  const ms = (x: number) => Math.round((sr * x) / 1000);
  // The hiss band may come up to her vowel level before it is turned down.
  const threshold = vowelLevel(voice, sr);
  if (!threshold) return voice;
  const hiss = zeroPhase(voice, sr, "hp", 4500);

  // Follow the hiss band and work out how far to turn it down: 3:1 above the
  // vowel level, never by more than 10 dB, or the S starts to sound lisped.
  // The 25 ms release lets the vowel after an S get its air back; 40 ms
  // dulled it measurably, and anything faster let S sounds back in.
  const attack = 1 - Math.exp(-1 / (sr * 0.001));
  const release = 1 - Math.exp(-1 / (sr * 0.025));
  const ratio = 3;
  const floor = Math.pow(10, -10 / 20);
  const gain = new Float32Array(voice.length);
  let power = 0;
  for (let i = 0; i < voice.length; i++) {
    const p = hiss[i] * hiss[i];
    power += (p - power) * (p > power ? attack : release);
    const env = Math.sqrt(power);
    gain[i] = env > threshold ? Math.max(floor, Math.pow(threshold / env, 1 - 1 / ratio)) : 1;
  }

  // The whole clip is here, so look 2 ms ahead: the turn-down is already in
  // place when an S starts, instead of catching up after its sharpest edge.
  const ahead = ms(2);
  const out = new Float32Array(voice.length);
  for (let i = 0; i < voice.length; i++) {
    let g = gain[i];
    for (let j = 1; j <= ahead && i + j < voice.length; j++) g = Math.min(g, gain[i + j]);
    out[i] = voice[i] - (1 - g) * hiss[i];
  }
  return out;
}

// ---------------------------------------------------------------- the room

/**
 * Soft, echoing, spatial: a few early reflections spread left/right, a
 * low-passed feedback echo for the tail, a short Haas offset between the
 * ears for width, and the dry voice kept clearly in front of it all. It all
 * starts from the de-essed voice, so no echo carries a sharper S than the voice.
 */
function shape(raw: Float32Array, sr: number): { left: Float32Array; right: Float32Array } {
  const mono = deEss(raw, sr);
  // Room for the echo to die in. It is working space, not the length of the
  // clip: whatever is left unused gets trimmed off the end before returning.
  const tailMs = 900;
  const n = mono.length + Math.round((sr * tailMs) / 1000);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const ms = (x: number) => Math.round((sr * x) / 1000);

  // Dry voice dead centre and identical in both ears: a phone's single speaker
  // sums the channels, and any offset here would comb-filter her voice there.
  // The space comes from the reflections and the tail, which are spread.
  for (let i = 0; i < mono.length; i++) {
    left[i] += mono[i] * 0.86;
    right[i] += mono[i] * 0.86;
  }

  // Early reflections: alternate sides, decaying, slightly dulled.
  const taps: [number, number, "L" | "R"][] = [[17, 0.20, "L"], [26, 0.17, "R"], [38, 0.14, "R"], [51, 0.12, "L"], [67, 0.09, "R"], [84, 0.07, "L"]];
  for (const [delayMs, gain, side] of taps) {
    const d = ms(delayMs);
    const dst = side === "L" ? left : right;
    let lp = 0;
    for (let i = 0; i < mono.length; i++) {
      lp += (mono[i] - lp) * 0.55; // gentle low-pass on the reflection
      dst[i + d] += lp * gain;
    }
  }

  // Feedback echo for the tail: 118 ms, each repeat softer and darker.
  const echoDelay = ms(118);
  const feedback = 0.34;
  const wet = 0.30;
  const buf = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const inp = i < mono.length ? mono[i] : 0;
    const back = i >= echoDelay ? buf[i - echoDelay] : 0;
    lp += (inp + back * feedback - lp) * 0.32; // ~2.2 kHz one-pole: the tail stays soft
    buf[i] = lp;
    // Spread the tail: slightly earlier on the left, later on the right.
    left[i] += buf[i] * wet * 0.9;
    if (i + ms(7) < n) right[i + ms(7)] += buf[i] * wet;
  }

  // Set her loudness from her vowels, not from her loudest instant. Normalising
  // to the peak let the sharpest S in each line decide how loud the whole line
  // was: S-heavy lines came out up to 7 dB quieter than the rest, and with the
  // S sounds tamed most lines would have jumped several dB louder than the
  // voice people know. -25 dBFS is where her vowels sat in the lines measured
  // before this change; the old -1.5 dBFS peak ceiling still applies.
  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = (left[i] + right[i]) / 2;
  const vowels = vowelLevel(mix, sr);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const byPeak = peak > 0 ? 0.84 / peak : 1;
  const g = vowels > 0 ? Math.min(Math.pow(10, -25 / 20) / vowels, byPeak) : byPeak;
  for (let i = 0; i < n; i++) { left[i] *= g; right[i] *= g; }

  // Cut the dead air off the end. The echo is inaudible long before the 900 ms
  // it is given, and the model leaves its own quiet after the last word on top
  // of that; together they ran to more than a second. The player has to play all
  // of it before it reports the line finished, and Suza leads the flow by voice,
  // so every one of those seconds is a pause between her steps.
  const floor = 0.0015; // about -56 dBFS: below anything a phone speaker renders
  let last = n - 1;
  while (last > 0 && Math.abs(left[last]) < floor && Math.abs(right[last]) < floor) last--;
  const end = Math.min(n, last + ms(60));
  // Ramp the final few milliseconds down, or the cut itself clicks.
  const fade = Math.min(ms(25), end);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    left[end - 1 - i] *= k;
    right[end - 1 - i] *= k;
  }
  return { left: left.subarray(0, end), right: right.subarray(0, end) };
}

// ---------------------------------------------------------------- synthesis

async function synthesise(text: string): Promise<Clip> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: text, instructions: TTS_INSTRUCTIONS, response_format: "wav", speed: 0.95 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`tts ${res.status} ${detail.slice(0, 200)}`);
    }
    const raw = new Uint8Array(await res.arrayBuffer());
    const { samples, sampleRate } = decodeWav(raw);
    const { left, right } = shape(samples, sampleRate);
    const wav = encodeWav(left, right, sampleRate);
    return { wav, durationMs: Math.round((left.length / sampleRate) * 1000), at: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ ok: key().length > 0, provider: new URL(TTS_URL).host, model: TTS_MODEL, voice: TTS_VOICE });
  const clip = await recall(id);
  if (!clip) return json({ error: "Unknown clip; synthesise it again." }, 404);
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

export async function POST(request: Request) {
  if (!key()) return json({ error: "Suza's voice isn't configured on this server (set SUZA_TTS_API_KEY or OPENAI_API_KEY)." }, 503);
  let body: { text?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON { text }." }, 400);
  }
  const text = (body.text ?? "").toString().replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!text) return json({ error: "Nothing to say." }, 400);
  const id = createHash("sha1").update(`${SHAPE_VERSION}|${TTS_MODEL}|${TTS_VOICE}|${TTS_INSTRUCTIONS}|${text}`).digest("hex").slice(0, 24);
  const cached = await recall(id);
  if (cached) {
    cached.at = Date.now();
    return json({ id, durationMs: cached.durationMs, cached: true });
  }
  try {
    let job = pending.get(id);
    if (!job) {
      job = synthesise(text);
      pending.set(id, job);
      job.finally(() => pending.delete(id));
    }
    const clip = await job;
    await remember(id, clip);
    return json({ id, durationMs: clip.durationMs });
  } catch (e) {
    console.warn("[suza/speak] failed", e);
    return json({ error: "Voice synthesis failed." }, 502);
  }
}
