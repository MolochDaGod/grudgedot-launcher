/**
 * Grudge NFT Service
 *
 * Shared cNFT utilities used by Card Forge, Character mint, and future systems.
 * All minting goes through the server-side Crossmint integration.
 */

import { getAuthData } from "@/lib/auth";

// ── GRD-17 Hash ──────────────────────────────────────────────────────────────

/**
 * Compute a deterministic GRD-17 asset hash.
 * Format: GRD-17-{TIMESTAMP_BASE36}-{SHA256[:8]}-{SHA256[8:16]}
 */
export async function grd17Hash(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  const hex = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().padStart(8, "0");
  return `GRD-17-${ts}-${hex.slice(0, 8)}-${hex.slice(8, 16)}`;
}

// ── Auth helper ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const auth = getAuthData();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth?.token) h["Authorization"] = `Bearer ${auth.token}`;
  return h;
}

// ── Mint Character ───────────────────────────────────────────────────────────

export interface MintCharacterResult {
  success: boolean;
  mintAddress?: string;
  collection?: string;
  actionId?: string;
  error?: string;
}

/**
 * Mint a Grudge character as a Solana cNFT.
 * Calls POST /api/nft/mint-character on the server.
 */
export async function mintCharacterAsNFT(
  characterId: string,
): Promise<MintCharacterResult> {
  const res = await fetch("/api/nft/mint-character", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ characterId }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || "Mint failed" };
  }

  return {
    success: true,
    mintAddress: data.mintAddress,
    collection: data.collection,
    actionId: data.actionId,
  };
}

// ── Mint Generic Asset (Cards, Items) ────────────────────────────────────────

export interface MintAssetResult {
  success: boolean;
  actionId?: string;
  txHash?: string;
  error?: string;
}

/**
 * Mint a generic asset (card, item, etc.) as a Solana cNFT.
 * Calls POST /api/nft/mint on the server.
 */
export async function mintAssetAsNFT(payload: {
  name: string;
  description?: string;
  imageUrl: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}): Promise<MintAssetResult> {
  const res = await fetch("/api/nft/mint", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error || "Mint failed" };
  }

  return {
    success: true,
    actionId: data.actionId,
    txHash: data.txHash,
  };
}
