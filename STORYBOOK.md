# Storybook + D3 + Three.js Visualization Guide

This project uses **Storybook 8** with **@storybook/react-vite**, **D3 v7**, and **Three.js** (via React Three Fiber) to explore NASDAQ-listed company data through 2D and 3D interactive visualizations.

---

## Running Storybook

```bash
npm run storybook
```

Opens at **http://localhost:6006** by default.

To build a static Storybook site:

```bash
npm run build-storybook
```

Output goes to `storybook-static/`.

---

## NASDAQ Data Source

Companies are fetched from the NASDAQ Trader FTP directory:

```
https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt
```

This is a pipe-delimited text file published by NASDAQ containing all listed securities. The file is fetched at runtime from within Storybook stories.

**Fallback:** If the fetch fails (e.g. due to CORS or network restrictions in CI), the app falls back to a static sample of ~100 well-known NASDAQ companies defined in `src/data/nasdaqStocks.ts`.

---

## Available Components

All components live in `src/components/d3/`.

### Batch 1 — Foundational layouts

| Component | What it shows |
|---|---|
| `D3BarChart` | Bar chart — company count by first letter of ticker or name |
| `D3BubbleChart` | Packed bubbles — each company as a bubble, sized by name length |
| `D3ForceGraph` | Force simulation — companies cluster by letter or market category |
| `D3Treemap` | Treemap — tile area encodes company count per group |
| `D3PackedCircles` | Nested circle packing — outer circles are letter groups |
| `D3RadialChart` | Radial bar chart — A–Z bars arranged in a circle |
| `D3ScatterPlot` | Scatter plot — x = ticker length, y = name length (placeholder) |

### Batch 2 — Extended visualizations

| Component | What it shows | Best for |
|---|---|---|
| `D3DonutChart` | Donut chart — share of companies by market category, ETF status, financial status, or letter | Categorical proportions |
| `D3Histogram` | Distribution of ticker or company-name length | Understanding data spread |
| `D3Heatmap` | 2D count grid — letter × symbol length, letter × ETF status, etc. | Two-way cross-tabulation |
| `D3Sunburst` | Radial partition — market category → first letter | Hierarchical proportions |
| `D3Sankey` | Flow diagram — market category → letter → stock type | Flow and conversion |
| `D3WordCloud` | Frequent words in company names (stop-words removed) | Text/brand analysis |
| `D3BeeswarmPlot` | Strip plot with collision — each company dot on a length axis | Distributions, outliers |
| `D3LollipopChart` | Horizontal lollipop — top N groups by count | Ranked comparisons |
| `D3VoronoiDiagram` | Voronoi cells — ticker hash × name length | Spatial / nearest-neighbour |
| `D3ZoomableTreemap` | Click-to-drill treemap — market category → first letter | Hierarchical exploration |

---

## Which visuals work best with the current data

The NASDAQ listing data is **categorical** (symbol, name, market tier, ETF flag, financial status) with no numeric financial values. The following charts work best as-is:

| Works well now | Needs enriched data later |
|---|---|
| DonutChart, BarChart, LollipopChart, Histogram | ScatterPlot (needs price/volume for real axes) |
| Treemap, ZoomableTreemap, Sunburst, PackedCircles | BubbleChart (size currently = name length) |
| Heatmap, RadialChart | ForceGraph (grouping is approximate) |
| Sankey, WordCloud | — |
| BeeswarmPlot, VoronoiDiagram | VoronoiDiagram (x is currently a hash, not a real metric) |

---

## Adding a New D3 Visualization

1. **Create the component** in `src/components/d3/MyNewChart.tsx`.

   - Accept `data: NasdaqStock[]`, `width`, `height`, and a `limit` prop.
   - Use `useRef` + `useEffect` for D3 rendering.
   - Always call `svg.selectAll('*').remove()` at the top of `useEffect`.
   - Wrap expensive aggregation in `useMemo`.
   - Add `role="img"` and `aria-label` to the SVG element.
   - Use `<title>` elements on the SVG and on complex paths.

2. **Use shared grouping helpers** from `src/data/groupUtils.ts` when appropriate:
   - `countByGroupKey(stocks, groupBy)` — counted array sorted by frequency
   - `getGroupKey(stock, groupBy)` — single-key extractor
   - `extractWordFrequencies(stocks)` — word cloud input

3. **Export it** from `src/components/d3/index.ts`.

4. **Create a story** at `src/components/d3/MyNewChart.stories.tsx`.

   - Import `useNasdaqData` from `../../hooks/useNasdaqData`.
   - Show `loading` and `error` states.
   - Default `limit` to ≤ 500 (≤ 200 for force/bubble layouts).
   - Add `argTypes` for `limit`, `width`, `height`, and any grouping controls.

Minimal story template:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { MyNewChart } from './MyNewChart'
import { useNasdaqData } from '../../hooks/useNasdaqData'

const meta: Meta<typeof MyNewChart> = {
  title: 'D3 / MyNewChart',
  component: MyNewChart,
}

export default meta
type Story = StoryObj<typeof MyNewChart>

function WithData(args: React.ComponentProps<typeof MyNewChart>) {
  const { data, loading, error } = useNasdaqData()
  if (loading) return <p>Loading…</p>
  if (error) return <p>Error: {error}</p>
  return <MyNewChart {...args} data={data} />
}

export const Default: Story = {
  render: (args) => <WithData {...args} />,
  args: { limit: 300, width: 700, height: 500 },
}
```

---

## Performance Notes

| Chart type | Safe default limit | Notes |
|---|---|---|
| DonutChart, LollipopChart | 3 000+ | Aggregates before rendering; SVG element count is small |
| BarChart, RadialChart | 3 000+ | Renders ≤ 26 bars |
| Histogram | 5 000 | Renders ≤ ~60 bars |
| Treemap, Sunburst, ZoomableTreemap | 2 000 | One rect/path per group, not per company |
| Heatmap | 5 000 | Grid cells are O(groups²), not O(companies) |
| ScatterPlot, BeeswarmPlot | 500 | One SVG element per company |
| BubbleChart, PackedCircles | 250 | Pack layout is expensive above this |
| ForceGraph | 200 | Force simulation is CPU-intensive |
| Sankey | 1 000 | Link count grows with group product |
| WordCloud | 2 000 inputs / 60 words | Spiral placement loop is O(words²) |
| VoronoiDiagram | 300 | Delaunay is fast; label overlap becomes an issue |

Use `useMemo` to avoid re-computing aggregations on every render.
Avoid rendering `<text>` labels for every node — only label elements above a minimum size threshold.

---

## Three.js Dependencies

Three.js 3D visualisations are powered by:

| Package | Role |
|---|---|
| `three` v0.184 | Core Three.js geometry, materials, lights |
| `@react-three/fiber` v9 | React renderer for Three.js (replaces imperative scene setup) |
| `@react-three/drei` v10 | Helpers: `OrbitControls`, `Text` (SDF font rendering), `Html` |
| `three/examples/jsm/geometries/ConvexGeometry` | Convex hull geometry for `ThreeConvexCompanyHull` |

TypeScript types are provided by `@types/three` (installed as a transitive dependency of `@react-three/drei`).

---

## Three.js Visualization Stories

All components live in `src/components/three/`.

### Components

| Component | Concept | Default limit | Notes |
|---|---|---|---|
| `ThreeCompanyCloud` | Point cloud in 3D sphere volume | 200 | Simplest layout; good baseline |
| `ThreeCompanyDie` | Polyhedron die with tickers on surface | 50 | Core "spinning company die" prototype |
| `ThreeConvexCompanyHull` | Convex hull from data-derived positions | 80 | Shape encodes the data distribution |
| `ThreeLODCompanyLabels` | LOD: far=dot → medium=ticker → close=full name | 250 | Explore by zooming in/out |
| `ThreeSpinningCompanyGlobe` | Companies on Fibonacci-spiral globe surface | 150 | Globe variant of the die concept |

### Geometry comparison

| Geometry type | Shape | Best for | Limitations |
|---|---|---|---|
| Icosahedron / Dodecahedron / Octahedron | Fixed polyhedron | Die prototype — predictable, readable | Labels don't reflect data |
| Convex hull (`ConvexGeometry`) | Data-derived polygon | Shows data shape as geometry | Complex — needs enough spread in points |
| Sphere / Globe | Uniform surface | Large company sets (100–300) | No edge/face structure |
| Point cloud | Scattered volume | Quick overview | No structure |
| LOD grid | 3D cube of companies | Scalability demo | Static, not aesthetic |

### Note on the "spinning company die" concept

The `ThreeCompanyDie` story is the primary prototype. The key design questions are:
1. **Which polyhedron** best balances face count vs. readability? (Icosahedron = 20 faces, Dodecahedron = 12 faces)
2. **How many tickers** can fit on the surface before labels overlap? (~30–60 is the sweet spot)
3. **Should labels map to faces or be freely distributed?** (Currently Fibonacci-distributed)

The `ThreeConvexCompanyHull` explores whether the geometry itself can be derived from company data. At this stage it works as a visual experiment but is not as readable as the fixed polyhedron.

### Adding a new Three.js visualization

1. Create `src/components/three/MyComponent.tsx`.
   - Use `Canvas` + sub-component pattern (hooks like `useFrame` live in a sub-component inside Canvas).
   - Import positions from `utils/positions.ts` where useful.
   - Wrap `<Text>` components in `<Suspense fallback={null}>`.
   - Manage hover state outside Canvas; pass a callback in.
   - Include an `InfoPanel` div below the Canvas for accessibility.

2. Export from `src/components/three/index.ts`.

3. Create `MyComponent.stories.tsx` following the same pattern as existing stories.

### Three.js performance notes

| Component | Notes |
|---|---|
| `ThreeCompanyCloud` | Each company = 1 mesh + optional Text. Keep ≤ 300. |
| `ThreeCompanyDie` | O(n) Text instances. Keep ≤ 80 for readable labels. |
| `ThreeConvexCompanyHull` | ConvexGeometry is computed once via `useMemo`; dispose on unmount. |
| `ThreeLODCompanyLabels` | `useFrame` runs per-node per-frame to check distance — avoid > 400 nodes. |
| `ThreeSpinningCompanyGlobe` | Each node = 1 mesh + 1 Text. Keep ≤ 200. |

- Use `useMemo` for generated positions and geometries.
- Always dispose custom geometries in `useEffect` cleanup.
- `<Text>` from drei is async (font loading) — always wrap in `<Suspense>`.
- WebGL canvas is not inherently accessible — always include the text `InfoPanel` below the Canvas.
