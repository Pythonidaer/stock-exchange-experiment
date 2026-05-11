import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from 'd3-sankey'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { MARKET_CATEGORY_LABELS } from '../../data/groupUtils'

// ─── Custom node / link data shapes ─────────────────────────────────────────

interface NodeDatum {
  id: string
  label: string
  layer: number
}

interface LinkDatum {
  source: string
  target: string
  value: number
}

type LayoutNode = SankeyNode<NodeDatum, LinkDatum>
type LayoutLink = SankeyLink<NodeDatum, LinkDatum>

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

/**
 * D3Sankey
 *
 * Sankey (alluvial) diagram showing the flow of companies:
 *   Market Category  →  First Letter  →  Stock Type (ETF / Common Stock)
 *
 * Link width encodes the count of companies passing through that path.
 * This reveals, for example, which letters are most common in each NASDAQ tier,
 * and what proportion of each letter group is made up of ETFs.
 */
export function D3Sankey({ data, limit = 1000, width = 800, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { nodes: inputNodes, links: inputLinks } = useMemo(() => {
    const slice = data.slice(0, limit)

    // Count co-occurrences for each (category, letter, stockType) triple
    type CountKey = `${string}__${string}__${string}`
    const counts = new Map<CountKey, number>()

    for (const stock of slice) {
      const cat = MARKET_CATEGORY_LABELS[stock.marketCategory] ?? 'Other'
      const letter = stock.symbol.charAt(0).toUpperCase()
      const type = stock.etf ? 'ETF' : 'Common Stock'
      const key: CountKey = `${cat}__${letter}__${type}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    // Build node id sets
    const catSet = new Set<string>()
    const letterSet = new Set<string>()
    const typeSet = new Set(['ETF', 'Common Stock'])

    for (const [key] of counts) {
      const [cat, letter] = key.split('__')
      if (cat) catSet.add(cat)
      if (letter) letterSet.add(letter)
    }

    // Nodes: categories (layer 0) + letters (layer 1) + types (layer 2)
    const nodes: NodeDatum[] = [
      ...Array.from(catSet).map((id) => ({ id, label: id, layer: 0 })),
      ...Array.from(letterSet)
        .sort()
        .map((id) => ({ id, label: id, layer: 1 })),
      ...Array.from(typeSet).map((id) => ({ id, label: id, layer: 2 })),
    ]

    // Links: cat→letter and letter→type
    const catToLetter = new Map<string, number>()
    const letterToType = new Map<string, number>()

    for (const [key, count] of counts) {
      const parts = key.split('__')
      const cat = parts[0] ?? ''
      const letter = parts[1] ?? ''
      const type = parts[2] ?? ''
      const clKey = `${cat}|${letter}`
      catToLetter.set(clKey, (catToLetter.get(clKey) ?? 0) + count)
      const ltKey = `${letter}|${type}`
      letterToType.set(ltKey, (letterToType.get(ltKey) ?? 0) + count)
    }

    const links: LinkDatum[] = [
      ...Array.from(catToLetter.entries()).map(([k, value]) => {
        const [source, target] = k.split('|')
        return { source: source ?? '', target: target ?? '', value }
      }),
      ...Array.from(letterToType.entries()).map(([k, value]) => {
        const [source, target] = k.split('|')
        return { source: source ?? '', target: target ?? '', value }
      }),
    ]

    return { nodes, links }
  }, [data, limit])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!inputNodes.length || !inputLinks.length) return

    const margin = { top: 10, right: 120, bottom: 10, left: 120 }
    const iw = width - margin.left - margin.right
    const ih = height - margin.top - margin.bottom

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Sankey diagram: market category → letter → stock type')

    svg.append('title').text('Flow: NASDAQ tier → first letter → stock type')

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const { nodes, links } = d3Sankey<NodeDatum, LinkDatum>()
      .nodeId((d) => d.id)
      .nodeWidth(15)
      .nodePadding(8)
      .nodeAlign(d3Sankey.sankeyLeft)
      .extent([[0, 0], [iw, ih]])({
        nodes: inputNodes.map((d) => ({ ...d })),
        links: inputLinks.map((d) => ({ ...d })),
      })

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    // Draw links
    g.selectAll('path.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal<NodeDatum, LinkDatum>())
      .attr('stroke-width', (d: LayoutLink) => Math.max(1, d.width ?? 1))
      .attr('stroke', (d: LayoutLink) => {
        const src = d.source as LayoutNode
        return color(src.label ?? '')
      })
      .attr('stroke-opacity', 0.35)
      .attr('fill', 'none')
      .append('title')
      .text((d: LayoutLink) => {
        const src = d.source as LayoutNode
        const tgt = d.target as LayoutNode
        return `${src.label} → ${tgt.label}: ${d.value}`
      })

    // Draw nodes
    g.selectAll('rect.node')
      .data(nodes)
      .join('rect')
      .attr('class', 'node')
      .attr('x', (d: LayoutNode) => d.x0 ?? 0)
      .attr('y', (d: LayoutNode) => d.y0 ?? 0)
      .attr('width', (d: LayoutNode) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d: LayoutNode) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', (d: LayoutNode) => color(d.label))
      .attr('rx', 2)
      .append('title')
      .text((d: LayoutNode) => `${d.label}: ${d.value?.toLocaleString()} companies`)

    // Node labels
    g.selectAll('text.node-label')
      .data(nodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('x', (d: LayoutNode) =>
        (d.layer ?? 0) < 2 ? (d.x0 ?? 0) - 6 : (d.x1 ?? 0) + 6,
      )
      .attr('y', (d: LayoutNode) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: LayoutNode) => ((d.layer ?? 0) < 2 ? 'end' : 'start'))
      .attr('font-size', 11)
      .attr('fill', '#333')
      .text((d: LayoutNode) => d.label)
  }, [inputNodes, inputLinks, width, height])

  return <svg ref={svgRef} />
}
