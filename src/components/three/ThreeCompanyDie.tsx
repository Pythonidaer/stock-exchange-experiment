import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type DieGeometry = 'icosahedron' | 'dodecahedron' | 'octahedron'
export type LabelContent = 'symbol' | 'name'

interface Props {
  data: NasdaqStock[]
  geometry?: DieGeometry
  /** Subdivision level 0–4.
   *  Each step multiplies the face count by 4 and doubles the radius so every face
   *  keeps the same on-screen size. Counts per geometry:
   *    icosahedron → 20 · 80 · 320 · 1 280 · 5 120
   *    octahedron  →  8 · 32 · 128 ·   512 · 2 048
   *    dodecahedron→ 36·144 · 576 · 2 304 · 9 216 */
  detail?: number
  autoRotate?: boolean
  rotationSpeed?: number
  labelContent?: LabelContent
  width?: number | string
  height?: number | string
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const BASE_RADIUS = 2
const Z_AXIS = new THREE.Vector3(0, 0, 1)

/**
 * Radius that keeps face incircle ≈ constant (~0.6 units) at any detail level.
 * Three.js divides each original edge into (detail+1) segments, so each sub-edge
 * is 1/(detail+1) the original length → radius must scale by (detail+1) to compensate.
 */
function dieRadius(detail: number): number {
  return BASE_RADIUS * (detail + 1)
}

/**
 * Total triangulated face count.
 * Three.js PolyhedronGeometry with detail=d subdivides each original face into
 * (d+1)² sub-triangles (verified empirically from geometry.attributes.position.count).
 *   icosahedron:  20 · 80 · 180 · 320 · 500 · 720 … for d=0,1,2,3,4,5…
 *   octahedron:    8 · 32 ·  72 · 128 · 200 · 288 …
 *   dodecahedron: 36·144 · 324 · 576 · 900 ·1296 …
 */
function totalFaceCount(type: DieGeometry, detail: number): number {
  const base = type === 'icosahedron' ? 20 : type === 'octahedron' ? 8 : 36
  return base * Math.pow(detail + 1, 2)
}

/** Minimum detail level at which face_count >= targetCount. */
function minDetailFor(type: DieGeometry, targetCount: number): number {
  for (let d = 0; d <= 4; d++) {
    if (totalFaceCount(type, d) >= targetCount) return d
  }
  return 4
}

function makeDieGeometry(type: DieGeometry, radius: number, detail: number): THREE.BufferGeometry {
  switch (type) {
    case 'dodecahedron': return new THREE.DodecahedronGeometry(radius, detail)
    case 'octahedron':   return new THREE.OctahedronGeometry(radius, detail)
    default:             return new THREE.IcosahedronGeometry(radius, detail)
  }
}

// ─── Face extraction ──────────────────────────────────────────────────────────

interface FaceData {
  centroid: THREE.Vector3
  /** True geometric normal computed from edge cross-product — ensures text lies
   *  exactly in the face plane rather than the sphere-tangent plane. */
  normal: THREE.Vector3
  /** Inradius of the face triangle (= area / semi-perimeter). Used to scale text. */
  inCircleRadius: number
}

/**
 * Extracts centroid, cross-product normal, and incircle radius for every triangle
 * in a non-indexed PolyhedronGeometry (3 consecutive positions = 1 face).
 */
function extractFaces(geom: THREE.BufferGeometry): FaceData[] {
  const pos = geom.attributes.position as THREE.BufferAttribute
  const count = pos.count / 3
  const faces: FaceData[] = []

  for (let i = 0; i < count; i++) {
    const b = i * 3
    const va = new THREE.Vector3(pos.getX(b),     pos.getY(b),     pos.getZ(b))
    const vb = new THREE.Vector3(pos.getX(b + 1), pos.getY(b + 1), pos.getZ(b + 1))
    const vc = new THREE.Vector3(pos.getX(b + 2), pos.getY(b + 2), pos.getZ(b + 2))

    const centroid = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3)

    // True face normal from edge cross product — far more accurate than centroid.normalize()
    // for subdivided (spherically projected) geometries.
    const edge1 = new THREE.Vector3().subVectors(vb, va)
    const edge2 = new THREE.Vector3().subVectors(vc, va)
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
    if (normal.dot(centroid) < 0) normal.negate()   // ensure outward

    // Incircle radius = area / semi-perimeter  (Heron's formula)
    const a = edge1.length()
    const bLen = new THREE.Vector3().subVectors(vc, vb).length()
    const c = edge2.length()
    const s = (a + bLen + c) / 2
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - bLen) * (s - c)))
    const inCircleRadius = s > 0 ? area / s : 0

    faces.push({ centroid, normal, inCircleRadius })
  }

  return faces
}

// ─── Label sizing ─────────────────────────────────────────────────────────────

/**
 * Derives font size so the full text wraps within the face incircle.
 * Formula: fontSize ≈ R × 1.6 / √N (fills the inscribed square of the incircle).
 * Clamped to [R×0.06, R×0.38] to handle extremes gracefully.
 */
function faceAutoFontSize(text: string, inCircleR: number): number {
  const N = Math.max(text.length, 1)
  const raw = inCircleR * 1.6 / Math.sqrt(N)
  return Math.min(inCircleR * 0.38, Math.max(inCircleR * 0.06, raw))
}

// ─── Single face label ────────────────────────────────────────────────────────

function FaceLabel({
  stock,
  face,
  isHovered,
  onHover,
  labelContent,
}: {
  stock: NasdaqStock
  face: FaceData
  isHovered: boolean
  onHover: (s: NasdaqStock | null) => void
  labelContent: LabelContent
}) {
  const R = face.inCircleRadius
  // Sit 0.5 % of the incircle radius above the face — imperceptible but prevents z-fighting.
  const pos = face.centroid.clone().addScaledVector(face.normal, R * 0.005)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, face.normal)

  const isName = labelContent === 'name'
  const label = stock.name  // always use full name (no truncation)
  const displayLabel = isName ? label : stock.symbol
  const fontSize = isName ? faceAutoFontSize(label, R) : R * 0.45
  const maxWidth = isName ? R * 1.7 : undefined

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Hit target — FrontSide only so hover fires only on camera-facing faces */}
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <planeGeometry args={[R * 1.8, R * 1.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Text
        fontSize={fontSize}
        maxWidth={maxWidth}
        color={isHovered ? '#fbbf24' : '#e8eaf0'}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        outlineWidth={fontSize * 0.1}
        outlineColor="#060c1a"
      >
        {displayLabel}
      </Text>
    </group>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function DieScene({
  stocks,
  faces,
  dieGeom,
  autoRotate,
  rotationSpeed,
  labelContent,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  faces: FaceData[]
  dieGeom: THREE.BufferGeometry
  autoRotate: boolean
  rotationSpeed: number
  labelContent: LabelContent
  hoveredSymbol: string | null
  onHover: (s: NasdaqStock | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 8, 5]} intensity={1.4} />
      <pointLight position={[-8, -5, -5]} intensity={0.5} color="#4466ff" />

      <Suspense fallback={null}>
        <group ref={groupRef}>
          <mesh geometry={dieGeom}>
            <meshStandardMaterial color="#1a3358" roughness={0.25} metalness={0.6} transparent opacity={0.88} />
          </mesh>
          <mesh geometry={dieGeom}>
            <meshBasicMaterial color="#4d8fce" wireframe transparent opacity={0.25} />
          </mesh>

          {stocks.map((s, i) => {
            const face = faces[i]
            if (!face) return null
            return (
              <FaceLabel
                key={s.symbol}
                stock={s}
                face={face}
                isHovered={hoveredSymbol === s.symbol}
                onHover={onHover}
                labelContent={labelContent}
              />
            )
          })}
        </group>
      </Suspense>

      <OrbitControls
        enableDamping
        minDistance={dieGeom.boundingSphere?.radius != null ? dieGeom.boundingSphere.radius * 0.6 : 1}
        maxDistance={dieGeom.boundingSphere?.radius != null ? dieGeom.boundingSphere.radius * 6 : 100}
      />
    </>
  )
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({
  stock,
  shownCount,
  totalData,
  faceCount,
}: {
  stock: NasdaqStock | null
  shownCount: number
  totalData: number
  faceCount: number
}) {
  const emptyFaces = faceCount - shownCount
  const missingCompanies = totalData - shownCount

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 14px',
        minHeight: 34,
        background: '#0a0f1e',
        borderTop: '1px solid #1e3a5f',
        flexShrink: 0,
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: stock ? '#fbbf24' : '#4b5563', fontFamily: 'monospace', fontSize: 13 }}>
        {stock
          ? <><strong>{stock.symbol}</strong> — {stock.name}</>
          : 'Drag to rotate · hover a face to see company details'}
      </span>
      <span style={{ color: '#374d6e', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
        {missingCompanies > 0
          ? <span style={{ color: '#92400e' }}>showing {shownCount.toLocaleString()} of {totalData.toLocaleString()} · </span>
          : null}
        {faceCount.toLocaleString()} faces
        {emptyFaces > 0
          ? <span style={{ color: '#374151' }}> · {emptyFaces.toLocaleString()} empty</span>
          : <span style={{ color: '#166534' }}> · all filled ✓</span>}
      </span>
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

/**
 * ThreeCompanyDie
 *
 * A 3D polyhedron with exactly one NASDAQ company name per triangulated face.
 * Labels are oriented using the true face normal (cross-product), so text lies
 * perfectly flush with the face plane at all detail levels.
 * Font size is derived from the face's actual incircle radius — no truncation.
 *
 * Face counts per geometry + detail:
 *   icosahedron: 20 · 80 · 320 · 1 280 · 5 120  (detail 0–4)
 *   octahedron:   8 · 32 · 128 ·   512 · 2 048
 *   dodecahedron:36·144 · 576 · 2 304 · 9 216
 *
 * Radius doubles at each detail step so every face stays the same on-screen size.
 */
export function ThreeCompanyDie({
  data,
  geometry = 'icosahedron',
  detail = 0,
  autoRotate = false,
  rotationSpeed = 0.4,
  labelContent = 'name',
  width = '100%',
  height = '100%',
  onSelectCompany,
}: Props) {
  const [hovered, setHovered] = useState<NasdaqStock | null>(null)

  const clampedDetail = Math.max(0, Math.min(4, Math.round(detail)))
  const radius = dieRadius(clampedDetail)
  const cameraZ = radius * 3.5

  // Pre-compute geometry and faces here (outside Canvas) so the info panel
  // can read the true face count directly from the geometry buffer.
  const dieGeom = useMemo(
    () => {
      const g = makeDieGeometry(geometry, radius, clampedDetail)
      g.computeBoundingSphere()
      return g
    },
    [geometry, radius, clampedDetail],
  )

  const faces = useMemo(() => extractFaces(dieGeom), [dieGeom])
  const faceCount = faces.length   // actual count from geometry — no formula guessing

  const stocks = useMemo(() => data.slice(0, faceCount), [data, faceCount])

  function handleHover(stock: NasdaqStock | null) {
    setHovered(stock)
    onSelectCompany?.(stock)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, height }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Canvas
          key={`${geometry}-${clampedDetail}`}
          camera={{ position: [0, 0, cameraZ], fov: 50 }}
          style={{ background: '#0a0f1e', display: 'block', width: '100%', height: '100%' }}
        >
          <DieScene
            stocks={stocks}
            faces={faces}
            dieGeom={dieGeom}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            labelContent={labelContent}
            hoveredSymbol={hovered?.symbol ?? null}
            onHover={handleHover}
          />
        </Canvas>
      </div>
      <InfoPanel
        stock={hovered}
        shownCount={stocks.length}
        totalData={data.length}
        faceCount={faceCount}
      />
    </div>
  )
}

// ─── Exported helpers (used by stories) ──────────────────────────────────────

export { minDetailFor, totalFaceCount }
