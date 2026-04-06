/**
 * Economy API Routes — /api/economy/*
 *
 * Exposes GBUX price feed, on-chain balance tracking, supply data,
 * Raydium pool info, and swap operations.
 *
 * Data sources:
 *   - DexScreener API (via gbuxPriceFeed.ts)
 *   - Solana RPC (via onChainTracker.ts)
 *   - Grudge backend VPS (via proxy for server-side DB data)
 */

import type { Express, Request, Response } from "express";
import {
  getGbuxPrice,
  getGbuxPriceHistory,
  getGbuxRateUsd,
  getGbuxMint,
  startPriceFeed,
} from "../services/gbuxPriceFeed";
import {
  getWalletBalances,
  getAgentWalletBalances,
  getGbuxTotalSupply,
  getGbuxMintAddress,
  getAgentWalletAddress,
} from "../services/onChainTracker";

const BACKEND = process.env.GRUDGE_BACKEND_URL || "https://api.grudge-studio.com";
const GBUX_MINT = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
const RAYDIUM_SWAP_URL = `https://raydium.io/swap/?inputMint=sol&outputMint=${GBUX_MINT}`;
const DEXSCREENER_URL = `https://dexscreener.com/solana/${GBUX_MINT}`;

// Start price feed on module load (safe for serverless — first request triggers initial fetch)
startPriceFeed();

export function registerEconomyRoutes(app: Express) {
  // ═══════════════════════════════════════════
  // GET /api/economy/overview
  // Full economy snapshot: price, supply, agent wallet, links
  // ═══════════════════════════════════════════
  app.get("/api/economy/overview", async (_req: Request, res: Response) => {
    try {
      const [price, supply, agentWallet] = await Promise.all([
        getGbuxPrice(),
        getGbuxTotalSupply(),
        getAgentWalletBalances(),
      ]);

      res.json({
        gbux: {
          mint: GBUX_MINT,
          priceUsd: price.priceUsd,
          priceNative: price.priceNative,
          priceChange24h: price.priceChange24h,
          volume24h: price.volume24h,
          marketCap: price.marketCap,
          liquidity: price.liquidity,
          fdv: price.fdv,
          source: price.source,
          lastUpdated: price.lastUpdated,
        },
        supply: {
          onChainTotal: supply.totalSupply,
          decimals: supply.decimals,
          fetchedAt: supply.fetchedAt,
        },
        agentWallet: {
          address: agentWallet.address,
          solBalance: agentWallet.solBalance,
          gbuxBalance: agentWallet.gbuxBalance,
          fetchedAt: agentWallet.fetchedAt,
        },
        links: {
          raydiumSwap: RAYDIUM_SWAP_URL,
          dexscreener: DEXSCREENER_URL,
          solscan: `https://solscan.io/token/${GBUX_MINT}`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Economy overview failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/gbux/price
  // Current GBUX price data
  // ═══════════════════════════════════════════
  app.get("/api/economy/gbux/price", async (_req: Request, res: Response) => {
    try {
      const price = await getGbuxPrice();
      res.json(price);
    } catch (err: any) {
      res.status(500).json({ error: "Price fetch failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/gbux/price-history
  // Price over time (up to 24h at 1-min intervals)
  // ═══════════════════════════════════════════
  app.get("/api/economy/gbux/price-history", (_req: Request, res: Response) => {
    const history = getGbuxPriceHistory();
    res.json({
      count: history.length,
      maxEntries: 1440,
      intervalMs: 60000,
      history,
    });
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/gbux/supply
  // On-chain total supply
  // ═══════════════════════════════════════════
  app.get("/api/economy/gbux/supply", async (_req: Request, res: Response) => {
    try {
      const supply = await getGbuxTotalSupply();
      res.json({
        mint: GBUX_MINT,
        ...supply,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Supply fetch failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/wallet/:address
  // On-chain SOL + GBUX balance for any wallet
  // ═══════════════════════════════════════════
  app.get("/api/economy/wallet/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      if (!address || address.length < 32) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const balances = await getWalletBalances(address);
      const price = await getGbuxRateUsd();
      res.json({
        ...balances,
        gbuxValueUsd: balances.gbuxBalance * price,
        gbuxPriceUsd: price,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Wallet balance failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/agent-wallet
  // AI agent wallet balances
  // ═══════════════════════════════════════════
  app.get("/api/economy/agent-wallet", async (_req: Request, res: Response) => {
    try {
      const balances = await getAgentWalletBalances();
      const price = await getGbuxRateUsd();
      res.json({
        ...balances,
        gbuxValueUsd: balances.gbuxBalance * price,
        gbuxPriceUsd: price,
        configuredAddress: getAgentWalletAddress(),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Agent wallet failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/raydium/pool
  // Raydium pool stats (from DexScreener data)
  // ═══════════════════════════════════════════
  app.get("/api/economy/raydium/pool", async (_req: Request, res: Response) => {
    try {
      const price = await getGbuxPrice();
      res.json({
        dexId: price.dexId,
        pairAddress: price.pairAddress,
        baseToken: price.baseToken,
        quoteToken: price.quoteToken,
        priceUsd: price.priceUsd,
        priceNative: price.priceNative,
        volume24h: price.volume24h,
        liquidity: price.liquidity,
        marketCap: price.marketCap,
        fdv: price.fdv,
        priceChange24h: price.priceChange24h,
        links: {
          dexscreener: price.url,
          raydiumSwap: RAYDIUM_SWAP_URL,
        },
        source: price.source,
        lastUpdated: price.lastUpdated,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Pool data failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // POST /api/economy/swap/quote
  // Get a swap quote using live GBUX price
  // Body: { direction: "buy"|"sell", amount: number, currency: "usd"|"sol"|"gbux" }
  // ═══════════════════════════════════════════
  app.post("/api/economy/swap/quote", async (req: Request, res: Response) => {
    try {
      const { direction = "buy", amount = 0, currency = "usd" } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "amount must be positive" });
      }

      const price = await getGbuxPrice();
      const gbuxPriceUsd = price.priceUsd;
      const gbuxPriceSol = price.priceNative;

      let quote: any = {
        direction,
        inputAmount: amount,
        inputCurrency: currency,
        gbuxPriceUsd,
        gbuxPriceSol,
        source: price.source,
      };

      if (direction === "buy") {
        if (currency === "usd") {
          quote.gbuxAmount = amount / gbuxPriceUsd;
          quote.solAmount = gbuxPriceSol > 0 ? (amount / gbuxPriceUsd) * gbuxPriceSol : null;
        } else if (currency === "sol") {
          quote.gbuxAmount = gbuxPriceSol > 0 ? amount / gbuxPriceSol : 0;
          quote.usdValue = (quote.gbuxAmount * gbuxPriceUsd);
        }
      } else {
        // sell GBUX
        quote.usdValue = amount * gbuxPriceUsd;
        quote.solValue = amount * gbuxPriceSol;
      }

      quote.raydiumSwapUrl = RAYDIUM_SWAP_URL;
      quote.note = "Use Raydium for actual on-chain swaps. This is a price estimate only.";

      res.json(quote);
    } catch (err: any) {
      res.status(500).json({ error: "Quote failed", detail: err.message });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/wallets
  // Proxy to backend for all server-side wallet accounts
  // ═══════════════════════════════════════════
  app.get("/api/economy/wallets", async (req: Request, res: Response) => {
    try {
      const headers: Record<string, string> = {};
      if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
      const r = await fetch(`${BACKEND}/api/economy/wallets`, { headers });
      if (r.ok) {
        res.json(await r.json());
      } else {
        // Fallback: return agent wallet only
        const agent = await getAgentWalletBalances();
        res.json({
          wallets: [{ label: "AI Agent", ...agent }],
          source: "on-chain-only",
          note: "Backend unavailable — showing on-chain data only",
        });
      }
    } catch {
      const agent = await getAgentWalletBalances();
      res.json({
        wallets: [{ label: "AI Agent", ...agent }],
        source: "on-chain-only",
      });
    }
  });

  // ═══════════════════════════════════════════
  // GET /api/economy/transactions
  // Proxy to backend for recent swap/reward/auction transactions
  // ═══════════════════════════════════════════
  app.get("/api/economy/transactions", async (req: Request, res: Response) => {
    try {
      const headers: Record<string, string> = {};
      if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
      const limit = req.query.limit || "50";
      const r = await fetch(`${BACKEND}/api/economy/transactions?limit=${limit}`, { headers });
      if (r.ok) {
        res.json(await r.json());
      } else {
        res.json({ transactions: [], note: "Backend unavailable" });
      }
    } catch {
      res.json({ transactions: [], note: "Backend unavailable" });
    }
  });

  console.log("✅ Economy routes registered → /api/economy/*");
}
