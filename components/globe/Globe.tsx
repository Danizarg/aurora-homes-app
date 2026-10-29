import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Asset } from "expo-asset";
import { buildSphere, buildStars, rotationFor } from "../../lib/globe/geometry";
import { angleDelta, easeInOutCubic, easeOutCubic, lookAt, multiply, perspective, rotationX, rotationY, scale } from "../../lib/globe/math";
import { globeFragment, globeVertex, haloFragment, haloVertex, starsFragment, starsVertex } from "../../lib/globe/shaders";

export type GlobePhase = "spin" | "focus" | "zoom" | "done";

export interface GlobeProps {
  /** Where to fly to once the phase moves past "spin". */
  target: { lat: number; lng: number } | null;
  phase: GlobePhase;
  /** Called when the fly-in reaches the city and the native map can take over. */
  onArrived?: () => void;
  onReady?: () => void;
  /** Reduced motion: no spin, instant focus, short zoom. */
  reducedMotion?: boolean;
  style?: object;
}

const FOCUS_MS = 2400;
const ZOOM_MS = 3200;
const FOV_DEG = 34;
/** The idle globe spans this fraction of the screen's narrower side, with space around it. */
const GLOBE_SCREEN_FRACTION = 0.8;
// Stop at country/region scale: the texture can't show streets, and the native map continues the fly-in from here.
const NEAR_DISTANCE = 2.05;

/**
 * A real 3D Earth rendered with raw WebGL through expo-gl (runs in Expo Go,
 * iOS, Android and the web). Flat Duolingo-coloured Earth texture, toon
 * lighting, dark outline rim, soft halo, twinkling stars. The globe
 * spins slowly, then yaws/pitches so the target faces the camera, then the
 * camera dollies in until the city fills the view — one continuous shot.
 */
export function Globe({ target, phase, onArrived, onReady, reducedMotion, style }: GlobeProps) {
  const phaseRef = useRef<GlobePhase>(phase);
  const targetRef = useRef(target);
  const arrivedRef = useRef(false);
  const callbacks = useRef({ onArrived, onReady });
  useEffect(() => {
    phaseRef.current = phase;
    targetRef.current = target;
    callbacks.current = { onArrived, onReady };
  }, [phase, target, onArrived, onReady]);

  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  async function onContextCreate(gl: ExpoWebGLRenderingContext) {
    const compile = (vs: string, fs: string) => {
      const program = gl.createProgram()!;
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      return program;
    };

    const sphere = buildSphere(reducedMotion ? 32 : 56, reducedMotion ? 64 : 112);
    const stars = buildStars(Platform.OS === "web" ? 900 : 650);

    const globeProgram = compile(globeVertex, globeFragment);
    const haloProgram = compile(haloVertex, haloFragment);
    const starsProgram = compile(starsVertex, starsFragment);

    const buffer = (data: Float32Array | Uint16Array, kind: number) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(kind, b);
      gl.bufferData(kind, data, gl.STATIC_DRAW);
      return b;
    };
    const posBuf = buffer(sphere.positions, gl.ARRAY_BUFFER);
    const uvBuf = buffer(sphere.uvs, gl.ARRAY_BUFFER);
    const idxBuf = buffer(sphere.indices, gl.ELEMENT_ARRAY_BUFFER);
    const starBuf = buffer(stars, gl.ARRAY_BUFFER);

    // Texture: flat Duolingo-coloured Earth (4096×2048), built from NASA's Blue Marble by scripts/earth-texture/build.py.
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // A 1×1 sea-blue pixel so the first frames match while the image decodes.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([28, 176, 246, 255]));
    try {
      const asset = Asset.fromModule(require("../../assets/earth/earth-flat-4096.png"));
      await asset.downloadAsync();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (Platform.OS === "web") {
        const img = await loadWebImage(asset.uri);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img as unknown as ImageData);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset as unknown as ImageData);
      }
      gl.generateMipmap(gl.TEXTURE_2D);
    } catch {
      // Keep the placeholder colour; the animation still runs.
    }

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const projection = perspective((FOV_DEG * Math.PI) / 180, width / height, 0.05, 100);
    // Camera distance at which the unit sphere fills GLOBE_SCREEN_FRACTION of the narrower screen side.
    const halfV = (FOV_DEG * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(halfV) * (width / height));
    const FAR_DISTANCE = 1 / Math.sin(GLOBE_SCREEN_FRACTION * Math.min(halfH, halfV));
    const lightDir = [-0.55, 0.35, 0.75];

    let yaw = 0.9; // radians; spins while idle
    let pitch = 0.25;
    let distance = FAR_DISTANCE;
    let focusStart: number | null = null;
    let focusFrom = { yaw, pitch };
    let zoomStart: number | null = null;
    let lastTime = 0;
    let raf = 0;
    let running = true;
    stop.current = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    callbacks.current.onReady?.();

    const frame = (now: number) => {
      if (!running) return;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
      lastTime = now;
      const phase = phaseRef.current;
      const target = targetRef.current;

      if (phase === "spin" || !target) {
        yaw += dt * (reducedMotion ? 0 : 0.12);
        pitch += (0.25 - pitch) * dt * 2;
      } else {
        const want = rotationFor(target.lat, target.lng);
        if (focusStart === null) {
          focusStart = now;
          focusFrom = { yaw, pitch };
        }
        const focusDur = reducedMotion ? 300 : FOCUS_MS;
        const t = Math.min(1, (now - focusStart) / focusDur);
        const e = easeInOutCubic(t);
        yaw = focusFrom.yaw + angleDelta(focusFrom.yaw, want.yaw) * e;
        pitch = focusFrom.pitch + (want.pitch - focusFrom.pitch) * e;
        if (phase === "zoom") {
          if (zoomStart === null) zoomStart = now;
          const zoomDur = reducedMotion ? 600 : ZOOM_MS;
          const zt = Math.min(1, (now - zoomStart) / zoomDur);
          distance = FAR_DISTANCE + (NEAR_DISTANCE - FAR_DISTANCE) * easeInOutCubic(zt);
          if (zt >= 1 && !arrivedRef.current) {
            arrivedRef.current = true;
            callbacks.current.onArrived?.();
          }
        } else if (t >= 1 && phase === "focus") {
          // Hold, slightly closer, until the caller moves to "zoom".
          distance += (FAR_DISTANCE * 0.92 - distance) * dt * 1.5;
        }
      }

      const eye: [number, number, number] = [0, 0, distance];
      const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
      const model = multiply(rotationX(pitch), rotationY(yaw));

      gl.viewport(0, 0, width, height);
      // Deep friendly navy rather than black.
      gl.clearColor(0.05, 0.13, 0.30, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      // Stars (fade as we approach the planet)
      const starAlpha = easeOutCubic(Math.min(1, (distance - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE)));
      if (starAlpha > 0.02) {
        gl.useProgram(starsProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.uniformMatrix4fv(gl.getUniformLocation(starsProgram, "uProjection"), false, projection);
        gl.uniformMatrix4fv(gl.getUniformLocation(starsProgram, "uView"), false, multiply(view, rotationY(yaw * 0.15)));
        gl.uniform1f(gl.getUniformLocation(starsProgram, "uTwinkle"), now / 700);
        const aStar = gl.getAttribLocation(starsProgram, "aStar");
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
        gl.enableVertexAttribArray(aStar);
        gl.vertexAttribPointer(aStar, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, stars.length / 4);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }

      // Earth
      gl.useProgram(globeProgram);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.uniformMatrix4fv(gl.getUniformLocation(globeProgram, "uProjection"), false, projection);
      gl.uniformMatrix4fv(gl.getUniformLocation(globeProgram, "uView"), false, view);
      gl.uniformMatrix4fv(gl.getUniformLocation(globeProgram, "uModel"), false, model);
      gl.uniform3fv(gl.getUniformLocation(globeProgram, "uLightDir"), new Float32Array(lightDir));
      gl.uniform3fv(gl.getUniformLocation(globeProgram, "uCameraPos"), new Float32Array(eye));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(globeProgram, "uTexture"), 0);
      const aPos = gl.getAttribLocation(globeProgram, "aPosition");
      const aUv = gl.getAttribLocation(globeProgram, "aUv");
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);

      // Atmosphere halo: back faces of a slightly larger sphere, additive.
      gl.useProgram(haloProgram);
      gl.cullFace(gl.FRONT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.uniformMatrix4fv(gl.getUniformLocation(haloProgram, "uProjection"), false, projection);
      gl.uniformMatrix4fv(gl.getUniformLocation(haloProgram, "uView"), false, view);
      gl.uniformMatrix4fv(gl.getUniformLocation(haloProgram, "uModel"), false, multiply(model, scale(1.045)));
      gl.uniform3fv(gl.getUniformLocation(haloProgram, "uCameraPos"), new Float32Array(eye));
      const aPosH = gl.getAttribLocation(haloProgram, "aPosition");
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPosH);
      gl.vertexAttribPointer(aPosH, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.cullFace(gl.BACK);

      gl.flush();
      gl.endFrameEXP();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  return (
    <View style={[styles.wrap, style]}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} msaaSamples={Platform.OS === "ios" ? 4 : 0} />
    </View>
  );
}

function loadWebImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new (globalThis as unknown as { Image: new () => HTMLImageElement }).Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("texture"));
    img.src = uri;
  });
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#04050d" },
});
