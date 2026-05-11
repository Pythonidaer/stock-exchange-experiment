import type { Meta, StoryObj } from '@storybook/react'
import { D3ForceGraph } from './D3ForceGraph'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3ForceGraph> = {
  title: 'D3 / ForceGraph',
  component: D3ForceGraph,
  parameters: {
    docs: {
      description: {
        component:
          'Force-directed graph where each node is a company. Nodes cluster toward invisible anchors ' +
          'representing letter groups or market categories. Useful for visualising structural patterns in the listing. ' +
          '**Keep limit ≤ 200** for a smooth simulation.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 300, step: 10 } },
    groupBy: { control: 'radio', options: ['letter', 'marketCategory'] },
    width: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
    height: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3ForceGraph>

function ForceGraphWithData(args: React.ComponentProps<typeof D3ForceGraph>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3ForceGraph {...args} data={data} />
}

export const ByLetter: Story = {
  render: (args) => <ForceGraphWithData {...args} />,
  args: {
    limit: 150,
    groupBy: 'letter',
    width: 700,
    height: 600,
  },
}

export const ByMarketCategory: Story = {
  render: (args) => <ForceGraphWithData {...args} />,
  args: {
    limit: 150,
    groupBy: 'marketCategory',
    width: 700,
    height: 600,
  },
}
