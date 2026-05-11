import type { Meta, StoryObj } from '@storybook/react'
import { ThreeConvexCompanyHull } from './ThreeConvexCompanyHull'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof ThreeConvexCompanyHull> = {
  title: 'Three / ConvexCompanyHull',
  component: ThreeConvexCompanyHull,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A **convex hull geometry** built directly from stock-data-derived 3D coordinates. ' +
          'Each company maps to a point: x = symbol hash, y = name length, z = combined hash. ' +
          'The hull wraps around the outermost points — the shape itself encodes the data distribution. ' +
          'Ticker labels sit at each input point, just outside the surface. ' +
          'This explores whether a data-derived convex hull is visually useful as a "company die." ' +
          'Uses `ConvexGeometry` from `three/examples/jsm`.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 10, max: 120, step: 5 } },
    showLabels: { control: 'boolean' },
    autoRotate: { control: 'boolean' },
    rotationSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
    width: { control: { type: 'range', min: 300, max: 900, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeConvexCompanyHull>

function HullWithData(args: React.ComponentProps<typeof ThreeConvexCompanyHull>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <ThreeConvexCompanyHull {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <HullWithData {...args} />,
  args: { limit: 80, showLabels: true, autoRotate: true, rotationSpeed: 0.3, width: 650, height: 550 },
}

export const DenseHull: Story = {
  render: (args) => <HullWithData {...args} />,
  args: { limit: 120, showLabels: false, autoRotate: true, rotationSpeed: 0.25, width: 650, height: 550 },
}
