/**
 * Deterministic 3D position generators for Three.js visualizations.
 * All functions are pure — same input always produces same output,
 * no Math.random() calls.
 */

import type { NasdaqStock } from '../../../data/nasdaqStocks'

export type Vec3 = [number, number, number]

// ─── Hashing ──────────────────────────────────────────────────────────────────

/** Deterministic integer hash of a string. Returns a positive 32-bit int. */
export function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h >>> 0 // unsigned
}

/** Maps a hash value to [-range, range]. */
function hashToRange(h: number, range: number): number {
  return ((h % 10000) / 10000) * range * 2 - range
}

// ─── Sphere distributions ────────────────────────────────────────────────────

/**
 * Distributes n points evenly on a sphere surface using the Fibonacci / golden-angle
 * spiral. Produces a very uniform, deterministic layout — good for Globe and Die.
 */
export function fibonacciSpherePoints(n: number, radius = 1): Vec3[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const points: Vec3[] = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i
    points.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius])
  }
  return points
}

/**
 * Scatters stocks in a sphere volume using their symbol as a deterministic seed.
 * Used for the CompanyCloud where each company has a unique "random" position.
 */
export function scatterInSphere(stocks: NasdaqStock[], radius = 5): Vec3[] {
  return stocks.map((s) => {
    const h1 = strHash(s.symbol)
    const h2 = strHash(s.symbol + s.name)
    const h3 = strHash(s.name)

    // Spherical coordinates derived from hashes
    const theta = (h1 % 1000) / 1000 * Math.PI * 2
    const phi = Math.acos(((h2 % 1000) / 1000) * 2 - 1)
    const r = (0.3 + (h3 % 700) / 1000) * radius // 0.3r–1.0r (avoids centre clump)

    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ]
  })
}

// ─── Text-derived points ─────────────────────────────────────────────────────

/**
 * Generates a 3D point for each stock from its text content.
 *   x = hash of symbol
 *   y = company name length (normalised)
 *   z = hash of symbol + name
 * Used for ConvexHull where the geometry itself is derived from the data.
 */
export function textDerivedPoints(stocks: NasdaqStock[], spread = 3): Vec3[] {
  const maxLen = Math.max(...stocks.map((s) => s.name.length), 1)
  return stocks.map((s) => {
    const h1 = strHash(s.symbol)
    const h2 = strHash(s.symbol + s.name)
    return [
      hashToRange(h1, spread),
      (s.name.length / maxLen) * spread * 2 - spread,
      hashToRange(h2, spread),
    ]
  })
}

// ─── Grid / volume distributions ─────────────────────────────────────────────

/**
 * Distributes stocks in a cubic grid, deterministically ordered.
 * Used for LOD labels where a regular layout makes the level-of-detail
 * behaviour easy to explore by zooming in/out.
 */
export function gridVolume(stocks: NasdaqStock[], spacing = 1.2): Vec3[] {
  const n = stocks.length
  const side = Math.ceil(Math.cbrt(n))
  return stocks.map((_, i) => {
    const x = (i % side) - side / 2
    const y = (Math.floor(i / side) % side) - side / 2
    const z = Math.floor(i / (side * side)) - side / 2
    return [x * spacing, y * spacing, z * spacing]
  })
}
