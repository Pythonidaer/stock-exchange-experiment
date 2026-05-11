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
 * D3RadialChart
 *
 * Radial bar chart showing company counts grouped by first letter (A–Z).
 * Each slice of the circle represents a letter; bar length encodes count.
 */
export function D3RadialChart({ data, limit = 500, width = 600, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const counts = useMemo(() => {
    const slice = data.slice(0, limit)
    const map = new Map<string, number>()
    for (const stock of slice) {
      const letter = stock.symbol.charAt(0).toUpperCase()
      if (/[A-Z]/.test(letter)) {
        map.set(letter, (map.get(letter) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([letter, count]) => ({ letter, count }))
      .sort((a, b) => a.letter.localeCompare(b.letter))
  }, [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!counts.length) return

    const cx = width / 2
    const cy = height / 2
    const innerRadius = 60
    const outerRadius = Math.min(cx, cy) - 40

    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

    const x = d3
      .scaleBand()
      .domain(counts.map((d) => d.letter))
      .range([0, 2 * Math.PI])
      .align(0)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(counts, (d) => d.count) ?? 1])
      .range([innerRadius, outerRadius])

    const color = d3.scaleSequential(d3.interpolateCool).domain([0, counts.length - 1])

    g.selectAll('path')
      .data(counts)
      .join('path')
      .attr(
        'd',
        (d) =>
          d3
            .arc()({
              innerRadius,
              outerRadius: y(d.count),
              startAngle: x(d.letter) ?? 0,
              endAngle: (x(d.letter) ?? 0) + x.bandwidth(),
            }) ?? '',
      )
      .attr('fill', (_d, idx) => color(idx))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)

    // Letter labels at the outer edge
    g.selectAll('text')
      .data(counts)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#333')
      .attr('transform', (d) => {
        const angle = (x(d.letter) ?? 0) + x.bandwidth() / 2 - Math.PI / 2
        const r = outerRadius + 16
        return `translate(${Math.cos(angle) * r},${Math.sin(angle) * r})`
      })
      .text((d) => d.letter)
  }, [counts, width, height])

  return <svg ref={svgRef} />
}
