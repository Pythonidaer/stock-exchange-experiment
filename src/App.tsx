import { ThreeExactSphere } from './components/three/ThreeExactSphere'
import { useNasdaqData } from './hooks/useNasdaqData'
import type { NasdaqStock } from './data/nasdaqStocks'
import { useState } from 'react'

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ count, loading }: { count: number; loading: boolean }) {
  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'linear-gradient(to bottom, rgba(6,12,26,0.92) 0%, rgba(6,12,26,0) 100%)',
        pointerEvents: 'none',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ color: '#e8eaf0', fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 3vw, 20px)', letterSpacing: '0.04em' }}>
          NASDAQ Globe
        </span>
        <span style={{ color: '#374d6e', fontFamily: 'monospace', fontSize: 'clamp(10px, 2vw, 13px)' }}>
          every listed company
        </span>
      </div>
      {!loading && count > 0 && (
        <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 'clamp(10px, 2vw, 12px)', whiteSpace: 'nowrap' }}>
          {count.toLocaleString()} companies · all filled ✓
        </span>
      )}
    </header>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#0a0f1e',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid #1e3a5f',
          borderTopColor: '#60a5fa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 14, margin: 0 }}>
        Loading NASDAQ data…
      </p>
      <p style={{ color: '#374d6e', fontFamily: 'monospace', fontSize: 11, margin: 0 }}>
        Building the globe once data arrives
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#0a0f1e',
        padding: 24,
      }}
    >
      <p style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 14, textAlign: 'center', margin: 0 }}>
        Failed to load NASDAQ data
      </p>
      <p style={{ color: '#374d6e', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', margin: 0 }}>
        {message}
      </p>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { data, loading, error } = useNasdaqData()
  const [selected, setSelected] = useState<NasdaqStock | null>(null)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Header count={data.length} loading={loading} />

      {loading && <LoadingScreen />}
      {!loading && error && <ErrorScreen message={error} />}

      {!loading && !error && (
        <ThreeExactSphere
          data={data}
          labelContent="name"
          autoRotate={false}
          width="100%"
          height="100%"
          onSelectCompany={setSelected}
        />
      )}

      {/* Selected company overlay — mobile-friendly bottom sheet */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: 42,         /* sit above the info bar */
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(6,12,26,0.92)',
            border: '1px solid #1e3a5f',
            borderRadius: 10,
            padding: '10px 18px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            maxWidth: 'min(360px, 90vw)',
            textAlign: 'center',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            {selected.symbol}
          </div>
          <div style={{ color: '#e8eaf0', fontSize: 'clamp(11px, 2.5vw, 14px)', marginTop: 3 }}>
            {selected.name}
          </div>
          {selected.marketCategory && (
            <div style={{ color: '#4d8fce', fontSize: 'clamp(10px, 2vw, 12px)', marginTop: 4 }}>
              {selected.marketCategory}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
