import type { Meta, StoryObj } from '@storybook/react'
import { ThreeCompanyCloud } from './ThreeCompanyCloud'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof ThreeCompanyCloud> = {
  title: 'Three / CompanyCloud',
  component: ThreeCompanyCloud,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'NASDAQ companies as a **3D point cloud** using Three.js (via React Three Fiber). ' +
          'Each sphere is coloured by the first letter of its ticker symbol. ' +
          'Drag to orbit, scroll to zoom. Hover any sphere to see the full company name. ' +
          'Enable **showLabels** to overlay ticker symbols (best with limit ≤ 100). ' +
          'This is the simplest layout — useful as a baseline before adding geometry.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 300, step: 10 } },
    autoRotate: { control: 'boolean' },
    rotationSpeed: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
    showLabels: { control: 'boolean' },
    labelContent: { control: 'radio', options: ['symbol', 'name'] },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeCompanyCloud>

function CloudWithData(args: React.ComponentProps<typeof ThreeCompanyCloud>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <ThreeCompanyCloud {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <CloudWithData {...args} />,
  args: { limit: 200, autoRotate: true, rotationSpeed: 0.3, showLabels: false, width: 700, height: 500 },
}

export const WithLabels: Story = {
  render: (args) => <CloudWithData {...args} />,
  args: { limit: 80, autoRotate: true, rotationSpeed: 0.2, showLabels: true, labelContent: 'symbol', width: 700, height: 500 },
}

function FullScreenCloudWithData(args: React.ComponentProps<typeof ThreeCompanyCloud>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af', fontFamily: 'monospace' }}>Loading NASDAQ data…</p>
      </div>
    )
  }
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <ThreeCompanyCloud {...args} data={data} width="100vw" height="100vh" />
}

export const FullScreenNames: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => <FullScreenCloudWithData {...args} />,
  args: { limit: 120, autoRotate: true, rotationSpeed: 0.2, showLabels: true, labelContent: 'name' },
}
