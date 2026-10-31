export const globeVertex = `
attribute vec3 aPosition;
attribute vec2 aUv;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(uModel) * aPosition);
  vUv = aUv;
  gl_Position = uProjection * uView * world;
}`;

export const globeFragment = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uCameraPos - vWorldPos);
  vec3 albedo = texture2D(uTexture, vUv).rgb;
  // Toon shading: two soft bands instead of a photographic terminator, so colours stay bright and flat.
  float ndl = dot(n, normalize(uLightDir));
  float lit = smoothstep(-0.15, 0.25, ndl);
  float light = mix(0.62, 1.0, lit);
  vec3 color = albedo * light;
  // A soft highlight patch, like a sticker's sheen.
  float sheen = smoothstep(0.55, 0.95, ndl) * 0.10;
  color += vec3(sheen);
  // Thick dark rim at the silhouette: Duolingo's outline stroke.
  float facing = max(dot(n, v), 0.0);
  float edge = 1.0 - smoothstep(0.18, 0.34, facing);
  vec3 outline = vec3(0.09, 0.29, 0.55);
  color = mix(color, outline, edge);
  gl_FragColor = vec4(color, 1.0);
}`;

export const haloVertex = `
attribute vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(uModel) * aPosition);
  gl_Position = uProjection * uView * world;
}`;

export const haloFragment = `
precision mediump float;
uniform vec3 uCameraPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uCameraPos - vWorldPos);
  // Back faces of a slightly larger sphere: strongest at the limb, fading outward.
  float rim = pow(max(dot(n, -v), 0.0), 1.6);
  float a = rim * 0.55;
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * a, a);
}`;

export const starsVertex = `
attribute vec4 aStar;
uniform mat4 uProjection;
uniform mat4 uView;
uniform float uTwinkle;
void main() {
  gl_Position = uProjection * uView * vec4(aStar.xyz, 1.0);
  float tw = 0.75 + 0.25 * sin(uTwinkle + aStar.x * 3.1 + aStar.y * 1.7);
  gl_PointSize = aStar.w * tw;
}`;

export const starsFragment = `
precision mediump float;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  float a = smoothstep(0.5, 0.2, d) * 0.85;
  gl_FragColor = vec4(vec3(0.85, 0.93, 1.0) * a, a);
}`;
