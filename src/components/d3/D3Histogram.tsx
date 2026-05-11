import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type HistogramMetric = 'symbolLength' | 'nameLength'

interface Props {
  data: NasdaqStock[]
  limit?: number
  /** Which string-length metric to bin. */
  metric?: HistogramMetric
  /** Number of bins. */
  bins?: number
  width?: number
  height?: number
}

const METRIC_LABELS: Record<HistogramMetric, string> = {
  symbolLength: 'Ticker symbol length (characters)',
  nameLength: 'Company name length (characters)',
}

/**
 * D3Histogram
 *
 * Shows the distribution of a length-based metric across all listed companies.
 *   - symbolLength: most tickers are 1–5 chars; shows the clustering around 4–5
 *   - nameLength: company names range from ~4 to 100+ chars; right-skewed distribution
 */
export function D3Histogram({
  data,
  limit = 2000,
  metric = 'symbolLength',
  bins = 20,
  width = 700,
  height = 400,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const values = useMemo(
    () =>
      data
        .slice(0, limit)
        .map((s) => (metric === 'symbolLength' ? s.symbol.length : s.name.length)),
    [data, limit, metric],
  )

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!values.length) return

    const margin = { top: 20, right: 20, bottom: 50, left: 55 }
    const iw = width - margin.left - margin.right
    const ih = height - margin.top - margin.bottom

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Histogram of ${METRIC_LABELS[metric]}`)

    svg.append('title').text(`Distribution of ${METRIC_LABELS[metric]}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleLinear()
      .domain([d3.min(values) ?? 0, d3.max(values) ?? 1])
      .nice()
      .range([0, iw])

    const binner = d3.bin().domain(x.domain() as [number, number]).thresholds(bins)
    const buckets = binner(values)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(buckets, (b) => b.length) ?? 1])
      .nice()
      .range([ih, 0])

    g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(10))
    g.append('g').call(d3.axisLeft(y))

    // X axis label
    g.append('text')
      .attr('x', iw / 2)
      .attr('y', ih + 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#555')
      .text(METRIC_LABELS[metric])

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -ih / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#555')
      .text('Number of companies')

    g.selectAll('rect')
      .data(buckets)
      .join('rect')
      .attr('x', (b) => x(b.x0 ?? 0) + 1)
      .attr('width', (b) => Math.max(0, x(b.x1 ?? 0) - x(b.x0 ?? 0) - 1))
      .attr('y', (b) => y(b.length))
      .attr('height', (b) => ih - y(b.length))
      .attr('fill', '#5b9bd5')
      .attr('rx', 2)
      .append('title')
      .text((b) => `${b.x0}–${b.x1}: ${b.length} companies`)
  }, [values, metric, bins, width, height])

  return <svg ref={svgRef} />
}
