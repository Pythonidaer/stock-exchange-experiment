import type { Meta, StoryObj } from '@storybook/react'
import { ThreeExactSphere } from './ThreeExactSphere'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof ThreeExactSphere> = {
  title: 'Three / ExactSphere',
  component: ThreeExactSphere,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '## Every company. Every cell. Zero empty.\n\n' +
          'This is the answer to **"show all companies with no extras and no missing."**\n\n' +
          'The sphere is divided into **exactly N cells** where N is your company count. ' +
          'The trick: factorize N into W × H (columns × rows) where W × H = N precisely.\n\n' +
          '| Companies | Grid | Aspect |\n' +
          '|-----------|------|--------|\n' +
          '| 99 | 11 × 9 | 1.22 |\n' +
          '| 100 | 10 × 10 | 1.00 |\n' +
          '| 3 300 | 75 × 44 | 1.70 |\n\n' +
          'If your company count is prime (e.g. 97), the grid becomes a ring (97 × 1). ' +
          'Labels are flat on the sphere surface and automatically sized to fill each cell without truncation.',
      },
    },
  },
  argTypes: {
    labelContent: { control: 'radio', options: ['name', 'symbol'] },
    autoRotate:   { control: 'boolean' },
    rotationSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeExactSphere>

// ─── Shared data wrapper ──────────────────────────────────────────────────────

function ExactWithData(args: React.ComponentProps<typeof ThreeExactSphere>) {
  const { data, loading, error } = useNasdaqData()

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#0a0f1e',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <p style={{ color: '#60a5fa', fontFamily: 'monospace', margin: 0 }}>Loading NASDAQ data…</p>
        <p style={{ color: '#374d6e', fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
          Once loaded the grid will be sized to exactly match the company count.
        </p>
      </div>
    )
  }
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ThreeExactSphere {...args} data={data} />
    </div>
  )
}

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * **The main story — open this one.**
 *
 * All NASDAQ companies on one sphere.  The grid is computed automatically so that
 * columns × rows = company count exactly.  Check the info bar at the bottom — it
 * always shows "all filled ✓ · zero empty ✓".
 *
 * For the 99-company fallback dataset: **11 × 9 = 99**.
 * For the live ~3 300-company feed: **75 × 44 = 3 300**.
 */
export const AllCompaniesExact: Story = {
  name: 'All Companies — Exact Fit',
  render: (args) => <ExactWithData {...args} />,
  args: {
    labelContent: 'name',
    autoRotate: false,
    rotationSpeed: 0.3,
  },
}

/** Same sphere with ticker symbols instead of full names — larger text, faster to scan. */
export const Symbols: Story = {
  name: 'Symbols',
  render: (args) => <ExactWithData {...args} />,
  args: {
    labelContent: 'symbol',
    autoRotate: false,
  },
}

/** Auto-rotating version for ambient display. */
export const Spinning: Story = {
  name: 'Spinning',
  render: (args) => <ExactWithData {...args} />,
  args: {
    labelContent: 'name',
    autoRotate: true,
    rotationSpeed: 0.25,
  },
}
