import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { MARKET_CATEGORY_LABELS } from '../../data/groupUtils'

export type HeatmapXGroup = 'letter' | 'marketCategory'
export type HeatmapYGroup = 'symbolLength' | 'etf'

interface Props {
  data: NasdaqStock[]
  limit?: number
  xGroup?: HeatmapXGroup
  yGroup?: HeatmapYGroup
  width?: number
  height?: number
}

function getX(stock: NasdaqStock, xGroup: HeatmapXGroup): string {
  if (xGroup === 'letter') return stock.symbol.charAt(0).toUpperCase()
  return MARKET_CATEGORY_LABELS[stock.marketCategory] ?? stock.marketCategory ?? 'Other'
}

function getY(stock: NasdaqStock, yGroup: HeatmapYGroup): string {
  if (yGroup === 'etf') return stock.etf ? 'ETF' : 'Common Stock'
  const len = stock.symbol.length
  if (len <= 1) return '1'
  if (len === 2) return '2'
  if (len === 3) return '3'
  if (len === 4) return '4'
  if (len === 5) return '5'
  return '6+'
}

const SYMBOL_LEN_ORDER = ['1', '2', '3', '4', '5', '6+']
const ETF_ORDER = ['Common Stock', 'ETF']

/**
 * D3Heatmap
 *
 * Two-dimensional count grid coloured by density.
 *   xGroup: first letter A–Z  OR  market category (3 values)
 *   yGroup: ticker-symbol length (1–6+)  OR  ETF / Common Stock
 *
 * Warm colours = many companies; cool colours = few.
 * Market-category × ETF is the simplest and clearest view.
 */
export function D3Heatmap({
  data,
  limit = 2000,
  xGroup = 'letter',
  yGroup = 'symbolLength',
  width = 780,
  height = 380,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const { cells, xKeys, yKeys } = useMemo(() => {
    const slice = data.slice(0, limit)
    const counts = new Map<string, number>()
    const xSet = new Set<string>()
    const ySet = new Set<string>()

    for (const stock of slice) {
      const x = getX(stock, xGroup)
      const y = getY(stock, yGroup)
      xSet.add(x)
      ySet.add(y)
      const key = `${x}__${y}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const xKeys = Array.from(xSet).sort((a, b) => a.localeCompare(b))
    const yOrder = yGroup === 'symbolLength' ? SYMBOL_LEN_ORDER : ETF_ORDER
    const yKeys = yOrder.filter((k) => ySet.has(k))

    const cells: Array<{ x: string; y: string; count: number }> = []
    for (const x of xKeys) {
      for (const y of yKeys) {
        cells.push({ x, y, count: counts.get(`${x}__${y}`) ?? 0 })
      }
    }
    return { cells, xKeys, yKeys }
  }, [data, limit, xGroup, yGroup])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!cells.length) return

    const margin = { top: 20, right: 30, bottom: 60, left: 120 }
    const iw = width - margin.left - margin.right
    const ih = height - margin.top - margin.bottom

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Heatmap of ${xGroup} vs ${yGroup}`)

    svg.append('title').text(`Company count heatmap: ${xGroup} × ${yGroup}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand().domain(xKeys).range([0, iw]).padding(0.05)
    const y = d3.scaleBand().domain(yKeys).range([0, ih]).padding(0.05)

    const maxCount = d3.max(cells, (d) => d.count) ?? 1
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxCount])

    g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', xKeys.length > 10 ? 'rotate(-55)' : 'rotate(0)')
      .attr('text-anchor', xKeys.length > 10 ? 'end' : 'middle')
      .attr('font-size', xKeys.length > 10 ? 9 : 11)

    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .selectAll('text').attr('font-size', 11)

    g.selectAll('rect')
      .data(cells)
      .join('rect')
      .attr('x', (d) => x(d.x) ?? 0)
      .attr('y', (d) => y(d.y) ?? 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', (d) => (d.count === 0 ? '#f0f0f0' : colorScale(d.count)))
      .attr('rx', 2)
      .append('title')
      .text((d) => `${d.x} × ${d.y}: ${d.count}`)

    // Count labels inside cells large enough to hold them
    const cellW = x.bandwidth()
    const cellH = y.bandwidth()
    if (cellW > 18 && cellH > 12) {
      g.selectAll('text.cell-label')
        .data(cells.filter((d) => d.count > 0))
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => (x(d.x) ?? 0) + cellW / 2)
        .attr('y', (d) => (y(d.y) ?? 0) + cellH / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', Math.min(cellH * 0.5, 11))
        .attr('fill', (d) => (d.count > maxCount * 0.6 ? '#fff' : '#333'))
        .attr('pointer-events', 'none')
        .text((d) => d.count)
    }
  }, [cells, xKeys, yKeys, xGroup, yGroup, width, height])

  return <svg ref={svgRef} />
}
