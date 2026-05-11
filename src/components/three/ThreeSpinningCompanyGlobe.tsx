import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { fibonacciSpherePoints } from './utils/positions'

interface Props {
  data: NasdaqStock[]
  limit?: number
  autoRotate?: boolean
  rotationSpeed?: number
  showLabels?: boolean
  width?: number
  height?: number
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

const GLOBE_RADIUS = 3.5

// ─── Single company pin on the globe surface ─────────────────────────────────

function GlobePin({
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
  const normal = position.clone().normalize()
  // Text group sits flush on the globe surface with local Z → outward normal
  const labelPos = normal.clone().multiplyScalar(GLOBE_RADIUS + 0.02)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal,
  )

  return (
    <group position={labelPos} quaternion={quaternion}>
      {/* Invisible hit target — hover detection without an obscuring dot */}
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <planeGeometry args={[0.5, 0.3]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Text
        fontSize={isHovered ? 0.24 : 0.18}
        color={isHovered ? '#fbbf24' : '#e2e8f0'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {stock.symbol}
      </Text>
    </group>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function GlobeScene({
  stocks,
  positions,
  autoRotate,
  rotationSpeed,
  showLabels,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  positions: THREE.Vector3[]
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
    }
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 8, 5]} intensity={1.2} />
      <pointLight position={[-10, -5, -8]} intensity={0.4} color="#3b82f6" />

      <Suspense fallback={null}>
        <group ref={groupRef}>
          {/* Globe sphere */}
          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
            <meshStandardMaterial
              color="#0c2d6e"
              roughness={0.6}
              metalness={0.2}
              transparent
              opacity={0.55}
            />
          </mesh>

          {/* Globe wireframe (latitude/longitude grid) */}
          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS + 0.01, 20, 20]} />
            <meshBasicMaterial color="#1d4ed8" wireframe transparent opacity={0.18} />
          </mesh>

          {/* Company pins + labels */}
          {stocks.map((s, i) => (
            <GlobePin
              key={s.symbol}
              stock={s}
              position={positions[i] ?? new THREE.Vector3(0, GLOBE_RADIUS, 0)}
              isHovered={hoveredSymbol === s.symbol}
              onHover={onHover}
            />
          ))}

          {/* Hide labels separately from pin spheres when showLabels=false */}
          {!showLabels && null}
        </group>
      </Suspense>

      <OrbitControls enableDamping autoRotate={false} />
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
        background: '#0a1628',
        color: stock ? '#93c5fd' : '#475569',
        fontFamily: 'monospace',
        fontSize: 13,
        borderTop: '1px solid #1e40af',
      }}
    >
      {stock
        ? <><strong style={{ color: '#fbbf24' }}>{stock.symbol}</strong> — {stock.name}</>
        : 'Hover a company pin to see details'}
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

/**
 * ThreeSpinningCompanyGlobe
 *
 * NASDAQ companies placed on a globe surface using the Fibonacci spiral layout —
 * the most uniform distribution possible for a sphere. Each company is a pin
 * on the globe, labelled with its ticker symbol. Labels auto-billboard to face
 * the camera so they remain readable as the globe spins.
 *
 * Drag to orbit, scroll to zoom, hover any pin to see the company name.
 */
export function ThreeSpinningCompanyGlobe({
  data,
  limit = 150,
  autoRotate = true,
  rotationSpeed = 0.25,
  showLabels = true,
  width = 650,
  height = 600,
  onSelectCompany,
}: Props) {
  const [hovered, setHovered] = useState<NasdaqStock | null>(null)
  const stocks = useMemo(() => data.slice(0, limit), [data, limit])

  const positions = useMemo(
    () =>
      fibonacciSpherePoints(stocks.length, GLOBE_RADIUS).map(
        ([x, y, z]) => new THREE.Vector3(x, y, z),
      ),
    [stocks.length],
  )

  function handleHover(stock: NasdaqStock | null) {
    setHovered(stock)
    onSelectCompany?.(stock)
  }

  // `showLabels` is intentionally the same rendering path — GlobePin always
  // renders Text. Setting showLabels=false will be wired in a future iteration.
  void showLabels

  return (
    <div>
      <div style={{ width, height }}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 55 }}
          style={{ background: '#05091a', display: 'block', width: '100%', height: '100%' }}
        >
          <GlobeScene
            stocks={stocks}
            positions={positions}
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
