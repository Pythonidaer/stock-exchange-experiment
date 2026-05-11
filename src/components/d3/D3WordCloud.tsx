import { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import type { NasdaqStock } from '../../data/nasdaqStocks'
import { extractWordFrequencies } from '../../data/groupUtils'

interface PlacedWord {
  word: string
  count: number
  fontSize: number
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  data: NasdaqStock[]
  limit?: number
  /** Maximum number of words to show. */
  maxWords?: number
  width?: number
  height?: number
}

/**
 * Estimates pixel width of a word using a heuristic (character count × font size × ratio).
 * A temporary SVG text element would be more accurate but requires DOM access.
 */
function estimateWidth(word: string, fontSize: number): number {
  // Average character width ≈ 0.55 × fontSize for sans-serif
  return word.length * fontSize * 0.55
}

/**
 * Returns true when bounding box [ax, ay, aw, ah] overlaps [bx, by, bw, bh].
 * All coords are centred.
 */
function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return (
    Math.abs(ax - bx) < (aw + bw) / 2 + 3 &&
    Math.abs(ay - by) < (ah + bh) / 2 + 3
  )
}

/**
 * Tries to place a word at a position along an Archimedean spiral from the centre.
 * Returns [x, y] if a free spot is found, or null if the word doesn't fit.
 */
function placeWord(
  placed: PlacedWord[],
  cx: number,
  cy: number,
  wordW: number,
  wordH: number,
  seedAngle: number,
): [number, number] | null {
  const spiralStep = 3
  for (let step = 0; step < 600; step++) {
    const t = step * 0.15
    const r = spiralStep * t
    const theta = seedAngle + t
    const x = cx + r * Math.cos(theta)
    const y = cy + r * Math.sin(theta) * 0.5 // flatten vertically
    const fits = placed.every(
      (p) => !overlaps(x, y, wordW, wordH, p.x, p.y, p.w, p.h),
    )
    if (fits) return [x, y]
  }
  return null
}

/**
 * D3WordCloud
 *
 * Spiral-placement word cloud of the most common words found in NASDAQ company names,
 * after stripping legal/finance noise words (Inc, Corp, Holdings, etc.).
 * Word size encodes frequency — larger = more companies contain that word.
 *
 * Note: uses a heuristic bounding-box collision check. Word size on screen
 * may differ slightly depending on the browser's font renderer.
 */
export function D3WordCloud({
  data,
  limit = 2000,
  maxWords = 60,
  width = 700,
  height = 480,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const wordFreqs = useMemo(
    () => extractWordFrequencies(data.slice(0, limit)).slice(0, maxWords),
    [data, limit, maxWords],
  )

  const placed = useMemo<PlacedWord[]>(() => {
    if (!wordFreqs.length) return []

    const maxCount = wordFreqs[0]?.count ?? 1
    const minCount = wordFreqs[wordFreqs.length - 1]?.count ?? 1
    const fontScale = d3
      .scaleLog()
      .base(2)
      .domain([minCount, maxCount])
      .range([12, 52])
      .clamp(true)

    const cx = width / 2
    const cy = height / 2
    const result: PlacedWord[] = []

    wordFreqs.forEach((wf, i) => {
      const fontSize = fontScale(wf.count)
      const wordW = estimateWidth(wf.word, fontSize)
      const wordH = fontSize * 1.15
      const seedAngle = (i / wordFreqs.length) * 2 * Math.PI
      const pos = placeWord(result, cx, cy, wordW, wordH, seedAngle)
      if (pos) {
        result.push({ word: wf.word, count: wf.count, fontSize, x: pos[0], y: pos[1], w: wordW, h: wordH })
      }
    })
    return result
  }, [wordFreqs, width, height])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    if (!placed.length) return

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', 'Word cloud of common words in NASDAQ company names')

    svg.append('title').text('Most frequent words in NASDAQ company names')

    svg
      .selectAll('text')
      .data(placed)
      .join('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d) => d.fontSize)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-weight', (d) => (d.fontSize > 28 ? 'bold' : 'normal'))
      .attr('fill', (d) => color(d.word.charAt(0)))
      .attr('fill-opacity', 0.88)
      .text((d) => d.word)
      .append('title')
      .text((d) => `"${d.word}" appears in ${d.count} company names`)
  }, [placed, width, height])

  return <svg ref={svgRef} />
}
