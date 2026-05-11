import type { Meta, StoryObj } from '@storybook/react'
import { D3VoronoiDiagram } from './D3VoronoiDiagram'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3VoronoiDiagram> = {
  title: 'D3 / VoronoiDiagram',
  component: D3VoronoiDiagram,
  parameters: {
    docs: {
      description: {
        component:
          'Voronoi diagram using D3 Delaunay triangulation. Each company is a point at a ' +
          'deterministic position: **x = hash of ticker symbol**, **y = company-name length**. ' +
          'Each Voronoi cell represents the region closest to that company\'s point. ' +
          'Cells are coloured by the first letter of the ticker. ' +
          'Ticker labels appear automatically when limit ≤ 80. ' +
          'This visualisation works best for exploring spatial structure and neighbour relationships.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 400, step: 20 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 900, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3VoronoiDiagram>

function VoronoiWithData(args: React.ComponentProps<typeof D3VoronoiDiagram>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3VoronoiDiagram {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <VoronoiWithData {...args} />,
  args: { limit: 200, width: 700, height: 550 },
}

export const SmallWithLabels: Story = {
  render: (args) => <VoronoiWithData {...args} />,
  args: { limit: 60, width: 700, height: 550 },
}
