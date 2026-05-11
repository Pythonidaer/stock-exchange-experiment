import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

interface PointDatum {
  symbol: string
  name: string
  letter: string
  x: number
  y: number
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  width?: number
  height?: number
}

/**
 * Deterministic integer hash of a string, in range [0, mod).
 * Used to scatter companies across the canvas without true randomness.
 */
function strHash(s: string, mod: number): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) % mod
}

/**
 * D3VoronoiDiagram
 *
 * Each company is a point positioned by deterministic text-derived coordinates:
 *   x = hash of ticker symbol (spread across width)
 *   y = company-name length (spread across height)
 *
 * D3 Delaunay triangulation generates Voronoi cells — each cell "owns" the region
 * closest to its company's point. Cells are coloured by the first letter of the ticker.
 * Ticker labels are shown only when limit is small enough to avoid overlap.
 */
export function D3VoronoiDiagram({ data, limit = 200, width = 700, height = 550 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const points = useMemo<PointDatum[]>(() => {
    const slice = data.slice(0, limit)
    const margin = 40
    const maxNameLen = Math.max(...slice.map((s) => s.name.length), 1)
    return slice.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      letter: s.symbol.charAt(0).toUpperCase(),
      x: margin + strHash(s.symbol, width - margin * 2),
      y: margin + (s.name.length / maxNameLen) * (height - margin * 2),
    }))
  }, [data, limit, width, height])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!points.length) return

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Voronoi diagram of NASDAQ companies')

    svg.append('title').text('Voronoi diagram: ticker hash × name length')

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    const delaunay = d3.Delaunay.from(points, (d) => d.x, (d) => d.y)
    const voronoi = delaunay.voronoi([0, 0, width, height])

    // Draw Voronoi cells
    svg
      .selectAll('path.cell')
      .data(points)
      .join('path')
      .attr('class', 'cell')
      .attr('d', (_, i) => voronoi.renderCell(i))
      .attr('fill', (d) => color(d.letter))
      .attr('fill-opacity', 0.25)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .append('title')
      .text((d) => `${d.symbol} — ${d.name}`)

    // Draw point dots
    svg
      .selectAll('circle')
      .data(points)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 3)
      .attr('fill', (d) => color(d.letter))
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)

    // Labels only when few enough points to avoid collision
    if (limit <= 80) {
      svg
        .selectAll('text.label')
        .data(points)
        .join('text')
        .attr('class', 'label')
        .attr('x', (d) => d.x + 5)
        .attr('y', (d) => d.y - 4)
        .attr('font-size', 9)
        .attr('fill', '#333')
        .attr('pointer-events', 'none')
        .text((d) => d.symbol)
    }
  }, [points, limit, width, height])

  return <svg ref={svgRef} />
}
