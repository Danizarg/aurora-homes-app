import type { Mat4 } from "./math";

/**
 * Where the sun really is, so the globe's day and night match the clock.
 *
 * The subsolar point (the spot on Earth where the sun is straight overhead)
 * is derived from the date and the UTC time: solar declination from the day
 * of the year, longitude from the hour angle corrected by the equation of
 * time. Accuracy is within about a degree, which is far finer than the
 * terminator's own softness on screen.
 */
export function subsolarPoint(date = new Date()): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = (date.getTime() - start) / 86_400_000; // fractional
  const gamma = (2 * Math.PI * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24)) / 365;
  // NOAA's low-precision series: declination in radians, equation of time in minutes.
  const declination =
    0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  // Solar noon is at UTC longitude 0 when utcMinutes + eot == 720; the sun moves west 0.25°/min.
  let lng = -((utcMinutes + eot - 720) / 4);
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return { lat: (declination * 180) / Math.PI, lng };
}

/**
 * Unit vector towards a (lat, lng) in the sphere's own (unrotated) space, using
 * the same mapping as `buildSphere`: longitude L sits at phi = π − L.
 */
export function earthFixedDirection(latDeg: number, lngDeg: number): [number, number, number] {
  const theta = Math.PI / 2 - (latDeg * Math.PI) / 180;
  const phi = Math.PI - (lngDeg * Math.PI) / 180;
  return [-Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)];
}

/** Rotates a direction by the rotation part of a column-major 4×4 model matrix. */
export function rotateDirection(m: Mat4, d: [number, number, number]): [number, number, number] {
  return [
    m[0] * d[0] + m[4] * d[1] + m[8] * d[2],
    m[1] * d[0] + m[5] * d[1] + m[9] * d[2],
    m[2] * d[0] + m[6] * d[1] + m[10] * d[2],
  ];
}
