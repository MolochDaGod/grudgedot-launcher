/**
 * NFT Minting Routes
 *
 * POST /api/nft/mint-character — Mint a Grudge character as a Solana cNFT via Crossmint
 * POST /api/nft/mint           — Generic asset mint (cards, items, etc.)
 */

import type { Express } from "express";
import { requireAuth } from "../middleware/grudgeJwt";
import { db } from "../db";
import { accounts, grudgeCharacters } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const CROSSMINT_API = "https://www.crossmint.com/api/2025-06-09";
const CROSSMINT_KEY = process.env.CROSSMINT_SERVER_API_KEY || "";
const NFT_COLLECTION = process.env.CROSSMINT_COLLECTION_ID || "default";

export function registerNftRoutes(app: Express) {
  // ─── POST /api/nft/mint-character ───
  app.post("/api/nft/mint-character", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId" });

      if (!CROSSMINT_KEY) {
        return res.status(503).json({ error: "Crossmint API key not configured" });
      }

      const { characterId } = req.body;
      if (!characterId) {
        return res.status(400).json({ error: "characterId is required" });
      }

      // Look up account + character
      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) return res.status(404).json({ error: "Account not found" });

      const [char] = await db
        .select()
        .from(grudgeCharacters)
        .where(and(eq(grudgeCharacters.id, characterId), eq(grudgeCharacters.accountId, acct.id)))
        .limit(1);

      if (!char) return res.status(404).json({ error: "Character not found" });

      if (char.isNft) {
        return res.status(409).json({ error: "Character is already minted", mintAddress: char.nftMintAddress });
      }

      // Build NFT metadata
      const attributes = [
        { trait_type: "Race", value: char.raceId || "Unknown" },
        { trait_type: "Class", value: char.classId || "Unknown" },
        { trait_type: "Level", value: String(char.level) },
        { trait_type: "Faction", value: char.faction || "None" },
        { trait_type: "Gold", value: String(char.gold) },
        { trait_type: "GrudgeID", value: grudgeId },
      ];

      // Determine recipient wallet
      const recipient = acct.walletAddress
        ? `solana:${acct.walletAddress}`
        : acct.email
          ? `email:${acct.email}:solana`
          : `userId:grudge-${grudgeId}:solana`;

      // Mint via Crossmint
      const mintRes = await fetch(`${CROSSMINT_API}/minting/collections/${NFT_COLLECTION}/nfts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": CROSSMINT_KEY,
        },
        body: JSON.stringify({
          recipient,
          metadata: {
            name: char.name,
            description: `Grudge Warlord — ${char.raceId} ${char.classId} (Level ${char.level})`,
            image: char.avatarUrl || `https://objectstore.grudge-studio.com/assets/characters/races/${(char.raceId || "human").toLowerCase()}/preview.png`,
            attributes,
          },
        }),
      });

      if (!mintRes.ok) {
        const errText = await mintRes.text();
        console.error("Crossmint mint failed:", mintRes.status, errText);
        return res.status(502).json({ error: "Mint failed", details: errText });
      }

      const mintData = await mintRes.json();
      const mintAddress = mintData.onChain?.mintHash || mintData.id || "";
      const collection = NFT_COLLECTION;

      // Update character with NFT fields
      await db
        .update(grudgeCharacters)
        .set({
          isNft: true,
          nftMintAddress: mintAddress,
          nftCollection: collection,
          nftMintedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(grudgeCharacters.id, characterId));

      console.log(`✅ Character ${char.name} minted as cNFT: ${mintAddress}`);

      return res.status(201).json({
        success: true,
        mintAddress,
        collection,
        actionId: mintData.actionId || mintData.id,
      });
    } catch (err: any) {
      console.error("POST /api/nft/mint-character error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── POST /api/nft/mint ───
  // Generic asset mint (cards, items, etc.)
  app.post("/api/nft/mint", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId" });

      if (!CROSSMINT_KEY) {
        return res.status(503).json({ error: "Crossmint API key not configured" });
      }

      const { name, description, imageUrl, attributes = [] } = req.body;
      if (!name || !imageUrl) {
        return res.status(400).json({ error: "name and imageUrl are required" });
      }

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) return res.status(404).json({ error: "Account not found" });

      const recipient = acct.walletAddress
        ? `solana:${acct.walletAddress}`
        : acct.email
          ? `email:${acct.email}:solana`
          : `userId:grudge-${grudgeId}:solana`;

      const mintRes = await fetch(`${CROSSMINT_API}/minting/collections/${NFT_COLLECTION}/nfts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": CROSSMINT_KEY,
        },
        body: JSON.stringify({
          recipient,
          metadata: { name, description, image: imageUrl, attributes },
        }),
      });

      if (!mintRes.ok) {
        const errText = await mintRes.text();
        return res.status(502).json({ error: "Mint failed", details: errText });
      }

      const data = await mintRes.json();
      return res.status(201).json({
        success: true,
        actionId: data.actionId || data.id,
        txHash: data.onChain?.mintHash,
      });
    } catch (err: any) {
      console.error("POST /api/nft/mint error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  console.log("✅ NFT routes registered (/api/nft/*)");
}
