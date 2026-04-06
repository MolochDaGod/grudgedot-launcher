/**
 * Card Forge — TCG Card Editor
 *
 * Three-panel layout:
 *  Left   — card name, type, rarity, cost, ATK, HP, lore, abilities
 *  Center — live card preview (HTML Canvas layered composite)
 *  Right  — tabbed panel: Assets | AI Forge | Effects | Export + Mint
 *
 * Export pipeline:
 *  1. Flatten canvas → PNG blob
 *  2. Compute GRD-17 hash (SHA-256 over card JSON + timestamp)
 *  3. Upload PNG + JSON to Grudge object storage via /api/assets/upload
 *  4. Mint Solana cNFT via /api/nft/mint (Crossmint backend)
 *  5. Mirror record to GRUDACHAIN / Puter storage
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, Sparkles, Layers, RefreshCw,
  Image as ImageIcon, Zap, Database, Link, Loader2,
  ChevronDown, ChevronUp, Lock, Coins,
  Copy, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type CardType   = "minion" | "tower" | "spell";
type CardClass  = "melee" | "ranged" | "magical" | "tank";

interface CardDef {
  name:        string;
  rarity:      CardRarity;
  type:        CardType;
  cardClass:   CardClass;
  cost:        number;
  attack:      number;
  health:      number;
  description: string;
  abilities:   string;        // comma-separated
  artUrl:      string;        // URL or data-URL for card art
  frameOverride: string;      // optional custom frame URL
  lore:        string;
}

interface Effects {
  bloom:      number;         // 0-1
  vignette:   number;         // 0-1
  chromatic:  number;         // 0-0.02
  grain:      number;         // 0-1
  saturation: number;         // 0-2
  contrast:   number;         // 0-2
  hue:        number;         // -180 to 180
}

interface MintResult {
  grd17:    string;           // hash
  storageUrl: string;
  solanaTx?: string;
  grudaChainId?: string;
}

// ── Rarity config ─────────────────────────────────────────────────────────────

const RARITY: Record<CardRarity, { bg: string; glow: string; nameCol: string; border: string; label: string }> = {
  common:    { bg: "linear-gradient(160deg,#22262a,#141618)", glow: "0 0 10px rgba(156,163,175,0.3)", nameCol: "#e5e7eb", border: "#9ca3af", label: "COMMON" },
  uncommon:  { bg: "linear-gradient(160deg,#1a0a2e,#12061c)", glow: "0 0 16px rgba(147,51,234,0.45)", nameCol: "#d8b4fe", border: "#c084fc", label: "UNCOMMON" },
  rare:      { bg: "linear-gradient(160deg,#0d2818,#0a1e10)", glow: "0 0 18px rgba(34,197,94,0.4)",   nameCol: "#86efac", border: "#4ade80", label: "RARE" },
  epic:      { bg: "linear-gradient(160deg,#1c1000,#120a00)", glow: "0 0 22px rgba(234,179,8,0.55)",  nameCol: "#fde68a", border: "#fbbf24", label: "EPIC" },
  legendary: { bg: "linear-gradient(160deg,#200a00,#150500)", glow: "0 0 32px rgba(251,191,36,0.8)",  nameCol: "#fef08a", border: "#fcd34d", label: "LEGENDARY" },
};

const FRAME_URLS: Record<CardRarity, string> = {
  common:    "https://dopebudz.thc-labz.xyz/card-art/frames/common-grey.png",
  uncommon:  "https://dopebudz.thc-labz.xyz/card-art/frames/uncommon-purple.png",
  rare:      "https://dopebudz.thc-labz.xyz/card-art/frames/rare-green.png",
  epic:      "https://dopebudz.thc-labz.xyz/card-art/frames/epic-gold.png",
  legendary: "https://dopebudz.thc-labz.xyz/card-art/frames/legendary-weed.png",
};

// ── GRD-17 Hash ───────────────────────────────────────────────────────────────

async function grd17Hash(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const ts  = Date.now().toString(36).toUpperCase().padStart(8, "0");
  // Format: GRD-17-{TIMESTAMP}-{SHA256[:8]}-{SHA256[8:16]}
  return `GRD-17-${ts}-${hex.slice(0, 8)}-${hex.slice(8, 16)}`;
}

// ── Canvas Renderer ───────────────────────────────────────────────────────────

const CARD_W = 240;
const CARD_H = 336;

async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  card: CardDef,
  effects: Effects,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width  = CARD_W;
  canvas.height = CARD_H;

  const rc = RARITY[card.rarity];

  // L1: rarity gradient background
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  const [c1, c2] = rc.bg.replace("linear-gradient(160deg,", "").replace(")", "").split(",").map(s => s.trim());
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.roundRect(0, 0, CARD_W, CARD_H, 10);
  ctx.fill();

  // L2: card art (clipped to art window)
  if (card.artUrl) {
    try {
      const img = await loadImage(card.artUrl);
      ctx.save();
      const artX = Math.round(CARD_W * 0.07);
      const artY = Math.round(CARD_H * 0.08);
      const artW = CARD_W - artX * 2;
      const artH = Math.round(CARD_H * 0.47);
      ctx.beginPath();
      ctx.roundRect(artX, artY, artW, artH, 4);
      ctx.clip();
      ctx.filter = buildCssFilter(effects);
      ctx.drawImage(img, artX, artY, artW, artH);
      ctx.filter = "none";
      ctx.restore();
    } catch { /* art load failed — skip */ }
  }

  // L3: frame PNG overlay
  const frameSrc = card.frameOverride || FRAME_URLS[card.rarity];
  try {
    const frameImg = await loadImage(frameSrc);
    ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);
  } catch { /* frame load failed */ }

  // L4: effects overlay (vignette, grain)
  applyCanvasEffects(ctx, effects);

  // L5: card name (over frame name bar area)
  ctx.save();
  ctx.font = `bold ${Math.round(CARD_H * 0.034)}px 'LEMONMILK','Rajdhani',sans-serif`;
  ctx.fillStyle = rc.nameCol;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 4;
  ctx.fillText(card.name.toUpperCase().slice(0, 22), CARD_W / 2, Math.round(CARD_H * 0.595));
  ctx.restore();

  // L6: abilities (2 lines max)
  const abilities = card.abilities.split(",").map(s => s.trim()).filter(Boolean).slice(0, 2);
  ctx.save();
  ctx.font = `${Math.round(CARD_H * 0.026)}px 'LEMONMILK','Rajdhani',sans-serif`;
  ctx.fillStyle = "rgba(230,230,220,0.9)";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 3;
  abilities.forEach((ab, i) => {
    ctx.fillText(`▸ ${ab}`.slice(0, 28), Math.round(CARD_W * 0.12), Math.round(CARD_H * 0.67) + i * Math.round(CARD_H * 0.06));
  });
  ctx.restore();

  // L7: stat circles
  drawStatCircle(ctx, card.cost,   CARD_W - 18, 18,  "linear-gradient(135deg,#4c1d95,#2e1065)", "💎");
  if (card.attack > 0) drawStatCircle(ctx, card.attack, 18, CARD_H - 18, "linear-gradient(135deg,#b91c1c,#7f1d1d)", "⚔");
  if (card.health > 0) drawStatCircle(ctx, card.health, CARD_W - 18, CARD_H - 18, "linear-gradient(135deg,#15803d,#14532d)", "♥");
}

function drawStatCircle(ctx: CanvasRenderingContext2D, val: number, cx: number, cy: number, _grad: string, icon: string) {
  const r = 14;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = _grad.includes("4c1d95") ? "#4c1d95" : _grad.includes("b91c1c") ? "#b91c1c" : "#15803d";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `bold ${Math.round(r * 0.85)}px 'LEMONMILK',sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 3;
  ctx.fillText(String(val), cx, cy + 1);
  ctx.restore();
}

function buildCssFilter(e: Effects): string {
  const sat = `saturate(${e.saturation})`;
  const con = `contrast(${e.contrast})`;
  const hue = e.hue !== 0 ? `hue-rotate(${e.hue}deg)` : "";
  return [sat, con, hue].filter(Boolean).join(" ");
}

function applyCanvasEffects(ctx: CanvasRenderingContext2D, e: Effects) {
  // Vignette
  if (e.vignette > 0) {
    const vg = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, CARD_H * 0.2, CARD_W / 2, CARD_H / 2, CARD_H * 0.75);
    vg.addColorStop(0, "transparent");
    vg.addColorStop(1, `rgba(0,0,0,${e.vignette * 0.75})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }
  // Grain
  if (e.grain > 0) {
    const imageData = ctx.getImageData(0, 0, CARD_W, CARD_H);
    const d = imageData.data;
    const amount = e.grain * 40;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount;
      d[i]   = Math.min(255, Math.max(0, d[i]   + noise));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + noise));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }
  // Chromatic aberration (simple RGB channel offset)
  if (e.chromatic > 0) {
    const offset = Math.round(e.chromatic * CARD_W * 4);
    if (offset >= 1) {
      const snap = ctx.getImageData(0, 0, CARD_W, CARD_H);
      const temp = ctx.getImageData(0, 0, CARD_W, CARD_H);
      const src = snap.data;
      const dst = temp.data;
      for (let y = 0; y < CARD_H; y++) {
        for (let x = offset; x < CARD_W - offset; x++) {
          const i = (y * CARD_W + x) * 4;
          const rSrc = (y * CARD_W + x - offset) * 4;
          const bSrc = (y * CARD_W + x + offset) * 4;
          dst[i]   = src[rSrc];
          dst[i+2] = src[bSrc + 2];
        }
      }
      ctx.putImageData(temp, 0, 0);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Default card state ────────────────────────────────────────────────────────

const DEFAULT_CARD: CardDef = {
  name:          "New Card",
  rarity:        "common",
  type:          "minion",
  cardClass:     "melee",
  cost:          3,
  attack:        100,
  health:        200,
  description:   "Enter card description...",
  abilities:     "Rush, Harvest Strike",
  artUrl:        "",
  frameOverride: "",
  lore:          "",
};

const DEFAULT_FX: Effects = {
  bloom:      0.3,
  vignette:   0.3,
  chromatic:  0,
  grain:      0,
  saturation: 1.0,
  contrast:   1.0,
  hue:        0,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CardForgePage() {
  const { toast } = useToast();

  const [card, setCard]           = useState<CardDef>(DEFAULT_CARD);
  const [effects, setEffects]     = useState<Effects>(DEFAULT_FX);
  const [aiPrompt, setAiPrompt]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [minting, setMinting]     = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [showLore, setShowLore]   = useState(false);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  // Re-render card to canvas whenever card data or effects change
  useEffect(() => {
    if (!canvasRef.current) return;
    renderCardToCanvas(canvasRef.current, card, effects).catch(() => {});
  }, [card, effects, renderKey]);

  const setField = useCallback(<K extends keyof CardDef>(k: K, v: CardDef[K]) => {
    setCard(prev => ({ ...prev, [k]: v }));
  }, []);

  const setFx = useCallback(<K extends keyof Effects>(k: K, v: Effects[K]) => {
    setEffects(prev => ({ ...prev, [k]: v }));
  }, []);

  // ── Art upload ──────────────────────────────────────────────────────────────

  const handleArtFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setField("artUrl", ev.target?.result as string);
    };
    reader.readAsDataURL(f);
  };

  // ── AI art + lore generation ────────────────────────────────────────────────

  const handleAIGenerate = async (mode: "art" | "stats" | "lore") => {
    if (!aiPrompt.trim() && mode !== "stats") return;
    setAiLoading(true);
    try {
      if (mode === "stats") {
        // Ask GPT to suggest balanced stats for current card description
        const res = await fetch("/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `You are a TCG card designer. Suggest balanced stats (cost 1-10, attack 0-500, health 0-1000, abilities) for a ${card.rarity} ${card.cardClass} ${card.type} card named "${card.name}". Description: "${card.description}". Reply as JSON: {cost, attack, health, abilities}.`
            }],
            model: "gpt-4o",
          }),
        });
        const data = await res.json();
        try {
          const json = JSON.parse(data.content?.replace(/```json|```/g, "").trim() || "{}");
          if (json.cost)     setField("cost",      Number(json.cost));
          if (json.attack)   setField("attack",    Number(json.attack));
          if (json.health)   setField("health",    Number(json.health));
          if (json.abilities) setField("abilities", json.abilities);
          toast({ title: "Stats generated!" });
        } catch { toast({ title: "Could not parse stats", variant: "destructive" }); }
      }

      if (mode === "lore") {
        const res = await fetch("/api/openai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `Write 2 sentences of dark fantasy lore for a TCG card named "${card.name}" (${card.rarity} ${card.cardClass} ${card.type}). Prompt context: ${aiPrompt || card.description}. Reply with just the lore text.`
            }],
            model: "gpt-4o",
          }),
        });
        const data = await res.json();
        setField("lore", data.content || "");
        toast({ title: "Lore generated!" });
      }

      if (mode === "art") {
        // Generate art via DALL-E or HuggingFace (server-side proxy)
        const res = await fetch("/api/openai/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `TCG card art, dark fantasy style, character portrait: ${aiPrompt}. No text, no borders. Dramatic lighting.`,
            size: "512x512",
            quality: "standard",
          }),
        });
        const data = await res.json();
        if (data.url) {
          setField("artUrl", data.url);
          toast({ title: "Art generated!" });
        } else {
          toast({ title: data.error || "Image generation failed", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "AI request failed", description: err?.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── ObjectStore / Grudge storage asset pick ─────────────────────────────────

  const handleObjectStoreSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://molochdagod.github.io/ObjectStore/api/v1/asset-registry.json`);
      const data = await res.json();
      const all: any[] = Object.values(data.assets || {});
      const match = all.find(a =>
        a.filename.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase())
      );
      if (match) {
        setField("artUrl", match.cdn);
        toast({ title: `Asset loaded: ${match.name}` });
      } else {
        toast({ title: "No matching asset found", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "ObjectStore search failed", description: err?.message, variant: "destructive" });
    }
  };

  // ── Export to PNG ────────────────────────────────────────────────────────────

  const handleExportPng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${card.name.replace(/\s+/g, "_").toLowerCase()}_card.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast({ title: "Card exported as PNG!" });
  };

  // ── Mint to Grudge storage + Solana cNFT ─────────────────────────────────────

  const handleMint = async () => {
    if (!canvasRef.current) return;
    setMinting(true);
    setMintResult(null);

    try {
      // 1. Compose card JSON
      const cardJson = JSON.stringify({ ...card, effects, mintedAt: new Date().toISOString() });

      // 2. GRD-17 hash
      const grd17 = await grd17Hash(cardJson);
      console.log("[Card Forge] GRD-17:", grd17);

      // 3. PNG blob from canvas
      const pngBlob = await new Promise<Blob>((res, rej) => {
        canvasRef.current!.toBlob(b => b ? res(b) : rej(new Error("canvas empty")), "image/png");
      });

      // 4. Upload PNG via presigned URL flow
      const uploadMeta = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: `${grd17}.png`, contentType: "image/png" }),
      }).then(r => r.json());

      if (uploadMeta.uploadURL) {
        await fetch(uploadMeta.uploadURL, { method: "PUT", body: pngBlob, headers: { "Content-Type": "image/png" } });
      }
      const storageUrl = uploadMeta.publicURL || "";

      // 5. Register card asset in backend
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: card.name,
          type: "card",
          category: "TCG Cards",
          source: "card-forge",
          sourceUrl: storageUrl,
          previewUrl: storageUrl,
          tags: ["tcg", card.rarity, card.type, card.cardClass],
          description: card.description,
          metadata: { grd17, cardJson },
        }),
      }).catch(() => {});

      // 6. Attempt Solana cNFT mint via backend
      let solanaTx: string | undefined;
      try {
        const mintRes = await fetch("/api/nft/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: card.name,
            description: card.description || card.lore,
            imageUrl: storageUrl,
            attributes: [
              { trait_type: "Rarity",  value: card.rarity },
              { trait_type: "Type",    value: card.type },
              { trait_type: "Class",   value: card.cardClass },
              { trait_type: "Cost",    value: String(card.cost) },
              { trait_type: "Attack",  value: String(card.attack) },
              { trait_type: "Health",  value: String(card.health) },
              { trait_type: "GRD17",   value: grd17 },
            ],
          }),
        }).then(r => r.json());
        solanaTx = mintRes.actionId || mintRes.txHash;
      } catch { /* non-blocking — mint may not be wired yet */ }

      // 7. GRUDACHAIN mirror via Puter kv (server-side)
      let grudaChainId: string | undefined;
      try {
        const gcRes = await fetch("/api/gruda-chain/register-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grd17, storageUrl, cardJson }),
        }).then(r => r.json());
        grudaChainId = gcRes.id || gcRes.chainId;
      } catch { /* non-blocking */ }

      const result: MintResult = { grd17, storageUrl, solanaTx, grudaChainId };
      setMintResult(result);
      toast({ title: "Card minted!", description: `GRD-17: ${grd17}` });
    } catch (err: any) {
      toast({ title: "Mint failed", description: err?.message, variant: "destructive" });
    } finally {
      setMinting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-sidebar/60 backdrop-blur-sm shrink-0">
        <Layers className="w-5 h-5 text-yellow-400" />
        <span className="font-bold text-sm uppercase tracking-widest">Card Forge</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 bg-yellow-500/20 text-yellow-400 border-0">TCG + NFT</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setCard(DEFAULT_CARD)} className="text-xs h-7">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportPng} className="text-xs h-7">
          <Download className="w-3.5 h-3.5 mr-1" /> Export PNG
        </Button>
        <Button
          size="sm"
          onClick={handleMint}
          disabled={minting}
          className="text-xs h-7 bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
        >
          {minting
            ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Minting...</>
            : <><Coins className="w-3.5 h-3.5 mr-1" /> Mint NFT</>
          }
        </Button>
      </div>

      {/* Three-panel body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left: Card Metadata ── */}
        <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b bg-sidebar/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Card Data
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">

              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={card.name} onChange={e => setField("name", e.target.value)} className="h-8 text-sm" placeholder="Card name" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Rarity</Label>
                  <Select value={card.rarity} onValueChange={v => setField("rarity", v as CardRarity)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["common","uncommon","rare","epic","legendary"] as CardRarity[]).map(r => (
                        <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={card.type} onValueChange={v => setField("type", v as CardType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["minion","tower","spell"] as CardType[]).map(t => (
                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <Select value={card.cardClass} onValueChange={v => setField("cardClass", v as CardClass)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["melee","ranged","magical","tank"] as CardClass[]).map(c => (
                      <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: "Cost", icon: "💎", key: "cost",   max: 15 },
                  { label: "ATK",  icon: "⚔",  key: "attack", max: 999 },
                  { label: "HP",   icon: "♥",  key: "health", max: 999 },
                ] as const).map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{f.icon} {f.label}</Label>
                    <Input
                      type="number" min={0} max={f.max}
                      value={(card as any)[f.key]}
                      onChange={e => setField(f.key as any, Number(e.target.value))}
                      className="h-7 text-xs text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={card.description}
                  onChange={e => setField("description", e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                  placeholder="Card description..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Abilities (comma-separated)</Label>
                <Input
                  value={card.abilities}
                  onChange={e => setField("abilities", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Rush, Harvest Strike"
                />
              </div>

              <div className="space-y-1">
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowLore(v => !v)}
                >
                  {showLore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Lore / Flavour
                </button>
                {showLore && (
                  <Textarea
                    value={card.lore}
                    onChange={e => setField("lore", e.target.value)}
                    className="text-xs min-h-[48px] resize-none"
                    placeholder="Lore text..."
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* ── Center: Live Card Preview ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black/60 overflow-hidden gap-4 p-6">
          <div
            className="rounded-xl overflow-hidden relative"
            style={{
              boxShadow: RARITY[card.rarity].glow,
              border: `1px solid ${RARITY[card.rarity].border}30`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={CARD_W}
              height={CARD_H}
              className="block"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>

          {/* Rarity badge below preview */}
          <Badge
            className="text-xs font-black uppercase tracking-widest"
            style={{ background: RARITY[card.rarity].border + "30", color: RARITY[card.rarity].nameCol, borderColor: RARITY[card.rarity].border + "50" }}
          >
            {RARITY[card.rarity].label}
          </Badge>

          {/* Mint result panel */}
          {mintResult && (
            <div className="w-full max-w-xs space-y-1 bg-black/50 border border-yellow-800/40 rounded-xl p-3 text-[10px]">
              <div className="text-yellow-400 font-bold text-xs mb-2 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Minted
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-bold text-foreground">GRD-17:</span>
                <span className="font-mono truncate">{mintResult.grd17}</span>
                <button onClick={() => navigator.clipboard.writeText(mintResult.grd17)} className="ml-auto shrink-0">
                  <Copy className="w-3 h-3 hover:text-yellow-400 transition-colors" />
                </button>
              </div>
              {mintResult.storageUrl && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Database className="w-3 h-3 shrink-0" />
                  <a href={mintResult.storageUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-yellow-400 underline">
                    Grudge Storage
                  </a>
                  <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
                </div>
              )}
              {mintResult.solanaTx && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Link className="w-3 h-3 shrink-0" />
                  <span className="font-mono truncate">{mintResult.solanaTx.slice(0, 16)}…</span>
                  <Badge variant="secondary" className="ml-auto text-[8px] bg-green-500/20 text-green-400 border-0">Solana cNFT</Badge>
                </div>
              )}
              {mintResult.grudaChainId && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Database className="w-3 h-3 shrink-0" />
                  <span className="font-mono truncate">{mintResult.grudaChainId}</span>
                  <Badge variant="secondary" className="ml-auto text-[8px] bg-purple-500/20 text-purple-400 border-0">GRUDAChain</Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Tabbed Tools Panel ── */}
        <div className="w-72 shrink-0 border-l flex flex-col overflow-hidden">
          <Tabs defaultValue="assets" className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full rounded-none border-b h-9 grid grid-cols-4 bg-sidebar/60">
              <TabsTrigger value="assets"  className="text-[10px] px-1">Assets</TabsTrigger>
              <TabsTrigger value="ai"      className="text-[10px] px-1">AI Forge</TabsTrigger>
              <TabsTrigger value="effects" className="text-[10px] px-1">Effects</TabsTrigger>
              <TabsTrigger value="mint"    className="text-[10px] px-1">Mint</TabsTrigger>
            </TabsList>

            {/* Assets tab */}
            <TabsContent value="assets" className="flex-1 overflow-auto m-0 p-3 space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Upload Card Art</Label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleArtFile} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-xs h-8">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Image / Texture
                </Button>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Art URL</Label>
                <Input
                  value={card.artUrl}
                  onChange={e => setField("artUrl", e.target.value)}
                  placeholder="https://... or data:image/..."
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">ObjectStore Search</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="os-search"
                    placeholder="e.g. knight, sword, icon..."
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2 shrink-0"
                    onClick={() => handleObjectStoreSearch((document.getElementById("os-search") as HTMLInputElement)?.value || "")}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Search 5,728 assets from the Grudge ObjectStore registry.</p>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Custom Frame PNG</Label>
                <Input
                  value={card.frameOverride}
                  onChange={e => setField("frameOverride", e.target.value)}
                  placeholder="Leave blank to use rarity default"
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Override the rarity frame with any image URL.</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => setRenderKey(k => k + 1)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Preview
              </Button>
            </TabsContent>

            {/* AI Forge tab */}
            <TabsContent value="ai" className="flex-1 overflow-auto m-0 p-3 space-y-4">
              <div>
                <Label className="text-xs mb-1 block">AI Prompt</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe the character, scene, or style..."
                  className="text-xs min-h-[70px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5"
                  onClick={() => handleAIGenerate("art")}
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  Generate Card Art (DALL-E)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5"
                  onClick={() => handleAIGenerate("stats")}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Auto-balance Stats (GPT-4o)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5"
                  onClick={() => handleAIGenerate("lore")}
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Lore (GPT-4o)
                </Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-2 text-[10px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground text-[11px]">AI Pipeline</p>
                <p>Art → DALL-E 3 (512×512, dark fantasy portrait)</p>
                <p>Stats → GPT-4o balanced for rarity + class</p>
                <p>Lore → GPT-4o 2-sentence flavour text</p>
                <p>All generation uses Grudge AI API keys server-side.</p>
              </div>
            </TabsContent>

            {/* Effects tab */}
            <TabsContent value="effects" className="flex-1 overflow-auto m-0 p-3 space-y-3">
              {([
                { label: "Bloom", k: "bloom", min: 0, max: 1, step: 0.05 },
                { label: "Vignette", k: "vignette", min: 0, max: 1, step: 0.05 },
                { label: "Chromatic", k: "chromatic", min: 0, max: 0.02, step: 0.001 },
                { label: "Grain", k: "grain", min: 0, max: 1, step: 0.05 },
                { label: "Saturation", k: "saturation", min: 0, max: 2, step: 0.05 },
                { label: "Contrast", k: "contrast", min: 0, max: 2, step: 0.05 },
                { label: "Hue Shift", k: "hue", min: -180, max: 180, step: 1 },
              ] as const).map(f => (
                <div key={f.k} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px]">{f.label}</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(effects as any)[f.k].toFixed(f.step < 0.01 ? 3 : f.step < 1 ? 2 : 0)}
                    </span>
                  </div>
                  <Slider
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={[(effects as any)[f.k]]}
                    onValueChange={([v]) => setFx(f.k as keyof Effects, v as any)}
                    className="h-1.5"
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 mt-2"
                onClick={() => setEffects(DEFAULT_FX)}
              >
                Reset Effects
              </Button>
            </TabsContent>

            {/* Mint tab */}
            <TabsContent value="mint" className="flex-1 overflow-auto m-0 p-3 space-y-3">
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <p className="font-bold text-foreground">Mint Pipeline</p>
                <div className="space-y-1.5">
                  {[
                    { n: "1", label: "Compose canvas → PNG", icon: <ImageIcon className="w-3.5 h-3.5" /> },
                    { n: "2", label: "GRD-17 hash (SHA-256)", icon: <Lock className="w-3.5 h-3.5" /> },
                    { n: "3", label: "Upload PNG + JSON to Grudge storage", icon: <Database className="w-3.5 h-3.5" /> },
                    { n: "4", label: "Register asset in backend index", icon: <Layers className="w-3.5 h-3.5" /> },
                    { n: "5", label: "Mint Solana cNFT via Crossmint", icon: <Coins className="w-3.5 h-3.5 text-green-400" /> },
                    { n: "6", label: "Mirror to GRUDACHAIN via Puter", icon: <Link className="w-3.5 h-3.5 text-purple-400" /> },
                  ].map(step => (
                    <div key={step.n} className="flex items-center gap-2 bg-muted/20 rounded-lg px-2 py-1.5">
                      <span className="font-black text-foreground text-xs w-4 shrink-0">{step.n}</span>
                      {step.icon}
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs h-9"
                onClick={handleMint}
                disabled={minting}
              >
                {minting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Minting…</>
                  : <><Coins className="w-4 h-4 mr-2" /> Mint Card NFT</>
                }
              </Button>

              <Button
                variant="outline"
                className="w-full text-xs h-8"
                onClick={handleExportPng}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export PNG Only
              </Button>

              <div className="bg-muted/20 rounded-lg p-2 text-[10px] text-muted-foreground">
                <p className="font-bold text-foreground mb-1">Naming Convention</p>
                <p className="font-mono break-all">GRD-17-{"{TIMESTAMP}"}-{"{SHA256[:8]}"}-{"{SHA256[8:16]}"}</p>
                <p className="mt-1">Every card gets a unique deterministic ID derived from its normalized metadata + timestamp. Immutable once minted.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
