import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { MARKET_CATEGORY_LABELS } from '../../data/groupUtils'

interface TreeNode {
  name: string
  value?: number
  children?: TreeNode[]
  /** Full path from root, used as a stable key. */
  path: string
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

function buildTree(stocks: NasdaqStock[]): TreeNode {
  const outer = new Map<string, Map<string, number>>()
  for (const stock of stocks) {
    const cat = MARKET_CATEGORY_LABELS[stock.marketCategory] ?? stock.marketCategory ?? 'Other'
    const letter = stock.symbol.charAt(0).toUpperCase()
    if (!outer.has(cat)) outer.set(cat, new Map())
    const inner = outer.get(cat)!
    inner.set(letter, (inner.get(letter) ?? 0) + 1)
  }
  return {
    name: 'NASDAQ',
    path: 'root',
    children: Array.from(outer.entries()).map(([cat, letters]) => ({
      name: cat,
      path: `root/${cat}`,
      children: Array.from(letters.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([letter, count]) => ({
          name: letter,
          value: count,
          path: `root/${cat}/${letter}`,
        })),
    })),
  }
}

/**
 * D3ZoomableTreemap
 *
 * Click-to-drill-down treemap with three levels:
 *   NASDAQ (root) → Market Category → First Letter
 *
 * Click any tile to zoom in to its children.
 * Click the breadcrumb header to navigate back up.
 * Tile area represents company count at every level.
 */
export function D3ZoomableTreemap({ data, limit = 1000, width = 700, height = 500 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [focusPath, setFocusPath] = useState<string>('root')

  const fullTree = useMemo(() => buildTree(data.slice(0, limit)), [data, limit])

  // Find the node at the current focusPath
  const focusNode = useMemo<TreeNode>(() => {
    function find(node: TreeNode, path: string): TreeNode | null {
      if (node.path === path) return node
      for (const child of node.children ?? []) {
        const found = find(child, path)
        if (found) return found
      }
      return null
    }
    return find(fullTree, focusPath) ?? fullTree
  }, [fullTree, focusPath])

  // Breadcrumb segments for navigation
  const breadcrumbs = useMemo<Array<{ label: string; path: string }>>(() => {
    const parts = focusPath.split('/')
    return parts.map((_, i) => {
      const p = parts.slice(0, i + 1).join('/')
      const label = i === 0 ? 'NASDAQ' : parts[i] ?? ''
      return { label, path: p }
    })
  }, [focusPath])

  const handleBack = useCallback(() => {
    const parts = focusPath.split('/')
    if (parts.length > 1) setFocusPath(parts.slice(0, -1).join('/'))
  }, [focusPath])

  const HEADER_H = 36

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const tmH = height - HEADER_H

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Zoomable treemap of NASDAQ companies')

    svg.append('title').text('Zoomable treemap: click a tile to drill down')

    const color = d3.scaleOrdinal(d3.schemeTableau10)
    const isLeaf = !focusNode.children?.length

    // ── Treemap layout ───────────────────────────────────────────────────────
    const displayNode: TreeNode = isLeaf
      ? { ...focusNode, children: undefined }
      : focusNode

    const root = d3
      .hierarchy<TreeNode>(displayNode)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap<TreeNode>().size([width, tmH]).padding(3).paddingTop(0)(root)

    const tiles = svg
      .append('g')
      .attr('transform', `translate(0,${HEADER_H})`)
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', (d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return `translate(${n.x0},${n.y0})`
      })
      .style('cursor', (d) => (d.data.children?.length ? 'pointer' : 'default'))

    tiles
      .append('rect')
      .attr('width', (d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return Math.max(0, n.x1 - n.x0)
      })
      .attr('height', (d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return Math.max(0, n.y1 - n.y0)
      })
      .attr('fill', (d) => {
        const topName = d.ancestors().reverse()[1]?.data.name ?? d.data.name
        return color(topName)
      })
      .attr('fill-opacity', 0.75)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('rx', 2)

    tiles.append('title').text((d) => `${d.data.name}: ${d.value?.toLocaleString()} companies`)

    tiles
      .filter((d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return n.x1 - n.x0 > 28 && n.y1 - n.y0 > 18
      })
      .append('text')
      .attr('x', 5)
      .attr('y', 16)
      .attr('font-size', (d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return Math.min(14, (n.y1 - n.y0) * 0.35)
      })
      .attr('font-weight', 'bold')
      .attr('fill', '#222')
      .text((d) => d.data.name)

    tiles
      .filter((d) => {
        const n = d as d3.HierarchyRectangularNode<TreeNode>
        return n.x1 - n.x0 > 36 && n.y1 - n.y0 > 32
      })
      .append('text')
      .attr('x', 5)
      .attr('y', 30)
      .attr('font-size', 10)
      .attr('fill', '#444')
      .text((d) => `${d.value?.toLocaleString()} co.`)

    // Click to drill down
    tiles.on('click', (_, d) => {
      if (d.data.children?.length) setFocusPath(d.data.path)
    })

    // ── Header / breadcrumb ──────────────────────────────────────────────────
    const header = svg.append('g')

    header
      .append('rect')
      .attr('width', width)
      .attr('height', HEADER_H)
      .attr('fill', '#f5f5f5')

    // Back button
    if (focusPath !== 'root') {
      header
        .append('text')
        .attr('x', 10)
        .attr('y', HEADER_H / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 14)
        .attr('fill', '#555')
        .attr('cursor', 'pointer')
        .text('← back')
        .on('click', handleBack)
    }

    // Breadcrumb path
    header
      .append('text')
      .attr('x', focusPath !== 'root' ? 72 : 12)
      .attr('y', HEADER_H / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 13)
      .attr('fill', '#333')
      .text(breadcrumbs.map((b) => b.label).join(' › '))
  }, [focusNode, focusPath, breadcrumbs, handleBack, width, height])

  return <svg ref={svgRef} />
}
