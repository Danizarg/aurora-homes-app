/** A UV sphere with positions (= normals, unit radius) and equirectangular texture coordinates. */
export function buildSphere(latSegments = 48, lonSegments = 96) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= latSegments; y++) {
    const v = y / latSegments;
    const theta = v * Math.PI; // 0 at north pole
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let x = 0; x <= lonSegments; x++) {
      const u = x / lonSegments;
      const phi = u * Math.PI * 2;
      // Longitude 0 faces +Z so an unrotated globe shows the prime meridian to the camera.
      const px = -sinT * Math.sin(phi);
      const py = cosT;
      const pz = sinT * Math.cos(phi);
      positions.push(px, py, pz);
      // Equirectangular: u=0 at lon -180°. With phi measured from +Z going towards -X, u maps to lon = phi - 180°.
      uvs.push(1 - u, v);
    }
  }
  for (let y = 0; y < latSegments; y++) {
    for (let x = 0; x < lonSegments; x++) {
      const a = y * (lonSegments + 1) + x;
      const b = a + lonSegments + 1;
      // Counter-clockwise seen from outside, so back-face culling hides the far side (not the near one).
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(indices) };
}

/** Stars scattered on a far sphere, as point positions. */
export function buildStars(count = 700, radius = 40, seed = 7) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const z = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    out[i * 4] = r * Math.cos(t) * radius;
    out[i * 4 + 1] = r * Math.sin(t) * radius;
    out[i * 4 + 2] = z * radius;
    out[i * 4 + 3] = 1 + rnd() * 1.8; // point size
  }
  return out;
}

/**
 * Model rotation that brings (lat, lng) to face the camera on +Z.
 * With the UV mapping above, longitude L sits at phi = π − L, so a yaw of
 * π − L turns it to +Z; a pitch of +lat then tilts that latitude to the centre.
 */
export function rotationFor(latDeg: number, lngDeg: number) {
  return { yaw: Math.PI - (lngDeg * Math.PI) / 180, pitch: (latDeg * Math.PI) / 180 };
}
