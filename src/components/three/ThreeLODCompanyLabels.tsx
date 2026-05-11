import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { gridVolume } from './utils/positions'

interface Props {
  data: NasdaqStock[]
  limit?: number
  autoRotate?: boolean
  width?: number
  height?: number
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

// ─── LOD thresholds ───────────────────────────────────────────────────────────
//
// LOD (Level of Detail) strategy:
//   Close   (< 3.5 units): full company name + ticker symbol in large text
//   Medium  (3.5–9 units): ticker symbol only in smaller text
//   Far     (> 9 units):   single coloured dot (no text rendered at all)
//
// Distance is measured per-company each frame using camera.position.distanceTo().
// This is more granular than THREE.LOD (which applies globally) and gives each
// company its own threshold based on its actual screen distance.
//
const CLOSE_DIST = 3.5
const MED_DIST = 9

type LodLevel = 'close' | 'medium' | 'far'

function getLodLevel(dist: number): LodLevel {
  if (dist < CLOSE_DIST) return 'close'
  if (dist < MED_DIST) return 'medium'
  return 'far'
}

// ─── Per-company LOD node ─────────────────────────────────────────────────────

function LodNode({
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
  const { camera } = useThree()
  const lodRef = useRef<LodLevel>('far')

  // Re-compute LOD level every frame based on live camera distance
  const [lodLevel, setLodLevel] = useState<LodLevel>('far')

  useFrame(() => {
    const dist = camera.position.distanceTo(position)
    const next = getLodLevel(dist)
    if (next !== lodRef.current) {
      lodRef.current = next
      setLodLevel(next)
    }
  })

  const dotColor = stock.symbol.charCodeAt(0) % 2 === 0 ? '#60a5fa' : '#34d399'

  return (
    <group position={position}>
      {/* Always-present invisible hit sphere */}
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* FAR: just a coloured dot */}
      {lodLevel === 'far' && (
        <mesh>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color={dotColor} />
        </mesh>
      )}

      {/* MEDIUM: ticker symbol only */}
      {lodLevel === 'medium' && (
        <Text
          fontSize={0.18}
          color={isHovered ? '#fbbf24' : dotColor}
          anchorX="center"
          anchorY="middle"
          renderOrder={1}
        >
          {stock.symbol}
        </Text>
      )}

      {/* CLOSE: symbol + truncated name */}
      {lodLevel === 'close' && (
        <>
          <Text
            position={[0, 0.18, 0]}
            fontSize={0.22}
            color={isHovered ? '#fbbf24' : '#f3f4f6'}
            anchorX="center"
            anchorY="bottom"
            renderOrder={2}
          >
            {stock.symbol}
          </Text>
          <Text
            position={[0, -0.06, 0]}
            fontSize={0.12}
            color="#9ca3af"
            anchorX="center"
            anchorY="top"
            maxWidth={1.8}
            renderOrder={2}
          >
            {stock.name.length > 28 ? stock.name.slice(0, 27) + '…' : stock.name}
          </Text>
        </>
      )}
    </group>
  )
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function LodScene({
  stocks,
  positions,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  positions: THREE.Vector3[]
  hoveredSymbol: string | null
  onHover: (s: NasdaqStock | null) => void
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Suspense fallback={null}>
        {stocks.map((s, i) => (
          <LodNode
            key={s.symbol}
            stock={s}
            position={positions[i] ?? new THREE.Vector3()}
            isHovered={hoveredSymbol === s.symbol}
            onHover={onHover}
          />
        ))}
      </Suspense>

      {/* No autoRotate here — the user moves the camera to explore LOD behaviour */}
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
        background: '#111827',
        color: stock ? '#f3f4f6' : '#6b7280',
        fontFamily: 'monospace',
        fontSize: 13,
        borderTop: '1px solid #374151',
      }}
    >
      {stock
        ? <><strong>{stock.symbol}</strong> — {stock.name}</>
        : 'Zoom in to see full labels · zoom out to see only dots'}
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

/**
 * ThreeLODCompanyLabels
 *
 * Demonstrates level-of-detail (LOD) label rendering for NASDAQ companies.
 * Companies are arranged in a 3D grid. As you zoom in (orbit closer), labels
 * progressively gain detail:
 *   Far   → coloured dot
 *   Medium → ticker symbol
 *   Close  → ticker + truncated company name
 *
 * Use OrbitControls to zoom in/out and observe the transitions.
 * No auto-rotation — the point is to explore LOD by moving the camera.
 */
export function ThreeLODCompanyLabels({
  data,
  limit = 250,
  autoRotate = false,
  width = 700,
  height = 500,
  onSelectCompany,
}: Props) {
  void autoRotate // LOD is explored via manual orbit, not auto-rotation

  const [hovered, setHovered] = useState<NasdaqStock | null>(null)
  const stocks = useMemo(() => data.slice(0, limit), [data, limit])

  const positions = useMemo(
    () => gridVolume(stocks, 1.4).map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [stocks],
  )

  function handleHover(stock: NasdaqStock | null) {
    setHovered(stock)
    onSelectCompany?.(stock)
  }

  return (
    <div>
      <div style={{ width, height }}>
        <Canvas
          camera={{ position: [0, 0, 16], fov: 60 }}
          style={{ background: '#111827', display: 'block', width: '100%', height: '100%' }}
        >
          <LodScene
            stocks={stocks}
            positions={positions}
            hoveredSymbol={hovered?.symbol ?? null}
            onHover={handleHover}
          />
        </Canvas>
      </div>
      <InfoPanel stock={hovered} />
    </div>
  )
}
