import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type GroupByField = 'symbol' | 'name'

interface Props {
  data: NasdaqStock[]
  /** Limit how many stocks are included before grouping. */
  limit?: number
  /** Group companies by the first letter of symbol or name. */
  groupBy?: GroupByField
  width?: number
  height?: number
}

/**
 * D3BarChart
 *
 * Counts how many companies start with each letter (A–Z) and renders a bar chart.
 * The `groupBy` prop switches between grouping by ticker symbol vs. company name.
 */
export function D3BarChart({
  data,
  limit = 500,
  groupBy = 'symbol',
  width = 700,
  height = 400,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const counts = useMemo(() => {
    const slice = data.slice(0, limit)
    const map = new Map<string, number>()
    for (const stock of slice) {
      const raw = groupBy === 'symbol' ? stock.symbol : stock.name
      const letter = raw.charAt(0).toUpperCase()
      if (/[A-Z]/.test(letter)) {
        map.set(letter, (map.get(letter) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([letter, count]) => ({ letter, count }))
      .sort((a, b) => a.letter.localeCompare(b.letter))
  }, [data, limit, groupBy])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 50 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleBand()
      .domain(counts.map((d) => d.letter))
      .range([0, innerWidth])
      .padding(0.2)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(counts, (d) => d.count) ?? 1])
      .nice()
      .range([innerHeight, 0])

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))

    g.append('g').call(d3.axisLeft(y))

    g.selectAll('rect')
      .data(counts)
      .join('rect')
      .attr('x', (d) => x(d.letter) ?? 0)
      .attr('y', (d) => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d) => innerHeight - y(d.count))
      .attr('fill', '#4f86c6')
      .attr('rx', 2)

    // Value labels on top of each bar
    g.selectAll('text.label')
      .data(counts)
      .join('text')
      .attr('class', 'label')
      .attr('x', (d) => (x(d.letter) ?? 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.count) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#333')
      .text((d) => d.count)
  }, [counts, width, height])

  return <svg ref={svgRef} />
}
