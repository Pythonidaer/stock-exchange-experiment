import type { Meta, StoryObj } from '@storybook/react'
import { D3BarChart } from './D3BarChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3BarChart> = {
  title: 'D3 / BarChart',
  component: D3BarChart,
  parameters: {
    docs: {
      description: {
        component:
          'Bar chart showing the count of NASDAQ-listed companies by first letter of ticker symbol or company name. ' +
          'A–Z are the categories. Use the **groupBy** control to switch between grouping by symbol vs. name.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 50, max: 3000, step: 50 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 200, max: 800, step: 50 } },
    groupBy: { control: 'radio', options: ['symbol', 'name'] },
  },
}

export default meta
type Story = StoryObj<typeof D3BarChart>

function BarChartWithData(args: React.ComponentProps<typeof D3BarChart>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3BarChart {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <BarChartWithData {...args} />,
  args: {
    limit: 500,
    groupBy: 'symbol',
    width: 700,
    height: 400,
  },
}

export const GroupByName: Story = {
  render: (args) => <BarChartWithData {...args} />,
  args: {
    limit: 500,
    groupBy: 'name',
    width: 700,
    height: 400,
  },
}
