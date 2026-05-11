import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

interface GroupNode {
  name: string
  children: { name: string; value: number }[]
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

/**
 * D3PackedCircles
 *
 * Uses D3's circle-packing layout. Companies are grouped by the first letter of
 * their ticker symbol. Each outer circle represents a letter group; inner circles
 * represent individual companies (sized by name length + constant).
 *
 * Performance note: defaults to 200 companies because packing many small circles
 * is expensive to render.
 */
export function D3PackedCircles({ data, limit = 200, width = 700, height = 700 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const hierarchy = useMemo<GroupNode>(() => {
    const slice = data.slice(0, limit)
    const map = new Map<string, { name: string; value: number }[]>()
    for (const stock of slice) {
      const letter = stock.symbol.charAt(0).toUpperCase()
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push({ name: stock.symbol, value: stock.name.length + 5 })
    }
    return {
      name: 'root',
      children: Array.from(map.entries()).map(([name, children]) => ({ name, children })),
    }
  }, [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!hierarchy.children.length) return

    svg.attr('width', width).attr('height', height)

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    const root = d3
      .hierarchy(hierarchy)
      .sum((d) => (d as unknown as { value?: number }).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.pack<GroupNode>().size([width, height]).padding(4)(root)

    // Draw all circles
    svg
      .selectAll('circle')
      .data(root.descendants())
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r)
      .attr('fill', (d) => {
        if (d.depth === 0) return 'none'
        const groupName = d.depth === 1 ? d.data.name : (d.parent?.data.name ?? '')
        return d.depth === 1
          ? color(groupName) + '33'
          : color(groupName)
      })
      .attr('stroke', (d) => (d.depth === 1 ? color(d.data.name) : 'none'))
      .attr('stroke-width', (d) => (d.depth === 1 ? 1.5 : 0))
      .attr('fill-opacity', (d) => (d.depth === 2 ? 0.8 : 1))

    // Letter group labels on depth-1 circles
    svg
      .selectAll('text.group')
      .data(root.descendants().filter((d) => d.depth === 1))
      .join('text')
      .attr('class', 'group')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y - d.r + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 13)
      .attr('font-weight', 'bold')
      .attr('fill', (d) => color(d.data.name))
      .text((d) => d.data.name)

    // Ticker labels only on large-enough leaf nodes
    svg
      .selectAll('text.leaf')
      .data(root.leaves().filter((d) => d.r > 10))
      .join('text')
      .attr('class', 'leaf')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d) => Math.min(d.r * 0.6, 10))
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => d.data.name)
  }, [hierarchy, width, height])

  return <svg ref={svgRef} />
}
