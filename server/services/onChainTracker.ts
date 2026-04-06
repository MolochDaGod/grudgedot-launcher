/**
 * On-Chain Balance Tracker
 *
 * Reads Solana blockchain for GBUX SPL token balances and SOL balances.
 * Uses @solana/web3.js via RPC — no private keys needed (read-only).
 *
 * GBUX token mint: 55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray
 * AI agent wallet: EiENMsEXUYjYWNaVLsHr3jX3XZBY6gDKmz1FtbVfARt9
 */

const GBUX_MINT = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
const AI_AGENT_WALLET = process.env.AI_AGENT_SOL_ADDRESS || "EiENMsEXUYjYWNaVLsHr3jX3XZBY6gDKmz1FtbVfARt9";
const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;
const GBUX_DECIMALS = 9; // SPL token decimals

export interface OnChainBalance {
  address: string;
  solBalance: number;
  gbuxBalance: number;
  gbuxRaw: string; // raw token amount before decimal adjustment
  fetchedAt: string;
}

export interface TokenSupplyInfo {
  totalSupply: number;
  totalSupplyRaw: string;
  decimals: number;
  fetchedAt: string;
}

// ── Solana RPC helpers (no SDK dependency — uses raw JSON-RPC) ──

async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "RPC error");
    return data.result;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/** Get SOL balance for an address. */
export async function getSolBalance(address: string): Promise<number> {
  try {
    const result = await rpcCall("getBalance", [address, { commitment: "confirmed" }]);
    return (result?.value || 0) / LAMPORTS_PER_SOL;
  } catch (err: any) {
    console.warn(`[on-chain] SOL balance error for ${address}: ${err.message}`);
    return 0;
  }
}

/**
 * Get GBUX SPL token balance for a wallet address.
 * Uses getTokenAccountsByOwner to find all GBUX token accounts.
 */
export async function getGbuxBalance(walletAddress: string): Promise<number> {
  try {
    const result = await rpcCall("getTokenAccountsByOwner", [
      walletAddress,
      { mint: GBUX_MINT },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);

    const accounts = result?.value || [];
    let total = 0;
    for (const acct of accounts) {
      const info = acct.account?.data?.parsed?.info;
      if (info?.tokenAmount) {
        total += parseFloat(info.tokenAmount.uiAmountString || "0");
      }
    }
    return total;
  } catch (err: any) {
    console.warn(`[on-chain] GBUX balance error for ${walletAddress}: ${err.message}`);
    return 0;
  }
}

/** Get full on-chain balances (SOL + GBUX) for a wallet. */
export async function getWalletBalances(address: string): Promise<OnChainBalance> {
  const [solBalance, gbuxBalance] = await Promise.all([
    getSolBalance(address),
    getGbuxBalance(address),
  ]);

  return {
    address,
    solBalance,
    gbuxBalance,
    gbuxRaw: Math.round(gbuxBalance * 10 ** GBUX_DECIMALS).toString(),
    fetchedAt: new Date().toISOString(),
  };
}

/** Get the AI agent wallet balances. */
export async function getAgentWalletBalances(): Promise<OnChainBalance> {
  return getWalletBalances(AI_AGENT_WALLET);
}

/** Get total GBUX token supply from the mint. */
export async function getGbuxTotalSupply(): Promise<TokenSupplyInfo> {
  try {
    const result = await rpcCall("getTokenSupply", [GBUX_MINT, { commitment: "confirmed" }]);
    const supply = result?.value;
    return {
      totalSupply: parseFloat(supply?.uiAmountString || "0"),
      totalSupplyRaw: supply?.amount || "0",
      decimals: supply?.decimals || GBUX_DECIMALS,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn(`[on-chain] Token supply error: ${err.message}`);
    return {
      totalSupply: 0,
      totalSupplyRaw: "0",
      decimals: GBUX_DECIMALS,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/** Get addresses. */
export function getGbuxMintAddress(): string { return GBUX_MINT; }
export function getAgentWalletAddress(): string { return AI_AGENT_WALLET; }
