/**
 * NASDAQ Listed Stocks Data Utility
 *
 * Fetches and parses the pipe-delimited NASDAQ company listing from:
 *   https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt
 *
 * Format (pipe-delimited, first row is header):
 *   Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
 */

export interface NasdaqStock {
  symbol: string
  name: string
  marketCategory: string
  financialStatus: string
  roundLotSize: number
  etf: boolean
  nextShares: boolean
}

const NASDAQ_URL =
  'https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt'

/** Minimal static fallback used when the remote fetch is unavailable (e.g. in Storybook sandboxes). */
export const FALLBACK_STOCKS: NasdaqStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MSFT', name: 'Microsoft Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'META', name: 'Meta Platforms Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'TSLA', name: 'Tesla Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AVGO', name: 'Broadcom Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'NFLX', name: 'Netflix Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ADBE', name: 'Adobe Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'INTC', name: 'Intel Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PEP', name: 'PepsiCo Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'INTU', name: 'Intuit Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AMAT', name: 'Applied Materials Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AMGN', name: 'Amgen Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MU', name: 'Micron Technology Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'LRCX', name: 'Lam Research Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'KLAC', name: 'KLA Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PANW', name: 'Palo Alto Networks Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MRVL', name: 'Marvell Technology Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SNPS', name: 'Synopsys Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CDNS', name: 'Cadence Design Systems Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'FTNT', name: 'Fortinet Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BIIB', name: 'Biogen Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'IDXX', name: 'IDEXX Laboratories Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ILMN', name: 'Illumina Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MRNA', name: 'Moderna Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ZM', name: 'Zoom Video Communications Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'DDOG', name: 'Datadog Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SNOW', name: 'Snowflake Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'OKTA', name: 'Okta Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'TEAM', name: 'Atlassian Corporation', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'WDAY', name: 'Workday Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'VEEV', name: 'Veeva Systems Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ZS', name: 'Zscaler Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'NET', name: 'Cloudflare Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'HUBS', name: 'HubSpot Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BILL', name: 'Bill Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'U', name: 'Unity Software Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'RBLX', name: 'Roblox Corporation', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ABNB', name: 'Airbnb Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'DASH', name: 'DoorDash Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'HOOD', name: 'Robinhood Markets Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SOFI', name: 'SoFi Technologies Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AFRM', name: 'Affirm Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'UPST', name: 'Upstart Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'OPEN', name: 'Opendoor Technologies Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'AI', name: 'C3.ai Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PATH', name: 'UiPath Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'GTLB', name: 'GitLab Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ESTC', name: 'Elastic NV', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MDB', name: 'MongoDB Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CFLT', name: 'Confluent Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'DOCN', name: 'DigitalOcean Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BAND', name: 'Bandwidth Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'TWLO', name: 'Twilio Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SEND', name: 'Relay Payments Inc.', marketCategory: 'S', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PINS', name: 'Pinterest Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SNAP', name: 'Snap Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'RDDT', name: 'Reddit Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'LYFT', name: 'Lyft Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'EXPE', name: 'Expedia Group Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BKNG', name: 'Booking Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'EBAY', name: 'eBay Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ETSY', name: 'Etsy Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CHWY', name: 'Chewy Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'WISH', name: 'ContextLogic Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'POSH', name: 'Poshmark Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'CPNG', name: 'Coupang Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'JD', name: 'JD.com Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'PDD', name: 'PDD Holdings Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BIDU', name: 'Baidu Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'NTES', name: 'NetEase Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'BILI', name: 'Bilibili Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'IQ', name: 'iQIYI Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'VIPS', name: 'Vipshop Holdings Limited', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'XP', name: 'XP Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'NU', name: 'Nu Holdings Ltd.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'STNE', name: 'StoneCo Ltd.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'MELI', name: 'MercadoLibre Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'SE', name: 'Sea Limited', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'GRAB', name: 'Grab Holdings Limited', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'GOTU', name: 'Gaotu Techedu Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'EDU', name: 'New Oriental Education & Technology Group Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'TAL', name: 'TAL Education Group', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'ZI', name: 'ZoomInfo Technologies Inc.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'FROG', name: 'JFrog Ltd.', marketCategory: 'Q', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
  { symbol: 'KIND', name: 'Nextdoor Holdings Inc.', marketCategory: 'N', financialStatus: 'N', roundLotSize: 100, etf: false, nextShares: false },
]

function parseRow(line: string): NasdaqStock | null {
  const cols = line.split('|')
  if (cols.length < 8) return null

  const symbol = cols[0]?.trim() ?? ''
  const name = cols[1]?.trim() ?? ''
  const marketCategory = cols[2]?.trim() ?? ''
  const testIssue = cols[3]?.trim()
  const financialStatus = cols[4]?.trim() ?? ''
  const roundLotSize = parseInt(cols[5]?.trim() ?? '100', 10)
  const etf = cols[6]?.trim() === 'Y'
  const nextShares = cols[7]?.trim() === 'Y'

  if (!symbol || !name) return null
  if (testIssue === 'Y') return null
  // Skip footer rows like "File Creation Time|..."
  if (symbol.startsWith('File Creation')) return null

  return { symbol, name, marketCategory, financialStatus, roundLotSize, etf, nextShares }
}

/**
 * Fetches and parses the full NASDAQ listed companies file.
 * Falls back to the static FALLBACK_STOCKS dataset on network errors.
 */
export async function fetchNasdaqStocks(): Promise<NasdaqStock[]> {
  try {
    const response = await fetch(NASDAQ_URL)
    if (!response.ok) {
      console.warn('[nasdaqStocks] Fetch failed, using fallback data.')
      return FALLBACK_STOCKS
    }

    const text = await response.text()
    const lines = text.split('\n')

    // First line is the header; last line may be empty or footer
    const dataLines = lines.slice(1)

    const stocks: NasdaqStock[] = []
    for (const line of dataLines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const stock = parseRow(trimmed)
      if (stock) stocks.push(stock)
    }

    return stocks.length > 0 ? stocks : FALLBACK_STOCKS
  } catch (err) {
    console.warn('[nasdaqStocks] Error fetching data, using fallback.', err)
    return FALLBACK_STOCKS
  }
}
