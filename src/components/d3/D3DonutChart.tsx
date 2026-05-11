import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { type GroupByKey, countByGroupKey } from '../../data/groupUtils'

export type { GroupByKey }

interface Props {
  data: NasdaqStock[]
  limit?: number
  groupBy?: GroupByKey
  width?: number
  height?: number
}

/**
 * D3DonutChart
 *
 * Donut (ring) chart showing the share of companies in each group.
 * Supports four grouping strategies:
 *   - letter        — first letter of ticker symbol
 *   - marketCategory — NASDAQ tier (Global Select, Global Market, Capital Market)
 *   - etf           — ETF vs. Common Stock
 *   - financialStatus — Normal, Deficient, etc.
 *
 * Market-category and ETF groupings give the clearest slices;
 * letter grouping produces 26 slices.
 */
export function D3DonutChart({
  data,
  limit = 1000,
  groupBy = 'marketCategory',
  width = 600,
  height = 500,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const slices = useMemo(
    () => countByGroupKey(data.slice(0, limit), groupBy),
    [data, limit, groupBy],
  )

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!slices.length) return

    const cx = width / 2
    const cy = height / 2
    const outerR = Math.min(cx, cy) - 60
    const innerR = outerR * 0.55

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Donut chart grouped by ${groupBy}`)

    svg.append('title').text(`NASDAQ companies grouped by ${groupBy}`)

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(slices.map((d) => d.key))

    const pie = d3.pie<{ key: string; count: number }>()
      .value((d) => d.count)
      .sort(null)

    const arc = d3.arc<d3.PieArcDatum<{ key: string; count: number }>>()
      .innerRadius(innerR)
      .outerRadius(outerR)

    const labelArc = d3.arc<d3.PieArcDatum<{ key: string; count: number }>>()
      .innerRadius(outerR + 10)
      .outerRadius(outerR + 10)

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

    const arcs = pie(slices)

    g.selectAll('path')
      .data(arcs)
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => color(d.data.key))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .append('title')
      .text((d) => `${d.data.key}: ${d.data.count.toLocaleString()} companies`)

    // Only label arcs large enough to hold text (> 4% of circle)
    const total = slices.reduce((s, d) => s + d.count, 0)
    g.selectAll('text.label')
      .data(arcs.filter((d) => d.data.count / total > 0.04))
      .join('text')
      .attr('class', 'label')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#333')
      .text((d) => d.data.key)

    // Centre annotation
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.4em')
      .attr('font-size', 22)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(total.toLocaleString())

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('font-size', 12)
      .attr('fill', '#888')
      .text('companies')
  }, [slices, groupBy, width, height])

  return <svg ref={svgRef} />
}
