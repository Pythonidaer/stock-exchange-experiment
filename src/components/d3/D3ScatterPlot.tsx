import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

/**
 * D3ScatterPlot
 *
 * Plots each company as a dot where:
 *   x = ticker symbol length (1–6 characters)
 *   y = company name length
 *
 * This is a placeholder metric that gives a clear visual spread useful for
 * exploring layout behaviour before real financial data is wired in.
 */
export function D3ScatterPlot({ data, limit = 300, width = 700, height = 500 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const sliced = useMemo(() => data.slice(0, limit), [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!sliced.length) return

    const margin = { top: 20, right: 30, bottom: 50, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(sliced, (d) => d.symbol.length) ?? 10])
      .nice()
      .range([0, innerWidth])

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(sliced, (d) => d.name.length) ?? 100])
      .nice()
      .range([innerHeight, 0])

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(6))
    g.append('g').call(d3.axisLeft(y))

    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#555')
      .text('Ticker symbol length')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#555')
      .text('Company name length')

    g.selectAll('circle')
      .data(sliced)
      .join('circle')
      .attr('cx', (d) => x(d.symbol.length))
      .attr('cy', (d) => y(d.name.length))
      .attr('r', 4)
      .attr('fill', (d) => color(d.symbol.charAt(0)))
      .attr('fill-opacity', 0.65)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .append('title')
      .text((d) => `${d.symbol} — ${d.name}`)
  }, [sliced, width, height])

  return <svg ref={svgRef} />
}
