import type { Meta, StoryObj } from '@storybook/react'
import { D3RadialChart } from './D3RadialChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3RadialChart> = {
  title: 'D3 / RadialChart',
  component: D3RadialChart,
  parameters: {
    docs: {
      description: {
        component:
          'Radial bar chart arranged in a circle. Each bar represents a letter A–Z; bar length encodes ' +
          'the count of companies whose ticker starts with that letter. Coloured with a cool sequential palette.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 100, max: 3000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 900, step: 50 } },
    height: { control: { type: 'range', min: 400, max: 900, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3RadialChart>

function RadialChartWithData(args: React.ComponentProps<typeof D3RadialChart>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3RadialChart {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <RadialChartWithData {...args} />,
  args: {
    limit: 500,
    width: 600,
    height: 600,
  },
}
