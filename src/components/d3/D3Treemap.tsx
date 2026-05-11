import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type TreemapGroupBy = 'letter' | 'marketCategory'

interface Props {
  data: NasdaqStock[]
  limit?: number
  groupBy?: TreemapGroupBy
  width?: number
  height?: number
}

interface TreeChild {
  name: string
  value: number
}

interface TreeRoot {
  name: string
  children: TreeChild[]
}

/**
 * D3Treemap
 *
 * Groups companies by first letter of ticker symbol (or market category) and draws
 * a treemap where each tile area represents the count of companies in that group.
 */
export function D3Treemap({
  data,
  limit = 500,
  groupBy = 'letter',
  width = 700,
  height = 500,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const treeData = useMemo<TreeRoot>(() => {
    const slice = data.slice(0, limit)
    const map = new Map<string, number>()
    for (const stock of slice) {
      const key =
        groupBy === 'letter'
          ? stock.symbol.charAt(0).toUpperCase()
          : (stock.marketCategory || 'Other')
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return {
      name: 'root',
      children: Array.from(map.entries()).map(([name, value]) => ({ name, value })),
    }
  }, [data, limit, groupBy])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!treeData.children.length) return

    svg.attr('width', width).attr('height', height)

    const color = d3.scaleOrdinal(d3.schemePastel1)

    const root = d3
      .hierarchy(treeData)
      .sum((d) => (d as unknown as TreeChild).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap<TreeRoot>().size([width, height]).padding(2)(root)

    const leaf = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', (d) => {
        const node = d as d3.HierarchyRectangularNode<TreeRoot>
        return `translate(${node.x0},${node.y0})`
      })

    leaf
      .append('rect')
      .attr('width', (d) => {
        const node = d as d3.HierarchyRectangularNode<TreeRoot>
        return node.x1 - node.x0
      })
      .attr('height', (d) => {
        const node = d as d3.HierarchyRectangularNode<TreeRoot>
        return node.y1 - node.y0
      })
      .attr('fill', (d) => color(d.data.name))
      .attr('stroke', '#fff')

    leaf
      .append('text')
      .attr('x', 6)
      .attr('y', 18)
      .attr('font-size', 13)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text((d) => d.data.name)

    leaf
      .append('text')
      .attr('x', 6)
      .attr('y', 32)
      .attr('font-size', 11)
      .attr('fill', '#555')
      .text((d) => `${d.value ?? 0} co.`)

    leaf.append('title').text((d) => `${d.data.name}: ${d.value ?? 0} companies`)
  }, [treeData, width, height])

  return <svg ref={svgRef} />
}
