import type { Meta, StoryObj } from '@storybook/react'
import { ThreeCompanyDie, minDetailFor, totalFaceCount } from './ThreeCompanyDie'
import { useNasdaqData } from '../../hooks/useNasdaqData'
import type { NasdaqStock } from '../../data/nasdaqStocks'

const meta: Meta<typeof ThreeCompanyDie> = {
  title: 'Three / CompanyDie',
  component: ThreeCompanyDie,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A 3D polyhedron with **one company name centered flat on each triangular face**.\n\n' +
          'Three.js subdivides each original triangle into **(detail+1)²** sub-triangles. ' +
          'The radius scales by (detail+1) so every face stays the same on-screen size.\n\n' +
          '**Face counts:**\n\n' +
          '| detail | icosahedron | octahedron | dodecahedron |\n' +
          '|--------|------------|------------|-------------|\n' +
          '| 0 | 20 | 8 | 36 |\n' +
          '| 1 | 80 | 32 | 144 |\n' +
          '| 2 | 180 | 72 | 324 |\n' +
          '| 3 | 320 | 128 | 576 |\n' +
          '| 4 | 500 | 200 | 900 |\n' +
          '| 12 | 3 380 | 1 352 | 6 084 |\n\n' +
          '**"All companies, no blank faces" is impossible** unless the face count exactly equals your company count. ' +
          'The **FitToData** story picks the minimum detail so *all companies are shown* (fewest possible empty faces). ' +
          'If you want every face filled with no blanks, use a detail level where face_count ≤ company_count (some companies will be left off).',
      },
    },
  },
  argTypes: {
    geometry: { control: 'radio', options: ['icosahedron', 'dodecahedron', 'octahedron'] },
    detail: { control: { type: 'range', min: 0, max: 15, step: 1 } },
    labelContent: { control: 'radio', options: ['name', 'symbol'] },
    autoRotate: { control: 'boolean' },
    rotationSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeCompanyDie>

function DieWithData(args: React.ComponentProps<typeof ThreeCompanyDie>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#60a5fa', fontFamily: 'monospace' }}>Loading NASDAQ data…</p>
      </div>
    )
  }
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ThreeCompanyDie {...args} data={data} />
    </div>
  )
}

/** 20-face icosahedron — the most symmetrical shape. */
export const Icosahedron: Story = {
  render: (args) => <DieWithData {...args} />,
  args: { geometry: 'icosahedron', detail: 0, labelContent: 'name', autoRotate: false },
}

/** 8-face octahedron — bold and minimal. */
export const Octahedron: Story = {
  render: (args) => <DieWithData {...args} />,
  args: { geometry: 'octahedron', detail: 0, labelContent: 'name', autoRotate: false },
}

/** 36-face dodecahedron (triangulated). */
export const Dodecahedron: Story = {
  render: (args) => <DieWithData {...args} />,
  args: { geometry: 'dodecahedron', detail: 0, labelContent: 'name', autoRotate: false },
}

/** Ticker symbols instead of names. */
export const Symbols: Story = {
  render: (args) => <DieWithData {...args} />,
  args: { geometry: 'icosahedron', detail: 0, labelContent: 'symbol', autoRotate: false },
}

/**
 * Automatically picks the minimum `detail` so ALL companies in the dataset are shown.
 * There will still be some empty faces — that is unavoidable without an exact match.
 *
 * 99-company fallback:
 *   octahedron  detail=3 → 128 faces, 29 empty  ← fewest blanks of any geometry
 *   icosahedron detail=2 → 180 faces, 81 empty
 *
 * Live ~3 300-company NASDAQ feed:
 *   icosahedron detail=12 → 3 380 faces, ~80 empty  ← nearly perfect fit
 *
 * If you want ZERO empty faces, reduce the detail by 1 — every face will be filled
 * but the companies that didn't fit won't appear.
 */
function FitToDataWrapper(args: React.ComponentProps<typeof ThreeCompanyDie>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#60a5fa', fontFamily: 'monospace' }}>Loading NASDAQ data…</p>
      </div>
    )
  }
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>

  const geo = (args.geometry ?? 'octahedron') as 'icosahedron' | 'dodecahedron' | 'octahedron'
  const autoDetail = minDetailFor(geo, data.length)
  const faces = totalFaceCount(geo, autoDetail)

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 14px', background: '#060c1a', color: '#6b7280', fontFamily: 'monospace', fontSize: 11, borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        {data.length.toLocaleString()} companies → auto detail={autoDetail} ({geo}) → {faces.toLocaleString()} faces · {(faces - data.length).toLocaleString()} empty
      </div>
      <div style={{ flex: 1 }}>
        <ThreeCompanyDie {...args} data={data} geometry={geo} detail={autoDetail} />
      </div>
    </div>
  )
}

export const FitToData: Story = {
  render: (args) => <FitToDataWrapper {...args} />,
  args: { geometry: 'octahedron', labelContent: 'name', autoRotate: false },
}

/**
 * All companies on one shape.
 * Uses the minimum detail to fit the full dataset — for the 99-company fallback
 * this will be icosahedron detail=2 (180 faces, 81 empty).
 * For the live ~3 300-company NASDAQ feed it uses detail=12 (3 380 faces, ~80 empty).
 * Zoom in to read individual names.
 */
function AllCompaniesWrapper(args: React.ComponentProps<typeof ThreeCompanyDie> & { data?: NasdaqStock[] }) {
  const { data, loading, error } = useNasdaqData()
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#60a5fa', fontFamily: 'monospace' }}>Loading NASDAQ data…</p>
      </div>
    )
  }
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  const autoDetail = minDetailFor('icosahedron', data.length)
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ThreeCompanyDie {...args} data={data} geometry="icosahedron" detail={autoDetail} />
    </div>
  )
}

export const AllCompanies: Story = {
  render: (args) => <AllCompaniesWrapper {...args} />,
  args: { labelContent: 'name', autoRotate: false },
}
