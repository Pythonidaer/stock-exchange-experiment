import type { Meta, StoryObj } from '@storybook/react'
import { D3PackedCircles } from './D3PackedCircles'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3PackedCircles> = {
  title: 'D3 / PackedCircles',
  component: D3PackedCircles,
  parameters: {
    docs: {
      description: {
        component:
          'Nested circle-packing layout. Outer circles are letter groups; inner circles are individual ' +
          'companies sized by company-name length. Labels appear inside circles large enough to contain them. ' +
          '**Keep limit ≤ 250** for good performance.',
      },
    },
  },
  argTypes: {
    limit: { control: { type: 'range', min: 20, max: 400, step: 20 } },
    width: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
    height: { control: { type: 'range', min: 400, max: 1000, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3PackedCircles>

function PackedCirclesWithData(args: React.ComponentProps<typeof D3PackedCircles>) {
  const { data, loading } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  return <D3PackedCircles {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <PackedCirclesWithData {...args} />,
  args: {
    limit: 200,
    width: 700,
    height: 700,
  },
}
