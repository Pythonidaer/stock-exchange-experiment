import type { Meta, StoryObj } from '@storybook/react'
import { D3Histogram } from './D3Histogram'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3Histogram> = {
  title: 'D3 / Histogram',
  component: D3Histogram,
  parameters: {
    docs: {
      description: {
        component:
          'Histogram of a string-length metric across all listed companies. ' +
          '**symbolLength** shows that most tickers are 4–5 characters. ' +
          '**nameLength** reveals a right-skewed distribution — most names are 15–40 chars ' +
          'but some reach 100+ characters.',
      },
    },
  },
  argTypes: {
    metric: { control: 'radio', options: ['symbolLength', 'nameLength'] },
    bins: { control: { type: 'range', min: 5, max: 60, step: 5 } },
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 200, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3Histogram>

function HistogramWithData(args: React.ComponentProps<typeof D3Histogram>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3Histogram {...args} data={data} />
}

export const SymbolLength: Story = {
  render: (args) => <HistogramWithData {...args} />,
  args: { metric: 'symbolLength', bins: 10, limit: 2000, width: 700, height: 400 },
}

export const NameLength: Story = {
  render: (args) => <HistogramWithData {...args} />,
  args: { metric: 'nameLength', bins: 30, limit: 2000, width: 700, height: 400 },
}
