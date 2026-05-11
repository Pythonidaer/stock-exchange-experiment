import { useState, useEffect } from 'react'
import { fetchNasdaqStocks, FALLBACK_STOCKS, type NasdaqStock } from '../data/nasdaqStocks'

export interface UseNasdaqDataResult {
  data: NasdaqStock[]
  loading: boolean
  error: string | null
}

/**
 * Fetches NASDAQ-listed stocks once and returns them together with loading/error state.
 * Falls back to the static sample dataset if the remote fetch fails.
 *
 * Usage in Storybook:
 *   const { data, loading, error } = useNasdaqData()
 */
export function useNasdaqData(): UseNasdaqDataResult {
  const [data, setData] = useState<NasdaqStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchNasdaqStocks()
      .then((stocks) => {
        if (!cancelled) {
          setData(stocks)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
          setData(FALLBACK_STOCKS)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
