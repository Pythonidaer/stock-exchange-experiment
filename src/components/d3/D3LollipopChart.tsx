import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { type GroupByKey, countByGroupKey } from '../../data/groupUtils'

export type { GroupByKey }

interface Props {
  data: NasdaqStock[]
  limit?: number
  groupBy?: GroupByKey
  /** How many top groups to show. */
  topN?: number
  width?: number
  height?: number
}

/**
 * D3LollipopChart
 *
 * Horizontal lollipop chart (dot on a stem) showing the top N groups by
 * company count. Cleaner than a bar chart when comparing many categories.
 *
 * Useful groupings:
 *   - letter        — which letters have the most listings?
 *   - marketCategory — breakdown across NASDAQ tiers
 *   - etf / financialStatus — quick overview of stock classification
 */
export function D3LollipopChart({
  data,
  limit = 2000,
  groupBy = 'letter',
  topN = 20,
  width = 700,
  height = 500,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const items = useMemo(
    () => countByGroupKey(data.slice(0, limit), groupBy).slice(0, topN),
    [data, limit, groupBy, topN],
  )

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!items.length) return

    const margin = { top: 20, right: 40, bottom: 20, left: 160 }
    const iw = width - margin.left - margin.right
    const ih = height - margin.top - margin.bottom

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Top ${topN} groups by company count, grouped by ${groupBy}`)

    svg.append('title').text(`Top ${topN} NASDAQ groups by company count (${groupBy})`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const y = d3
      .scaleBand()
      .domain(items.map((d) => d.key))
      .range([0, ih])
      .padding(0.4)

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(items, (d) => d.count) ?? 1])
      .nice()
      .range([0, iw])

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    g.append('g').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove()

    g.append('g')
      .attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(6))
      .select('.domain').remove()

    // Grid lines
    g.selectAll('line.grid')
      .data(x.ticks(6))
      .join('line')
      .attr('class', 'grid')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', ih)
      .attr('stroke', '#e8e8e8')
      .attr('stroke-width', 1)

    // Stems (lines from 0 to dot)
    g.selectAll('line.stem')
      .data(items)
      .join('line')
      .attr('class', 'stem')
      .attr('x1', 0)
      .attr('x2', (d) => x(d.count))
      .attr('y1', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2)
      .attr('y2', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2)
      .attr('stroke', (d) => color(d.key))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)

    // Dots
    g.selectAll('circle')
      .data(items)
      .join('circle')
      .attr('cx', (d) => x(d.count))
      .attr('cy', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2)
      .attr('r', 7)
      .attr('fill', (d) => color(d.key))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .append('title')
      .text((d) => `${d.key}: ${d.count.toLocaleString()} companies`)

    // Count labels to the right of each dot
    g.selectAll('text.count')
      .data(items)
      .join('text')
      .attr('class', 'count')
      .attr('x', (d) => x(d.count) + 12)
      .attr('y', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#444')
      .text((d) => d.count.toLocaleString())
  }, [items, groupBy, topN, width, height])

  return <svg ref={svgRef} />
}
