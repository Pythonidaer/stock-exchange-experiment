import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

interface Props {
  data: NasdaqStock[]
  /** Recommended: keep ≤ 200 to avoid browser slowdown. */
  limit?: number
  width?: number
  height?: number
}

/**
 * D3BubbleChart
 *
 * Renders each company as a bubble. Bubble radius is proportional to the
 * company-name length (a placeholder metric). Each bubble is labelled with
 * the ticker symbol. Bubbles are packed using d3.pack.
 */
export function D3BubbleChart({ data, limit = 150, width = 700, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const sliced = useMemo(() => data.slice(0, limit), [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (!sliced.length) return

    svg.attr('width', width).attr('height', height)

    const root = d3
      .hierarchy({ children: sliced } as d3.HierarchyNode<{ children: NasdaqStock[] }>)
      .sum((d) => {
        const stock = d as unknown as NasdaqStock
        return stock.name ? stock.name.length + 5 : 10
      })

    d3.pack<{ children: NasdaqStock[] }>()
      .size([width, height])
      .padding(3)(root)

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    const node = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    node
      .append('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => color((d.data as unknown as NasdaqStock).symbol.charAt(0)))
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)

    // Only show labels for bubbles large enough to hold text
    node
      .filter((d) => d.r > 14)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d) => Math.min(d.r / 2.5, 12))
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => (d.data as unknown as NasdaqStock).symbol)

    node.append('title').text((d) => {
      const s = d.data as unknown as NasdaqStock
      return `${s.symbol}\n${s.name}`
    })
  }, [sliced, width, height])

  return <svg ref={svgRef} />
}
