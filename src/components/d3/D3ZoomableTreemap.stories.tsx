import type { Meta, StoryObj } from '@storybook/react'
import { D3ZoomableTreemap } from './D3ZoomableTreemap'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3ZoomableTreemap> = {
  title: 'D3 / ZoomableTreemap',
  component: D3ZoomableTreemap,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Click-to-drill-down treemap with a three-level hierarchy: ' +
          '**NASDAQ (root) → Market Category → First Letter of Ticker**. ' +
          'Tile area encodes company count at every level. ' +
          'Click any tile to zoom into its children. ' +
          'Use the **← back** button or breadcrumb to navigate up.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3ZoomableTreemap>

function ZoomableTreemapWithData(args: React.ComponentProps<typeof D3ZoomableTreemap>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3ZoomableTreemap {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <ZoomableTreemapWithData {...args} />,
  args: { limit: 1000, width: 700, height: 500 },
}
