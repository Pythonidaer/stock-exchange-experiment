import type { Meta, StoryObj } from '@storybook/react'
import { D3Sankey } from './D3Sankey'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3Sankey> = {
  title: 'D3 / Sankey',
  component: D3Sankey,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sankey (flow/alluvial) diagram. Companies flow left-to-right through three stages: ' +
          '**Market Category** → **First Letter of Ticker** → **Stock Type** (ETF or Common Stock). ' +
          'Link width is proportional to company count. This shows which NASDAQ tiers contain which ' +
          'alphabetical clusters, and how ETFs distribute across them.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 500, max: 1400, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 1000, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3Sankey>

function SankeyWithData(args: React.ComponentProps<typeof D3Sankey>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3Sankey {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <SankeyWithData {...args} />,
  args: { limit: 1000, width: 800, height: 600 },
}
