import type { Meta, StoryObj } from '@storybook/react'
import { D3Heatmap } from './D3Heatmap'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3Heatmap> = {
  title: 'D3 / Heatmap',
  component: D3Heatmap,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Two-dimensional count heatmap. Cell colour intensity encodes the number of companies. ' +
          '**letter × symbolLength** shows which letters produce longer/shorter tickers. ' +
          '**letter × etf** reveals how many ETFs start with each letter. ' +
          '**marketCategory × etf** gives a clean 3×2 grid of NASDAQ-tier vs ETF status.',
      },
    },
  },
  argTypes: {
    xGroup: { control: 'radio', options: ['letter', 'marketCategory'] },
    yGroup: { control: 'radio', options: ['symbolLength', 'etf'] },
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 1400, step: 50 } },
    height: { control: { type: 'range', min: 200, max: 700, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3Heatmap>

function HeatmapWithData(args: React.ComponentProps<typeof D3Heatmap>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3Heatmap {...args} data={data} />
}

export const LetterBySymbolLength: Story = {
  render: (args) => <HeatmapWithData {...args} />,
  args: { xGroup: 'letter', yGroup: 'symbolLength', limit: 2000, width: 780, height: 380 },
}

export const LetterByEtf: Story = {
  render: (args) => <HeatmapWithData {...args} />,
  args: { xGroup: 'letter', yGroup: 'etf', limit: 2000, width: 780, height: 280 },
}

export const MarketCategoryByEtf: Story = {
  render: (args) => <HeatmapWithData {...args} />,
  args: { xGroup: 'marketCategory', yGroup: 'etf', limit: 2000, width: 600, height: 280 },
}
