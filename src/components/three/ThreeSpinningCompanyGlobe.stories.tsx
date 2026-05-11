import type { Meta, StoryObj } from '@storybook/react'
import { ThreeSpinningCompanyGlobe } from './ThreeSpinningCompanyGlobe'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof ThreeSpinningCompanyGlobe> = {
  title: 'Three / SpinningCompanyGlobe',
  component: ThreeSpinningCompanyGlobe,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'NASDAQ companies placed on a **spinning globe** using the Fibonacci sphere layout — ' +
          'the most uniform deterministic distribution on a sphere surface. ' +
          'Each company is a pin with a ticker label that auto-billboards to face the camera. ' +
          'The globe itself is a semi-transparent sphere with a lat/lon wireframe grid. ' +
          'Drag to orbit, scroll to zoom, hover any pin for the company name. ' +
          'This is the "globe variant" of the company die concept.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 250, step: 10 } },
    autoRotate: { control: 'boolean' },
    rotationSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.05 } },
    showLabels: { control: 'boolean' },
    width: { control: { type: 'range', min: 300, max: 1000, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeSpinningCompanyGlobe>

function GlobeWithData(args: React.ComponentProps<typeof ThreeSpinningCompanyGlobe>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <ThreeSpinningCompanyGlobe {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <GlobeWithData {...args} />,
  args: { limit: 150, autoRotate: true, rotationSpeed: 0.25, showLabels: true, width: 650, height: 600 },
}

export const Slow: Story = {
  render: (args) => <GlobeWithData {...args} />,
  args: { limit: 100, autoRotate: true, rotationSpeed: 0.1, showLabels: true, width: 650, height: 600 },
}
