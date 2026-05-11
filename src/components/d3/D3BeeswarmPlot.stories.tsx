import type { Meta, StoryObj } from '@storybook/react'
import { D3BeeswarmPlot } from './D3BeeswarmPlot'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3BeeswarmPlot> = {
  title: 'D3 / BeeswarmPlot',
  component: D3BeeswarmPlot,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Beeswarm (strip) plot where each dot is a NASDAQ company. ' +
          'The x-axis encodes a length metric; dots are spread vertically using a force collision ' +
          'simulation so they never overlap. ' +
          '**symbolLength** clusters tightly at 4–5 characters with visible outliers at 1 and 6+. ' +
          '**nameLength** shows the full right-skewed distribution of company-name lengths. ' +
          'Dots are coloured by the first letter of their ticker symbol. ' +
          'Keep limit ≤ 400 — the force simulation is synchronous.',
      },
    },
  },
  argTypes: {
    metric: { control: 'radio', options: ['symbolLength', 'nameLength'] },
    limit: { control: { type: 'range', min: 50, max: 500, step: 50 } },
    width: { control: { type: 'range', min: 400, max: 1400, step: 50 } },
    height: { control: { type: 'range', min: 200, max: 600, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3BeeswarmPlot>

function BeeswarmWithData(args: React.ComponentProps<typeof D3BeeswarmPlot>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3BeeswarmPlot {...args} data={data} />
}

export const BySymbolLength: Story = {
  render: (args) => <BeeswarmWithData {...args} />,
  args: { metric: 'symbolLength', limit: 300, width: 780, height: 300 },
}

export const ByNameLength: Story = {
  render: (args) => <BeeswarmWithData {...args} />,
  args: { metric: 'nameLength', limit: 300, width: 780, height: 300 },
}
