/**
 * Shared grouping and aggregation helpers used across multiple D3 components.
 * All functions are pure and work on the NasdaqStock type.
 */

import type { NasdaqStock } from './nasdaqStocks'

// ─── Group-key types ──────────────────────────────────────────────────────────

export type GroupByKey = 'letter' | 'marketCategory' | 'etf' | 'financialStatus'

// ─── Human-readable label maps ────────────────────────────────────────────────

export const MARKET_CATEGORY_LABELS: Record<string, string> = {
  Q: 'Global Select (Q)',
  G: 'Global Market (G)',
  S: 'Capital Market (S)',
}

export const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  N: 'Normal (N)',
  D: 'Deficient (D)',
  E: 'Delinquent (E)',
  Q: 'Bankrupt (Q)',
  H: 'Schedule 12g (H)',
  G: 'Deficient & Bankrupt (G)',
  J: 'Deficient & Delinquent (J)',
  K: 'Delinquent & Bankrupt (K)',
  C: 'Deficient/Delinquent/Bankrupt (C)',
}

// ─── Key extractors ───────────────────────────────────────────────────────────

export function getGroupKey(stock: NasdaqStock, groupBy: GroupByKey): string {
  switch (groupBy) {
    case 'letter':
      return stock.symbol.charAt(0).toUpperCase()
    case 'marketCategory':
      return MARKET_CATEGORY_LABELS[stock.marketCategory] ?? stock.marketCategory ?? 'Other'
    case 'etf':
      return stock.etf ? 'ETF' : 'Common Stock'
    case 'financialStatus':
      return FINANCIAL_STATUS_LABELS[stock.financialStatus] ?? stock.financialStatus ?? 'Unknown'
  }
}

// ─── Aggregators ─────────────────────────────────────────────────────────────

/** Returns [{key, count}] sorted by descending count. */
export function countByGroupKey(
  stocks: NasdaqStock[],
  groupBy: GroupByKey,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>()
  for (const stock of stocks) {
    const key = getGroupKey(stock, groupBy)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

/** Returns [{key, count}] sorted by ascending key (good for A–Z letter groups). */
export function countByGroupKeySorted(
  stocks: NasdaqStock[],
  groupBy: GroupByKey,
): Array<{ key: string; count: number }> {
  return countByGroupKey(stocks, groupBy).sort((a, b) => a.key.localeCompare(b.key))
}

// ─── Word extraction ─────────────────────────────────────────────────────────

/** Noise words stripped from company names when building a word cloud. */
const STOP_WORDS = new Set([
  'inc', 'incorporated', 'corporation', 'corp', 'company', 'co', 'ltd', 'limited',
  'holdings', 'holding', 'group', 'class', 'common', 'stock', 'ordinary', 'shares',
  'american', 'depositary', 'the', 'and', 'of', 'a', 'an', 'for', 'in', 'on', 'at',
  'plc', 'llc', 'lp', 'sa', 'ag', 'nv', 'bv', 'se', 'ab', 'as', 'spa', 'de',
  'technologies', 'technology', 'tech', 'solutions', 'services', 'systems',
  'international', 'global', 'national', 'new', 'first', 'general',
])

/**
 * Extracts individual words from a list of company names, filters stop words,
 * counts frequency, and returns sorted [{word, count}] pairs.
 */
export function extractWordFrequencies(
  stocks: NasdaqStock[],
  minCount = 2,
): Array<{ word: string; count: number }> {
  const freq = new Map<string, number>()
  for (const stock of stocks) {
    // Split on non-alpha chars, lowercase, filter empties
    const words = stock.name
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
}
