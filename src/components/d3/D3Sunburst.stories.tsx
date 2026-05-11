import type { Meta, StoryObj } from '@storybook/react'
import { D3Sunburst } from './D3Sunburst'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3Sunburst> = {
  title: 'D3 / Sunburst',
  component: D3Sunburst,
  parameters: {
    docs: {
      description: {
        component:
          'Radial partition (sunburst) chart. The **inner ring** shows NASDAQ market tiers ' +
          '(Global Select, Global Market, Capital Market). The **outer ring** shows the first-letter ' +
          'breakdown within each tier. Arc area is proportional to company count. ' +
          'Hover over any arc to see the exact count.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 300, max: 900, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 900, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3Sunburst>

function SunburstWithData(args: React.ComponentProps<typeof D3Sunburst>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3Sunburst {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <SunburstWithData {...args} />,
  args: { limit: 1000, width: 600, height: 600 },
}
