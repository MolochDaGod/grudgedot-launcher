import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  grudgeEconomyApi,
  type EconomyOverview,
  type AccountWalletData,
  type PriceHistoryEntry,
  type EconomyTransaction,
} from "@/lib/grudgeBackendApi";

/**
 * useGbuxEconomy — central hook for all GBUX economy data.
 *
 * Fetches:
 *  - Economy overview (GBUX price, supply, agent wallet, links)
 *  - User's account wallet (gold + GBUX balance, wallet address)
 *  - Price history (for charts)
 *  - Recent transactions
 *
 * All queries behind `enabled: isAuthenticated` except overview (public).
 */
export function useGbuxEconomy() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  // ── Economy overview (public — no auth needed) ──
  const overview = useQuery<EconomyOverview | null>({
    queryKey: ["economy", "overview"],
    queryFn: () => grudgeEconomyApi.getOverview(),
    staleTime: 60_000, // 1 min
    refetchInterval: 60_000,
  });

  // ── User's wallet balances ──
  const wallet = useQuery<AccountWalletData | null>({
    queryKey: ["economy", "my-wallet"],
    queryFn: () => grudgeEconomyApi.getMyWallet(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // ── Price history (for sparkline / chart) ──
  const priceHistory = useQuery<{ count: number; history: PriceHistoryEntry[] } | null>({
    queryKey: ["economy", "price-history"],
    queryFn: () => grudgeEconomyApi.getPriceHistory(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // ── Recent transactions ──
  const transactions = useQuery<{ transactions: EconomyTransaction[] } | null>({
    queryKey: ["economy", "transactions"],
    queryFn: () => grudgeEconomyApi.getTransactions(25),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // ── Ensure wallet mutation ──
  const ensureWallet = useMutation({
    mutationFn: () => grudgeEconomyApi.ensureWallet(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["economy", "my-wallet"] });
    },
  });

  // ── Derived values ──
  const gbuxPrice = overview.data?.gbux?.priceUsd ?? 0;
  const gbuxChange24h = overview.data?.gbux?.priceChange24h ?? 0;
  const gbuxBalance = wallet.data?.balances?.gbux ?? 0;
  const goldBalance = wallet.data?.balances?.gold ?? 0;
  const gbuxValueUsd = gbuxBalance * gbuxPrice;
  const walletAddress = wallet.data?.wallet?.walletAddress ?? null;
  const hasWallet = !!walletAddress;
  const links = overview.data?.links ?? null;
  const supply = overview.data?.supply ?? null;
  const agentWallet = overview.data?.agentWallet ?? null;
  const history = priceHistory.data?.history ?? [];
  const txList = transactions.data?.transactions ?? [];

  const isLoading =
    overview.isLoading || wallet.isLoading;

  return {
    // Raw queries (for refetch, error states, etc.)
    overview,
    wallet,
    priceHistory,
    transactions,
    ensureWallet,

    // Derived convenience values
    gbuxPrice,
    gbuxChange24h,
    gbuxBalance,
    goldBalance,
    gbuxValueUsd,
    walletAddress,
    hasWallet,
    links,
    supply,
    agentWallet,
    history,
    txList,
    isLoading,
  };
}
