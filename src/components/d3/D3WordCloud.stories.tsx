import type { Meta, StoryObj } from '@storybook/react'
import { D3WordCloud } from './D3WordCloud'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof D3WordCloud> = {
  title: 'D3 / WordCloud',
  component: D3WordCloud,
  parameters: {
    docs: {
      description: {
        component:
          'Word cloud extracted from NASDAQ company names. Noise words such as ' +
          '"Inc", "Corp", "Holdings", "Ltd", etc. are removed. ' +
          'Word size encodes frequency — bigger words appear in more company names. ' +
          'Words are placed using an Archimedean spiral from the centre outward. ' +
          'Increase **maxWords** to see rarer terms; decrease for a cleaner cloud.',
      },
    },
  },
  argTypes: {
    maxWords: { control: { type: 'range', min: 10, max: 100, step: 5 } },
    limit: { control: { type: 'range', min: 100, max: 5000, step: 100 } },
    width: { control: { type: 'range', min: 400, max: 1200, step: 50 } },
    height: { control: { type: 'range', min: 300, max: 800, step: 50 } },
  },
}

export default meta
type Story = StoryObj<typeof D3WordCloud>

function WordCloudWithData(args: React.ComponentProps<typeof D3WordCloud>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p style={{ fontFamily: 'sans-serif' }}>Loading NASDAQ data…</p>
  if (error) return <p style={{ fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</p>
  return <D3WordCloud {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <WordCloudWithData {...args} />,
  args: { maxWords: 60, limit: 2000, width: 700, height: 480 },
}

export const TopWords: Story = {
  render: (args) => <WordCloudWithData {...args} />,
  args: { maxWords: 30, limit: 2000, width: 700, height: 400 },
}
