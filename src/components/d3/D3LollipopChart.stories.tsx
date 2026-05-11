import type { Meta, StoryObj } from '@storybook/react'
import { D3LollipopChart } from './D3LollipopChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3LollipopChart> = {
  title: 'D3 / LollipopChart',
  component: D3LollipopChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horizontal lollipop chart (dot + stem) showing the top N groups by company count. ' +
          'Cleaner than a bar chart for category comparisons. ' +
          '**letter** shows which ticker first-letters dominate NASDAQ listings (expect C, A, P to be high). ' +
          '**marketCategory** shows the three NASDAQ tiers. ' +
          '**etf** and **financialStatus** give a quick classification overview.',
      },
    },
  },
  argTypes: {
    groupBy: { control: 'select', options: ['letter', 'marketCategory', 'etf', 'financialStatus'] },
    topN: { control: { type: 'range', min: 5, max: 26, step: 1 } },
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 200, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3LollipopChart>

function LollipopWithData(args: React.ComponentProps<typeof D3LollipopChart>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3LollipopChart {...args} data={data} />
}

export const TopLetters: Story = {
  render: (args) => <LollipopWithData {...args} />,
  args: { groupBy: 'letter', topN: 20, limit: 2000, width: 700, height: 500 },
}

export const ByMarketCategory: Story = {
  render: (args) => <LollipopWithData {...args} />,
  args: { groupBy: 'marketCategory', topN: 5, limit: 2000, width: 600, height: 260 },
}

export const ByEtfStatus: Story = {
  render: (args) => <LollipopWithData {...args} />,
  args: { groupBy: 'etf', topN: 5, limit: 2000, width: 600, height: 200 },
}
