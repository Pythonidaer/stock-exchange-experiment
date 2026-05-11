import type { Meta, StoryObj } from '@storybook/react'
import { D3BubbleChart } from './D3BubbleChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3BubbleChart> = {
  title: 'D3 / BubbleChart',
  component: D3BubbleChart,
  parameters: {
    docs: {
      description: {
        component:
          'Circle-packed bubble chart. Each bubble is a NASDAQ company; bubble radius is proportional to ' +
          'company name length (placeholder metric). Bubbles are coloured by the first letter of their ticker. ' +
          '**Keep limit ≤ 200** to avoid browser slowdown.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 300, step: 10 } },
    width: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
    height: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3BubbleChart>

function BubbleChartWithData(args: React.ComponentProps<typeof D3BubbleChart>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3BubbleChart {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <BubbleChartWithData {...args} />,
  args: {
    limit: 150,
    width: 700,
    height: 600,
  },
}
