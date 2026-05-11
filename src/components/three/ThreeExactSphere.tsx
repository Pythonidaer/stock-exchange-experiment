import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { NasdaqStock } from '../../data/nasdaqStocks'

// ─── Grid math ────────────────────────────────────────────────────────────────

/**
 * Factor N into W columns × H rows (W >= H) where W × H = N exactly.
 * Chooses the factorization whose W/H ratio is closest to 2:1 — the natural
 * aspect of a sphere surface (longitude spans 2π, latitude spans π).
 *
 * Examples:
 *   99  → (11, 9)   aspect 1.22  — globe with 9 rows, 11 columns
 *   3300 → (75, 44)  aspect 1.70  — dense tiled sphere
 *   97  → (97, 1)   aspect 97    — 97-sided ring (97 is prime)
 */
function findGridDimensions(n: number): [number, number] {
  if (n <= 1) return [Math.max(n, 1), 1]
  const TARGET = 2.0
  let bestW = n, bestH = 1, bestScore = Infinity
  for (let h = 1; h * h <= n; h++) {
    if (n % h === 0) {
      const w = n / h
      const score = Math.abs(w / h - TARGET)
      if (score < bestScore) { bestScore = score; bestW = w; bestH = h }
    }
  }
  return [bestW, bestH]
}

interface CellInfo {
  centroid: THREE.Vector3
  /** Outward radial direction at the cell center — used to orient the label. */
  normal: THREE.Vector3
  /** Radius of the largest circle fitting inside the cell (world units). */
  inCircleRadius: number
}

/**
 * Returns centroid, outward normal, and inCircleRadius for each of the W×H cells
 * on a sphere of the given radius.  Cells are ordered row-major (top→bottom,
 * left→right) matching the stock array order.
 */
function computeCells(W: number, H: number, radius: number): CellInfo[] {
  const cells: CellInfo[] = []
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const phi   = -Math.PI / 2 + (r + 0.5) / H * Math.PI   // latitude  (-π/2 → π/2)
      const theta = (c + 0.5) / W * 2 * Math.PI               // longitude (0 → 2π)

      const centroid = new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta),
        Math.sin(phi),
        Math.cos(phi) * Math.sin(theta),
      ).multiplyScalar(radius)

      const normal = centroid.clone().normalize()

      // Cell height in world units (constant across all latitudes)
      const cellH = radius * Math.PI / H
      // Cell width narrows toward the poles with cos(phi)
      const cellW = radius * 2 * Math.PI / W * Math.abs(Math.cos(phi))
      // Incircle of the quad = half the shorter side × a fit factor
      const inCircleRadius = Math.min(cellH, cellW) * 0.42

      cells.push({ centroid, normal, inCircleRadius })
    }
  }
  return cells
}

/**
 * Builds a LineSegments geometry for the clean lat/lon grid (no triangle diagonals).
 * Uses fewer arc segments for dense grids to stay GPU-light.
 */
function createGridGeometry(W: number, H: number, radius: number): THREE.BufferGeometry {
  const SEGS = Math.max(16, Math.min(64, Math.round(512 / Math.max(W, H))))
  const positions: number[] = []

  // Horizontal circles (H+1 parallels including poles)
  for (let h = 0; h <= H; h++) {
    const phi = -Math.PI / 2 + (h / H) * Math.PI
    const r   = Math.cos(phi) * radius
    const y   = Math.sin(phi) * radius
    for (let i = 0; i < SEGS; i++) {
      const t0 = (i / SEGS) * 2 * Math.PI
      const t1 = ((i + 1) / SEGS) * 2 * Math.PI
      positions.push(r * Math.cos(t0), y, r * Math.sin(t0))
      positions.push(r * Math.cos(t1), y, r * Math.sin(t1))
    }
  }

  // Vertical arcs (W meridians)
  for (let w = 0; w < W; w++) {
    const theta = (w / W) * 2 * Math.PI
    for (let i = 0; i < SEGS; i++) {
      const p0 = -Math.PI / 2 + (i / SEGS) * Math.PI
      const p1 = -Math.PI / 2 + ((i + 1) / SEGS) * Math.PI
      positions.push(
        radius * Math.cos(p0) * Math.cos(theta),
        radius * Math.sin(p0),
        radius * Math.cos(p0) * Math.sin(theta),
      )
      positions.push(
        radius * Math.cos(p1) * Math.cos(theta),
        radius * Math.sin(p1),
        radius * Math.cos(p1) * Math.sin(theta),
      )
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geom
}

// ─── Font sizing ──────────────────────────────────────────────────────────────

/** Scale text to fit within the cell's inCircleRadius without truncating. */
function autoFontSize(text: string, inCircleR: number): number {
  const N = Math.max(text.length, 1)
  const raw = inCircleR * 1.6 / Math.sqrt(N)
  return Math.min(inCircleR * 0.38, Math.max(inCircleR * 0.06, raw))
}

// ─── Cell label ───────────────────────────────────────────────────────────────

const Z_AXIS = new THREE.Vector3(0, 0, 1)

function CellLabel({
  stock,
  cell,
  isHovered,
  onHover,
  labelContent,
}: {
  stock: NasdaqStock
  cell: CellInfo
  isHovered: boolean
  onHover: (s: NasdaqStock | null) => void
  labelContent: 'symbol' | 'name'
}) {
  const text     = labelContent === 'name' ? stock.name : stock.symbol
  const R        = cell.inCircleRadius
  const fontSize = autoFontSize(text, R)
  const pos      = cell.centroid.clone().addScaledVector(cell.normal, R * 0.01)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, cell.normal)

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Invisible hit target — intercepts pointer events */}
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <planeGeometry args={[R * 1.8, R * 1.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Text
        fontSize={fontSize}
        maxWidth={R * 1.8}
        color={isHovered ? '#fbbf24' : '#e8eaf0'}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        outlineWidth={fontSize * 0.08}
        outlineColor="#060c1a"
      >
        {text}
      </Text>
    </group>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function SphereScene({
  stocks,
  cells,
  radius,
  gridGeom,
  autoRotate,
  rotationSpeed,
  labelContent,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  cells: CellInfo[]
  radius: number
  gridGeom: THREE.BufferGeometry
  autoRotate: boolean
  rotationSpeed: number
  labelContent: 'symbol' | 'name'
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
          {/* Smooth sphere background */}
          <mesh>
            <sphereGeometry args={[radius, 64, 32]} />
            <meshStandardMaterial color="#1a3358" roughness={0.25} metalness={0.6} transparent opacity={0.88} />
          </mesh>

          {/* Clean lat/lon grid lines — no triangle diagonals */}
          <lineSegments geometry={gridGeom}>
            <lineBasicMaterial color="#4d8fce" transparent opacity={0.4} />
          </lineSegments>

          {/* One label per company, one cell per label */}
          {stocks.map((s, i) => {
            const cell = cells[i]
            if (!cell) return null
            return (
              <CellLabel
                key={s.symbol}
                stock={s}
                cell={cell}
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
        minDistance={radius * 0.5}
        maxDistance={radius * 8}
      />
    </>
  )
}

// ─── Info bar ─────────────────────────────────────────────────────────────────

function InfoBar({
  stock,
  W,
  H,
  count,
}: {
  stock: NasdaqStock | null
  W: number
  H: number
  count: number
}) {
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
          : 'Drag to rotate · hover a cell to see company details'}
      </span>
      <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
        {count.toLocaleString()} companies · {W}×{H} grid · <strong>all filled ✓ · zero empty ✓</strong>
      </span>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface ThreeExactSphereProps {
  data: NasdaqStock[]
  autoRotate?: boolean
  rotationSpeed?: number
  /** Show full company name or ticker symbol in each cell. */
  labelContent?: 'symbol' | 'name'
  width?: number | string
  height?: number | string
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

const SPHERE_RADIUS = 3

/**
 * ThreeExactSphere
 *
 * A sphere divided into **exactly N cells** — one cell per company, zero left over,
 * zero blank.  The trick: factorize N into W × H (columns × rows) where W × H = N
 * exactly.  For example, 99 companies → 11 × 9 grid, 3 300 companies → 75 × 44.
 *
 * Labels are flat on the sphere surface, oriented by the outward normal at each
 * cell centre and sized to fill the cell without truncation.
 */
export function ThreeExactSphere({
  data,
  autoRotate = false,
  rotationSpeed = 0.3,
  labelContent = 'name',
  width = '100%',
  height = '100%',
  onSelectCompany,
}: ThreeExactSphereProps) {
  const [hovered, setHovered] = useState<NasdaqStock | null>(null)
  const n = data.length

  const [W, H]   = useMemo(() => findGridDimensions(n), [n])
  const cells    = useMemo(() => computeCells(W, H, SPHERE_RADIUS), [W, H])
  const gridGeom = useMemo(() => createGridGeometry(W, H, SPHERE_RADIUS), [W, H])
  const cameraZ  = SPHERE_RADIUS * 3.2

  function handleHover(stock: NasdaqStock | null) {
    setHovered(stock)
    onSelectCompany?.(stock)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, height }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Canvas
          key={`exact-${n}`}
          camera={{ position: [0, 0, cameraZ], fov: 50 }}
          style={{ background: '#0a0f1e', display: 'block', width: '100%', height: '100%' }}
        >
          <SphereScene
            stocks={data}
            cells={cells}
            radius={SPHERE_RADIUS}
            gridGeom={gridGeom}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            labelContent={labelContent}
            hoveredSymbol={hovered?.symbol ?? null}
            onHover={handleHover}
          />
        </Canvas>
      </div>
      <InfoBar stock={hovered} W={W} H={H} count={n} />
    </div>
  )
}
