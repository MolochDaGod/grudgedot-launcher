/**
 * GBUX Price Feed Service
 *
 * Polls DexScreener API for live GBuX/SOL price data from Raydium.
 * Caches current price, 24h volume, market cap, liquidity, and tracks
 * price history for dashboard charts.
 *
 * Token mint: 55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray
 * DexScreener endpoint: https://api.dexscreener.com/latest/dex/tokens/{mint}
 */

const GBUX_MINT = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${GBUX_MINT}`;
const POLL_INTERVAL_MS = 60_000; // 60 seconds
const PRICE_HISTORY_MAX = 1440; // 24h at 1min intervals
const FALLBACK_PRICE_USD = 0.001;

export interface GbuxPriceData {
  priceUsd: number;
  priceNative: number; // price in SOL
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  fdv: number;
  pairAddress: string;
  dexId: string;
  baseToken: { name: string; symbol: string; address: string };
  quoteToken: { name: string; symbol: string; address: string };
  url: string;
  lastUpdated: string;
  source: "dexscreener" | "fallback";
}

export interface PriceHistoryEntry {
  timestamp: string;
  priceUsd: number;
  volume24h: number;
}

// ── In-memory cache ──
let cachedPrice: GbuxPriceData | null = null;
const priceHistory: PriceHistoryEntry[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

function fallbackPrice(): GbuxPriceData {
  return {
    priceUsd: FALLBACK_PRICE_USD,
    priceNative: 0,
    priceChange24h: 0,
    volume24h: 0,
    marketCap: 0,
    liquidity: 0,
    fdv: 0,
    pairAddress: "",
    dexId: "raydium",
    baseToken: { name: "GBuX", symbol: "GBUX", address: GBUX_MINT },
    quoteToken: { name: "SOL", symbol: "SOL", address: "" },
    url: `https://dexscreener.com/solana/${GBUX_MINT}`,
    lastUpdated: new Date().toISOString(),
    source: "fallback",
  };
}

/** Fetch fresh price data from DexScreener. */
async function fetchPrice(): Promise<GbuxPriceData> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(DEXSCREENER_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`DexScreener ${res.status}`);

    const data = await res.json();
    const pairs = data.pairs || [];

    // Find the best Raydium pair (highest liquidity)
    const raydiumPair =
      pairs.find((p: any) => p.dexId === "raydium") || pairs[0];

    if (!raydiumPair) throw new Error("No pairs found");

    return {
      priceUsd: parseFloat(raydiumPair.priceUsd) || FALLBACK_PRICE_USD,
      priceNative: parseFloat(raydiumPair.priceNative) || 0,
      priceChange24h: raydiumPair.priceChange?.h24 || 0,
      volume24h: raydiumPair.volume?.h24 || 0,
      marketCap: raydiumPair.marketCap || 0,
      liquidity: raydiumPair.liquidity?.usd || 0,
      fdv: raydiumPair.fdv || 0,
      pairAddress: raydiumPair.pairAddress || "",
      dexId: raydiumPair.dexId || "raydium",
      baseToken: raydiumPair.baseToken || {
        name: "GBuX",
        symbol: "GBUX",
        address: GBUX_MINT,
      },
      quoteToken: raydiumPair.quoteToken || {
        name: "SOL",
        symbol: "SOL",
        address: "",
      },
      url:
        raydiumPair.url ||
        `https://dexscreener.com/solana/${GBUX_MINT}`,
      lastUpdated: new Date().toISOString(),
      source: "dexscreener",
    };
  } catch (err: any) {
    console.warn(`[gbux-price] DexScreener fetch failed: ${err.message}`);
    return fallbackPrice();
  }
}

/** Poll price and update cache + history. */
async function pollPrice() {
  const price = await fetchPrice();
  cachedPrice = price;

  // Append to history
  priceHistory.push({
    timestamp: price.lastUpdated,
    priceUsd: price.priceUsd,
    volume24h: price.volume24h,
  });

  // Trim history to max size
  while (priceHistory.length > PRICE_HISTORY_MAX) {
    priceHistory.shift();
  }
}

// ── Public API ──

/** Get the current cached GBUX price. Fetches on first call. */
export async function getGbuxPrice(): Promise<GbuxPriceData> {
  if (!cachedPrice) {
    await pollPrice();
  }
  return cachedPrice!;
}

/** Get price history (up to 24h at 1-min intervals). */
export function getGbuxPriceHistory(): PriceHistoryEntry[] {
  return [...priceHistory];
}

/** Get the current GBUX → USD rate. Falls back to $0.001. */
export async function getGbuxRateUsd(): Promise<number> {
  const price = await getGbuxPrice();
  return price.priceUsd;
}

/** Start the background polling loop. Call once at startup. */
export function startPriceFeed() {
  if (pollTimer) return; // already running
  console.log(
    `[gbux-price] Starting price feed (poll every ${POLL_INTERVAL_MS / 1000}s)`
  );
  pollPrice(); // initial fetch
  pollTimer = setInterval(pollPrice, POLL_INTERVAL_MS);
}

/** Stop the background polling loop. */
export function stopPriceFeed() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Get GBUX token mint address. */
export function getGbuxMint(): string {
  return GBUX_MINT;
}
