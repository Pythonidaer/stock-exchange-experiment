import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type GroupField = 'letter' | 'marketCategory'

interface Props {
  data: NasdaqStock[]
  /** Recommended: keep ≤ 200 for smooth simulation. */
  limit?: number
  groupBy?: GroupField
  width?: number
  height?: number
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  symbol: string
  group: string
}

/**
 * D3ForceGraph
 *
 * Runs a D3 force simulation where each node is a company. Nodes cluster toward
 * invisible "anchor" nodes representing each group (first letter or market category).
 * Ticker symbols are rendered inside each node.
 */
export function D3ForceGraph({
  data,
  limit = 150,
  groupBy = 'letter',
  width = 700,
  height = 600,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sliced = useMemo(() => data.slice(0, limit), [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!sliced.length) return

    svg.attr('width', width).attr('height', height)

    const nodes: SimNode[] = sliced.map((s) => ({
      id: s.symbol,
      symbol: s.symbol,
      group: groupBy === 'letter' ? s.symbol.charAt(0).toUpperCase() : (s.marketCategory || 'Other'),
    }))

    const groups = Array.from(new Set(nodes.map((n) => n.group)))
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(groups)

    // Pre-place nodes at group cluster centres to reduce initial chaos
    const clusterX = d3
      .scalePoint()
      .domain(groups)
      .range([80, width - 80])
      .padding(0.5)
    const clusterY = d3
      .scalePoint()
      .domain(groups)
      .range([80, height - 80])
      .padding(0.5)

    nodes.forEach((n) => {
      n.x = (clusterX(n.group) ?? width / 2) + (Math.random() - 0.5) * 40
      n.y = (clusterY(n.group) ?? height / 2) + (Math.random() - 0.5) * 40
    })

    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-30))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(14))
      .force(
        'x',
        d3.forceX<SimNode>((n) => clusterX(n.group) ?? width / 2).strength(0.3),
      )
      .force(
        'y',
        d3.forceY<SimNode>((n) => clusterY(n.group) ?? height / 2).strength(0.3),
      )

    const g = svg.append('g')

    const node = g
      .selectAll('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')

    node
      .append('circle')
      .attr('r', 12)
      .attr('fill', (d) => color(d.group))
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)

    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 7)
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text((d) => d.symbol)

    node.append('title').text((d) => d.symbol)

    // Group labels
    g.selectAll('text.group-label')
      .data(groups)
      .join('text')
      .attr('class', 'group-label')
      .attr('x', (g) => clusterX(g) ?? 0)
      .attr('y', (g) => (clusterY(g) ?? 0) - 60)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('font-weight', 'bold')
      .attr('fill', (g) => color(g))
      .attr('opacity', 0.7)
      .text((g) => g)

    simulation.on('tick', () => {
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [sliced, groupBy, width, height])

  return <svg ref={svgRef} />
}
