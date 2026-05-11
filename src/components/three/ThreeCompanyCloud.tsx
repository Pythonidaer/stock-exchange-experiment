import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { scatterInSphere } from './utils/positions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CloudLabelContent = 'symbol' | 'name'

interface Props {
  data: NasdaqStock[]
  limit?: number
  autoRotate?: boolean
  rotationSpeed?: number
  showLabels?: boolean
  labelContent?: CloudLabelContent
  width?: number | string
  height?: number | string
  onSelectCompany?: (stock: NasdaqStock | null) => void
}

const LETTER_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
]

function letterColor(symbol: string): string {
  const idx = symbol.charCodeAt(0) % LETTER_COLORS.length
  return LETTER_COLORS[idx] ?? '#888'
}

// ─── Per-company node (inside Canvas) ────────────────────────────────────────

function CompanyNode({
  stock,
  position,
  showLabels,
  labelContent,
  onHover,
  hovered,
}: {
  stock: NasdaqStock
  position: THREE.Vector3
  showLabels: boolean
  labelContent: CloudLabelContent
  onHover: (s: NasdaqStock | null) => void
  hovered: boolean
}) {
  const color = letterColor(stock.symbol)
  const r = hovered ? 0.2 : 0.1
  const label = labelContent === 'name'
    ? (stock.name.length > 20 ? stock.name.slice(0, 19) + '…' : stock.name)
    : stock.symbol

  return (
    <group position={position}>
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); onHover(stock) }}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[r, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : '#000'}
          emissiveIntensity={hovered ? 0.5 : 0}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      {showLabels && (
        <Text
          position={[0, r + 0.12, 0]}
          fontSize={labelContent === 'name' ? 0.13 : 0.18}
          maxWidth={labelContent === 'name' ? 1.2 : undefined}
          color={hovered ? '#ffffff' : '#cccccc'}
          anchorX="center"
          anchorY="bottom"
          textAlign="center"
          renderOrder={1}
        >
          {label}
        </Text>
      )}
    </group>
  )
}

// ─── Scene (inside Canvas) ───────────────────────────────────────────────────

function CloudScene({
  stocks,
  positions,
  autoRotate,
  rotationSpeed,
  showLabels,
  labelContent,
  hoveredSymbol,
  onHover,
}: {
  stocks: NasdaqStock[]
  positions: THREE.Vector3[]
  autoRotate: boolean
  rotationSpeed: number
  showLabels: boolean
  labelContent: CloudLabelContent
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <pointLight position={[-10, -10, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <group ref={groupRef}>
          {stocks.map((s, i) => (
            <CompanyNode
              key={s.symbol}
              stock={s}
              position={positions[i] ?? new THREE.Vector3()}
              showLabels={showLabels}
              labelContent={labelContent}
              onHover={onHover}
              hovered={hoveredSymbol === s.symbol}
            />
          ))}
        </group>
      </Suspense>
      <OrbitControls autoRotate={false} enableDamping />
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
        background: '#1f2937',
        color: stock ? '#f3f4f6' : '#6b7280',
        fontFamily: 'monospace',
        fontSize: 13,
        borderTop: '1px solid #374151',
        transition: 'color 0.15s',
      }}
    >
      {stock
        ? <><strong>{stock.symbol}</strong> — {stock.name}</>
        : 'Hover a company to see details'}
    </div>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────

/**
 * ThreeCompanyCloud
 *
 * Renders NASDAQ-listed companies as a 3D point cloud.
 * Each sphere's colour is determined by the first letter of the ticker symbol.
 * Hover any sphere to highlight it and see the company name in the panel below.
 * Drag to orbit, scroll to zoom.
 *
 * Uses @react-three/fiber (R3F) + @react-three/drei.
 */
export function ThreeCompanyCloud({
  data,
  limit = 200,
  autoRotate = true,
  rotationSpeed = 0.3,
  showLabels = false,
  labelContent = 'symbol',
  width = 700,
  height = 500,
  onSelectCompany,
}: Props) {
  const [hovered, setHovered] = useState<NasdaqStock | null>(null)

  const stocks = useMemo(() => data.slice(0, limit), [data, limit])

  const positions = useMemo(
    () => scatterInSphere(stocks, 6).map(([x, y, z]) => new THREE.Vector3(x, y, z)),
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
          camera={{ position: [0, 0, 14], fov: 55 }}
          style={{ background: '#111827', display: 'block', width: '100%', height: '100%' }}
        >
          <CloudScene
            stocks={stocks}
            positions={positions}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            showLabels={showLabels}
            labelContent={labelContent}
            hoveredSymbol={hovered?.symbol ?? null}
            onHover={handleHover}
          />
        </Canvas>
      </div>
      <InfoPanel stock={hovered} />
    </div>
  )
}
