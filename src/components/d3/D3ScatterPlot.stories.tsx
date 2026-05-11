import type { Meta, StoryObj } from '@storybook/react'
import { D3ScatterPlot } from './D3ScatterPlot'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3ScatterPlot> = {
  title: 'D3 / ScatterPlot',
  component: D3ScatterPlot,
  parameters: {
    docs: {
      description: {
        component:
          'Scatter plot using placeholder metrics: **x = ticker symbol length**, **y = company name length**. ' +
          'This gives a clear visual spread useful for validating layout behaviour before real price or volume ' +
          'data is connected. Dots are coloured by first letter of ticker symbol.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 50, max: 1000, step: 50 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3ScatterPlot>

function ScatterPlotWithData(args: React.ComponentProps<typeof D3ScatterPlot>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3ScatterPlot {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <ScatterPlotWithData {...args} />,
  args: {
    limit: 300,
    width: 700,
    height: 500,
  },
}
