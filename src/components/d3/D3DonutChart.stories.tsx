import type { Meta, StoryObj } from '@storybook/react'
import { D3DonutChart } from './D3DonutChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3DonutChart> = {
  title: 'D3 / DonutChart',
  component: D3DonutChart,
  parameters: {
    docs: {
      description: {
        component:
          'Donut chart showing the share of NASDAQ-listed companies in each group. ' +
          '**marketCategory** (3 tiers) and **etf** (2 slices) give the clearest views. ' +
          '**letter** produces 26 slices — useful to see if listings are evenly distributed across the alphabet. ' +
          '**financialStatus** reveals how many companies are in non-Normal states.',
      },
    },
  },
  argTypes: {
    groupBy: { control: 'select', options: ['marketCategory', 'etf', 'financialStatus', 'letter'] },
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 300, max: 900, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3DonutChart>

function DonutChartWithData(args: React.ComponentProps<typeof D3DonutChart>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error} (using fallback data)</p>
  return <D3DonutChart {...args} data={data} />
}

export const ByMarketCategory: Story = {
  render: (args) => <DonutChartWithData {...args} />,
  args: { groupBy: 'marketCategory', limit: 1000, width: 600, height: 500 },
}

export const ByEtfStatus: Story = {
  render: (args) => <DonutChartWithData {...args} />,
  args: { groupBy: 'etf', limit: 1000, width: 600, height: 500 },
}

export const ByFirstLetter: Story = {
  render: (args) => <DonutChartWithData {...args} />,
  args: { groupBy: 'letter', limit: 1000, width: 700, height: 600 },
}

export const ByFinancialStatus: Story = {
  render: (args) => <DonutChartWithData {...args} />,
  args: { groupBy: 'financialStatus', limit: 1000, width: 600, height: 500 },
}
