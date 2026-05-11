import type { Meta, StoryObj } from '@storybook/react'
import { D3Treemap } from './D3Treemap'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3Treemap> = {
  title: 'D3 / Treemap',
  component: D3Treemap,
  parameters: {
    docs: {
      description: {
        component:
          'Treemap where tile area represents the number of companies per group. ' +
          'Groups are either **first letter** of ticker or **market category** (Q = NASDAQ Global Select, ' +
          'G = NASDAQ Global Market, S = NASDAQ Capital Market).',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 100, max: 3000, step: 100 } },
    groupBy: { control: 'radio', options: ['letter', 'marketCategory'] },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 900, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3Treemap>

function TreemapWithData(args: React.ComponentProps<typeof D3Treemap>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3Treemap {...args} data={data} />
}

export const ByLetter: Story = {
  render: (args) => <TreemapWithData {...args} />,
  args: {
    limit: 500,
    groupBy: 'letter',
    width: 700,
    height: 500,
  },
}

export const ByMarketCategory: Story = {
  render: (args) => <TreemapWithData {...args} />,
  args: {
    limit: 500,
    groupBy: 'marketCategory',
    width: 700,
    height: 500,
  },
}
