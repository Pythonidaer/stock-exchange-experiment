import type { Meta, StoryObj } from '@storybook/react'
import { ThreeLODCompanyLabels } from './ThreeLODCompanyLabels'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof ThreeLODCompanyLabels> = {
  title: 'Three / LODCompanyLabels',
  component: ThreeLODCompanyLabels,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Level-of-detail (LOD) label demo. Companies are arranged in a **3D grid**. ' +
          'Label detail switches automatically based on camera distance: ' +
          '**far** = coloured dot only, **medium** = ticker symbol, **close** = ticker + company name. ' +
          'Use **scroll / pinch** to zoom in and out to observe the transitions. ' +
          'This is useful for any visualization that needs to scale from thousands of companies ' +
          'down to readable detail for a single company. ' +
          'LOD is implemented per-company using `useFrame` + `camera.position.distanceTo()`.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 300, step: 10 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 700, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof ThreeLODCompanyLabels>

function LodWithData(args: React.ComponentProps<typeof ThreeLODCompanyLabels>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <ThreeLODCompanyLabels {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <LodWithData {...args} />,
  args: { limit: 250, width: 700, height: 500 },
}

export const Dense: Story = {
  render: (args) => <LodWithData {...args} />,
  args: { limit: 150, width: 700, height: 500 },
}
