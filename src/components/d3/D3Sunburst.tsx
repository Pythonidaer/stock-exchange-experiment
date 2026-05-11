import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { MARKET_CATEGORY_LABELS } from '../../data/groupUtils'

interface TreeNode {
  name: string
  value?: number
  children?: TreeNode[]
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

/**
 * D3Sunburst
 *
 * Radial partition chart showing a two-level hierarchy:
 *   root → market category → first letter of ticker
 *
 * Inner ring = NASDAQ tier (Global Select, Global Market, Capital Market).
 * Outer ring = first letter within each tier.
 * Arc area encodes the count of companies.
 */
export function D3Sunburst({ data, limit = 1000, width = 600, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const treeData = useMemo<TreeNode>(() => {
    const slice = data.slice(0, limit)
    // Build nested map: marketCategory → letter → count
    const outer = new Map<string, Map<string, number>>()
    for (const stock of slice) {
      const cat = MARKET_CATEGORY_LABELS[stock.marketCategory] ?? stock.marketCategory ?? 'Other'
      const letter = stock.symbol.charAt(0).toUpperCase()
      if (!outer.has(cat)) outer.set(cat, new Map())
      const inner = outer.get(cat)!
      inner.set(letter, (inner.get(letter) ?? 0) + 1)
    }
    return {
      name: 'NASDAQ',
      children: Array.from(outer.entries()).map(([cat, letters]) => ({
        name: cat,
        children: Array.from(letters.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([letter, count]) => ({ name: letter, value: count })),
      })),
    }
  }, [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const radius = Math.min(width, height) / 2

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Sunburst chart: market category → first letter')

    svg.append('title').text('NASDAQ companies: market category → first letter of ticker')

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)

    const root = d3
      .hierarchy<TreeNode>(treeData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const partitioned = d3
      .partition<TreeNode>()
      .size([2 * Math.PI, radius])(root) as d3.HierarchyRectangularNode<TreeNode>

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    const arc = d3
      .arc<d3.HierarchyRectangularNode<TreeNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 - 1)

    g.selectAll('path')
      .data(partitioned.descendants().filter((d) => d.depth > 0))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => {
        // Walk up to depth-1 ancestor to get the category colour
        let node: d3.HierarchyRectangularNode<TreeNode> = d
        while (node.depth > 1) node = node.parent as d3.HierarchyRectangularNode<TreeNode>
        return color(node.data.name)
      })
      .attr('fill-opacity', (d) => (d.depth === 1 ? 0.9 : 0.65))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .append('title')
      .text((d) =>
        d.ancestors()
          .reverse()
          .map((n) => n.data.name)
          .join(' › ') + `\n${d.value?.toLocaleString()} companies`,
      )

    // Labels on inner-ring arcs (category level)
    g.selectAll('text.inner')
      .data(partitioned.descendants().filter((d) => d.depth === 1))
      .join('text')
      .attr('class', 'inner')
      .attr('transform', (d) => {
        const angle = (d.x0 + d.x1) / 2
        const r = (d.y0 + d.y1) / 2
        const deg = (angle * 180) / Math.PI - 90
        return `rotate(${deg}) translate(${r},0) rotate(${deg > 90 ? 180 : 0})`
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => {
        // Shorten label to first word if arc is too narrow
        const span = d.x1 - d.x0
        if (span < 0.3) return ''
        const label = d.data.name.split(' ')[0] ?? d.data.name
        return label
      })

    // Labels on outer-ring arcs (letter level) — only for large enough arcs
    g.selectAll('text.outer')
      .data(partitioned.descendants().filter((d) => d.depth === 2 && d.x1 - d.x0 > 0.04))
      .join('text')
      .attr('class', 'outer')
      .attr('transform', (d) => {
        const angle = (d.x0 + d.x1) / 2
        const r = (d.y0 + d.y1) / 2
        const deg = (angle * 180) / Math.PI - 90
        return `rotate(${deg}) translate(${r},0) rotate(${deg > 90 ? 180 : 0})`
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => d.data.name)
  }, [treeData, width, height])

  return <svg ref={svgRef} />
}
