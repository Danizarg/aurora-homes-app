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
uniform sampler2D uLights;
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uCameraPos - vWorldPos);
  vec3 albedo = texture2D(uTexture, vUv).rgb;
  float ndl = dot(n, normalize(uLightDir));
  // A narrow terminator rather than a toon band: the photograph on the day
  // side, continents only just readable in cold blue on the night side.
  float day = smoothstep(-0.16, 0.34, ndl);
  vec3 night = albedo * vec3(0.035, 0.055, 0.105);
  vec3 lit = albedo * (0.20 + 0.92 * max(ndl, 0.0));
  vec3 color = mix(night, lit, day);
  // City lights, from NASA's night-lights raster, only where the sun has left.
  float lights = texture2D(uLights, vUv).r;
  color += vec3(1.0, 0.80, 0.52) * lights * (1.0 - day) * 1.45;
  // Atmosphere on the limb, brightest where it catches the sun.
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  color += vec3(0.26, 0.52, 1.0) * fres * (0.16 + day * 1.25);
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
  // Back faces of a slightly larger sphere: a thin blue line of air at the
  // limb, fading outward into the black.
  float rim = pow(max(dot(n, -v), 0.0), 3.0);
  float a = rim * 0.42;
  gl_FragColor = vec4(vec3(0.28, 0.54, 1.0) * a, a);
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
