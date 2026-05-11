import { useRef, useState, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { textDerivedPoints } from './utils/positions'

interface Props {
  data: NasdaqStock[]
  limit?: number
  showLabels?: boolean
  autoRotate?: boolean
  rotationSpeed?: number
  width?: number
  height?: number
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

// ─── Hull mesh (disposable geometry) ─────────────────────────────────────────

function HullMesh({ points }: { points: THREE.Vector3[] }) {
  const geometry = useMemo(() => {
    if (points.length < 4) return new THREE.OctahedronGeometry(2)
    try {
      return new ConvexGeometry(points)
    } catch {
      // Fallback when hull construction fails (coplanar or near-identical points)
      return new THREE.OctahedronGeometry(2)
    }
  }, [points])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  return (
    <>
      {/* Filled translucent hull */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#1d4ed8"
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#93c5fd"
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
    </>
  )
}

// ─── Single vertex label ──────────────────────────────────────────────────────

function VertexLabel({
  stock,
  position,
  isHovered,
  onHover,
}: {
  stock: NasdaqStock
  position: THREE.Vector3
  isHovered: boolean
  onHover: (s: NasdaqStock | null) => void
}) {
  // Orient flat on the hull surface: local Z aligned with the outward normal
  const normal = position.clone().normalize()
  const surfacePos = position.clone().add(normal.clone().multiplyScalar(0.1))
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal,
  )

  return (
    <group position={surfacePos} quaternion={quaternion}>
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[isHovered ? 0.15 : 0.09, 8, 8]} />
        <meshStandardMaterial
          color={isHovered ? '#fbbf24' : '#60a5fa'}
          emissive={isHovered ? '#fbbf24' : '#000'}
          emissiveIntensity={isHovered ? 0.6 : 0}
        />
      </mesh>
      <Text
        fontSize={isHovered ? 0.26 : 0.2}
        color={isHovered ? '#fbbf24' : '#e2e8f0'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#000"
      >
        {stock.symbol}
      </Text>
    </group>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function HullScene({
  stocks,
  points,
  vectors,
  autoRotate,
  rotationSpeed,
  showLabels,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  points: THREE.Vector3[]
  vectors: THREE.Vector3[]
  autoRotate: boolean
  rotationSpeed: number
  showLabels: boolean
  hoveredSymbol: string | null
  onHover: (s: NasdaqStock | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * rotationSpeed
      groupRef.current.rotation.x += delta * rotationSpeed * 0.2
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.3} />
      <pointLight position={[-6, -6, -6]} intensity={0.5} color="#818cf8" />

      <Suspense fallback={null}>
        <group ref={groupRef}>
          <HullMesh points={vectors} />

          {showLabels &&
            stocks.map((s, i) => (
              <VertexLabel
                key={s.symbol}
                stock={s}
                position={points[i] ?? new THREE.Vector3()}
                isHovered={hoveredSymbol === s.symbol}
                onHover={onHover}
              />
            ))}
        </group>
      </Suspense>
      <OrbitControls enableDamping />
    </>
  )
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({ stock }: { stock: NasdaqStock | null }) {
  return (
    <div
      style={{
        minHeight: 36,
        padding: '6px 12px',
        background: '#0f172a',
        color: stock ? '#93c5fd' : '#475569',
        fontFamily: 'monospace',
        fontSize: 13,
        borderTop: '1px solid #1e3a5f',
      }}
    >
      {stock
        ? <><strong>{stock.symbol}</strong> — {stock.name}</>
        : 'Hover a vertex to see company details'}
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

/**
 * ThreeConvexCompanyHull
 *
 * Builds a 3D convex hull from positions derived from stock data:
 *   x = hash of ticker symbol
 *   y = company name length (normalised)
 *   z = hash of symbol + name
 *
 * The hull geometry itself encodes the data — the shape changes as the dataset
 * changes. Ticker labels sit at each input point, just outside the hull surface.
 *
 * This explores whether a convex-hull geometry is a practical foundation
 * for the "many-sided spinning company die" idea.
 *
 * Requires @types/three (via three/examples/jsm/geometries/ConvexGeometry.js).
 */
export function ThreeConvexCompanyHull({
  data,
  limit = 80,
  showLabels = true,
  autoRotate = true,
  rotationSpeed = 0.3,
  width = 650,
  height = 550,
  onSelectCompany,
}: Props) {
  const [hovered, setHovered] = useState<NasdaqStock | null>(null)
  const stocks = useMemo(() => data.slice(0, limit), [data, limit])

  // Raw Vec3 positions derived from stock text data
  const rawPoints = useMemo(() => textDerivedPoints(stocks, 3), [stocks])

  // THREE.Vector3 versions (for ConvexGeometry)
  const vectors = useMemo(
    () => rawPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [rawPoints],
  )

  // Label positions as THREE.Vector3
  const points = useMemo(
    () => rawPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [rawPoints],
  )

  function handleHover(stock: NasdaqStock | null) {
    setHovered(stock)
    onSelectCompany?.(stock)
  }

  return (
    <div>
      <div style={{ width, height }}>
        <Canvas
          camera={{ position: [0, 0, 9], fov: 55 }}
          style={{ background: '#0a0f1e', display: 'block', width: '100%', height: '100%' }}
        >
          <HullScene
            stocks={stocks}
            points={points}
            vectors={vectors}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            showLabels={showLabels}
            hoveredSymbol={hovered?.symbol ?? null}
            onHover={handleHover}
          />
        </Canvas>
      </div>
      <InfoPanel stock={hovered} />
    </div>
  )
}
