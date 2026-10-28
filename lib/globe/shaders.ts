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
  float diffuse = max(dot(n, normalize(uLightDir)), 0.0);
  float ambient = 0.18;
  // Soft terminator; the night side keeps a little ambient so continents stay readable.
  float light = ambient + diffuse * 0.95;
  vec3 color = albedo * light;
  // Atmospheric rim scattering towards the edge of the disc.
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  color += vec3(0.25, 0.45, 0.9) * rim * 0.55;
  // Specular glint on the oceans (darker/bluer texels are water).
  float water = 1.0 - smoothstep(0.08, 0.35, albedo.r);
  vec3 h = normalize(normalize(uLightDir) + v);
  float spec = pow(max(dot(n, h), 0.0), 48.0) * water * 0.35;
  color += vec3(spec);
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
  float rim = pow(max(dot(n, -v), 0.0), 2.2);
  float a = rim * 0.75;
  gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * a, a);
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
  float a = smoothstep(0.5, 0.15, d);
  gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * a, a);
}`;
