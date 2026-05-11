import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'

export type BeeswarmMetric = 'symbolLength' | 'nameLength'

interface BeeNode extends d3.SimulationNodeDatum {
  id: string
  symbol: string
  letter: string
  value: number
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  metric?: BeeswarmMetric
  width?: number
  height?: number
}

const METRIC_LABELS: Record<BeeswarmMetric, string> = {
  symbolLength: 'Ticker symbol length (characters)',
  nameLength: 'Company name length (characters)',
}

const NODE_RADIUS = 5

/**
 * D3BeeswarmPlot
 *
 * Each company is a circle positioned along the x-axis by a length metric.
 * A force simulation spreads circles vertically so they do not overlap — the
 * classic "beeswarm" or strip-plot layout.
 *
 *   symbolLength: circles cluster tightly at 4–5 chars; reveals outliers
 *   nameLength:   shows the right-skewed name distribution as stacked dots
 *
 * Circles are coloured by the first letter of the ticker symbol.
 * The simulation runs to completion before rendering (static layout).
 *
 * Performance note: default limit is 300 because the force simulation
 * becomes slow above ~500 nodes.
 */
export function D3BeeswarmPlot({
  data,
  limit = 300,
  metric = 'symbolLength',
  width = 780,
  height = 300,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const nodes = useMemo<BeeNode[]>(
    () =>
      data.slice(0, limit).map((s) => ({
        id: s.symbol,
        symbol: s.symbol,
        letter: s.symbol.charAt(0).toUpperCase(),
        value: metric === 'symbolLength' ? s.symbol.length : s.name.length,
      })),
    [data, limit, metric],
  )

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!nodes.length) return

    const margin = { top: 20, right: 20, bottom: 50, left: 50 }
    const iw = width - margin.left - margin.right
    const ih = height - margin.top - margin.bottom

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Beeswarm plot of ${METRIC_LABELS[metric]}`)

    svg.append('title').text(`Beeswarm plot: ${METRIC_LABELS[metric]}`)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(nodes, (d) => d.value) ?? 10])
      .nice()
      .range([0, iw])

    const color = d3.scaleOrdinal(d3.schemeTableau10)
    const cy = ih / 2

    // Copy nodes so simulation does not mutate the memoised array
    const simNodes: BeeNode[] = nodes.map((n) => ({ ...n }))

    // Run simulation synchronously to convergence before drawing
    const simulation = d3
      .forceSimulation<BeeNode>(simNodes)
      .force('x', d3.forceX<BeeNode>((d) => x(d.value)).strength(1))
      .force('y', d3.forceY<BeeNode>(cy).strength(0.05))
      .force('collide', d3.forceCollide<BeeNode>(NODE_RADIUS + 1).iterations(4))
      .stop()

    // Tick to convergence (150 iterations is enough for our node counts)
    for (let i = 0; i < 150; i++) simulation.tick()

    g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(10))

    g.append('text')
      .attr('x', iw / 2)
      .attr('y', ih + 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('fill', '#555')
      .text(METRIC_LABELS[metric])

    g.selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('cx', (d) => d.x ?? 0)
      .attr('cy', (d) => d.y ?? cy)
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => color(d.letter))
      .attr('fill-opacity', 0.75)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .append('title')
      .text((d) => `${d.symbol} (${d.value})`)
  }, [nodes, metric, width, height])

  return <svg ref={svgRef} />
}
