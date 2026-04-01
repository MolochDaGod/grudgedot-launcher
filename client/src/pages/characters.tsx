/**
 * Characters Page — 3D Preview, Customization & Play Mode
 *
 * Each character card renders a 3D thumbnail of the race model.
 * "Customize" opens a full dialog with body sliders, color pickers, presets.
 * "Play" toggles WASD movement with over-shoulder camera.
 */

import { useState, useCallback, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGrudgeAccount, type GrudgeCharacterLocal } from "@/hooks/useGrudgeAccount";
import { mintCharacterAsNFT } from "@/lib/nft-service";
import {
  type CharacterCustomization,
  mergeCustomization,
  getCustomizationForRace,
  CUSTOMIZATION_SLIDERS,
  CUSTOMIZATION_COLORS,
  BODY_PRESETS,
} from "@/lib/character-customization";
import CharacterViewer3D from "@/components/CharacterViewer3D";
import {
  Sword, Shield, Zap, Heart, LogIn, Plus, Trash2,
  Coins, Loader2, Gem, Sparkles, Star, Palette,
  Play, Settings2, Save, X,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const RACES = [
  { id: "barbarian", label: "Barbarian", icon: "\u{1FA93}", color: "bg-orange-700" },
  { id: "dwarf",     label: "Dwarf",     icon: "\u26CF\uFE0F",  color: "bg-amber-800" },
  { id: "elf",       label: "Elf",       icon: "\u{1F3F9}", color: "bg-emerald-700" },
  { id: "human",     label: "Human",     icon: "\u2694\uFE0F",  color: "bg-blue-700" },
  { id: "orc",       label: "Orc",       icon: "\u{1F480}", color: "bg-red-800" },
  { id: "undead",    label: "Undead",    icon: "\u2620\uFE0F",  color: "bg-purple-800" },
] as const;

const CLASSES = [
  { id: "warrior",      label: "Warrior",      icon: Sword,    desc: "Shields, swords, 2H weapons. Stamina sprint." },
  { id: "mage",         label: "Mage",         icon: Zap,      desc: "Staffs, tomes, wands. Teleport blocks." },
  { id: "ranger",       label: "Ranger",       icon: Shield,   desc: "Bows, crossbows, daggers. Parry-counter." },
  { id: "shapeshifter", label: "Shapeshifter", icon: Sparkles, desc: "Bear, Raptor, Bird forms." },
] as const;

const CLASS_ICON_MAP: Record<string, typeof Sword> = {
  warrior: Sword, mage: Zap, ranger: Shield, shapeshifter: Sparkles,
};

function getRaceConfig(raceId: string | undefined) {
  return RACES.find((r) => r.id === raceId?.toLowerCase()) || RACES[3];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CharactersPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const {
    characters, charactersLoading,
    createCharacter, updateCharacter, deleteCharacter,
    hasWallet,
  } = useGrudgeAccount();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [newChar, setNewChar] = useState({ name: "", raceId: "human", classId: "warrior" });
  const [mintingId, setMintingId] = useState<string | null>(null);

  // Customize dialog state
  const [customizeChar, setCustomizeChar] = useState<GrudgeCharacterLocal | null>(null);
  const [customState, setCustomState] = useState<CharacterCustomization | null>(null);
  const [viewerMode, setViewerMode] = useState<"full" | "play">("full");

  // ── Handlers ──

  const handleCreate = () => {
    if (!newChar.name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    createCharacter.mutate(newChar, {
      onSuccess: () => {
        setShowCreate(false);
        setNewChar({ name: "", raceId: "human", classId: "warrior" });
        toast({ title: "Character Created" });
      },
      onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  };

  const handleDelete = (ch: GrudgeCharacterLocal) => {
    deleteCharacter.mutate(ch.id, {
      onSuccess: () => toast({ title: "Character Deleted" }),
      onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  };

  const handleMint = async (ch: GrudgeCharacterLocal) => {
    setMintingId(ch.id);
    try {
      const result = await mintCharacterAsNFT(ch.id);
      if (result.success) toast({ title: "Minted!", description: `cNFT: ${result.mintAddress?.slice(0, 16)}...` });
      else toast({ variant: "destructive", title: "Mint Failed", description: result.error });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Mint Error", description: err?.message });
    } finally {
      setMintingId(null);
    }
  };

  const openCustomize = (ch: GrudgeCharacterLocal) => {
    const merged = mergeCustomization(ch.customization as Partial<CharacterCustomization> | null, ch.raceId || "human");
    setCustomState(merged);
    setCustomizeChar(ch);
    setViewerMode("full");
  };

  const saveCustomization = () => {
    if (!customizeChar || !customState) return;
    updateCharacter.mutate(
      { id: customizeChar.id, customization: customState },
      {
        onSuccess: () => {
          toast({ title: "Customization Saved" });
          setCustomizeChar(null);
        },
        onError: (e: Error) => toast({ variant: "destructive", title: "Save Failed", description: e.message }),
      },
    );
  };

  const updateSlider = (key: string, value: number) => {
    if (!customState) return;
    setCustomState({ ...customState, [key]: value });
  };

  const updateColor = (key: string, value: string) => {
    if (!customState) return;
    setCustomState({ ...customState, [key]: value });
  };

  const applyPreset = (presetKey: string) => {
    if (!customState || !customizeChar) return;
    const preset = BODY_PRESETS[presetKey];
    if (!preset) return;
    const base = getCustomizationForRace(customizeChar.raceId || "human");
    setCustomState({ ...base, ...customState, ...preset.values });
  };

  // ── Auth gate ──

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Characters</h2>
          <p className="text-muted-foreground">Sign in to create and manage your Grudge Warlords</p>
        </div>
        <Button asChild>
          <a href="/auth"><LogIn className="mr-2 h-4 w-4" /> Sign In</a>
        </Button>
      </div>
    );
  }

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Characters</h1>
          <p className="text-sm text-muted-foreground">
            {characters.length} Warlord{characters.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New Character</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Grudge Character</DialogTitle>
              <DialogDescription>Choose a name, race, and class.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newChar.name} onChange={(e) => setNewChar({ ...newChar, name: e.target.value })} placeholder="Enter character name" maxLength={32} />
              </div>
              <div className="space-y-2">
                <Label>Race</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RACES.map((r) => (
                    <button key={r.id} onClick={() => setNewChar({ ...newChar, raceId: r.id })}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${newChar.raceId === r.id ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:border-primary/50"}`}>
                      <span className="text-lg">{r.icon}</span><span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSES.map((c) => (
                    <button key={c.id} onClick={() => setNewChar({ ...newChar, classId: c.id })}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${newChar.classId === c.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                      <c.icon className={`h-5 w-5 shrink-0 ${newChar.classId === c.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${newChar.classId === c.id ? "text-primary" : ""}`}>{c.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newChar.name.trim() || createCharacter.isPending}>
                {createCharacter.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Character Grid */}
      {characters.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Sword className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No Characters Yet</CardTitle>
          <CardDescription>Create your first Grudge Warlord to get started!</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((ch) => {
            const race = getRaceConfig(ch.raceId);
            const ClassIcon = CLASS_ICON_MAP[ch.classId?.toLowerCase() || ""] || Sword;
            const isMinting = mintingId === ch.id;

            return (
              <Card key={ch.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* 3D Thumbnail */}
                <div className="h-48 bg-gradient-to-b from-black/80 to-black/40 relative">
                  <CharacterViewer3D
                    raceId={ch.raceId || "human"}
                    classId={ch.classId || "warrior"}
                    customization={ch.customization as any}
                    mode="thumbnail"
                    className="w-full h-full"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className={`${race.color} text-white text-[10px]`}>
                      {race.icon} {race.label}
                    </Badge>
                  </div>
                  {ch.isNft && (
                    <Badge className="absolute top-2 right-2 bg-green-500/20 text-green-400 border-0 text-[9px]">
                      <Gem className="h-3 w-3 mr-0.5" /> cNFT
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{ch.name}</CardTitle>
                      <CardDescription className="capitalize">{ch.classId || "Unknown"} \u2022 Lv {ch.level}</CardDescription>
                    </div>
                    <Badge variant="outline">Lv {ch.level}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-3">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" />{ch.currentHealth ?? "\u2014"} HP</div>
                    <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{ch.experience} XP</div>
                    <div className="flex items-center gap-1"><ClassIcon className="h-3 w-3 text-blue-500" /><span className="capitalize">{ch.classId}</span></div>
                    <div className="flex items-center gap-1"><Coins className="h-3 w-3 text-yellow-600" />{ch.gold}</div>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => openCustomize(ch)}>
                      <Palette className="h-3 w-3 mr-1" /> Customize
                    </Button>
                    {!ch.isNft && hasWallet && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleMint(ch)} disabled={isMinting}>
                        {isMinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gem className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" className="text-xs h-7 px-2" onClick={() => handleDelete(ch)} disabled={deleteCharacter.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Customize Dialog ── */}
      <Dialog open={!!customizeChar} onOpenChange={(open) => { if (!open) setCustomizeChar(null); }}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-bold text-sm">{customizeChar?.name} — Character Customizer</h2>
                <p className="text-xs text-muted-foreground capitalize">{customizeChar?.raceId} {customizeChar?.classId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewerMode === "play" ? "default" : "outline"}
                className="text-xs h-7 gap-1"
                onClick={() => setViewerMode(viewerMode === "play" ? "full" : "play")}
              >
                <Play className="h-3.5 w-3.5" />
                {viewerMode === "play" ? "Stop" : "Play"}
              </Button>
              <Button size="sm" className="text-xs h-7 gap-1" onClick={saveCustomization} disabled={updateCharacter.isPending}>
                <Save className="h-3.5 w-3.5" />
                {updateCharacter.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 3D Viewport */}
            <div className="flex-1 min-w-0 bg-black">
              {customizeChar && customState && (
                <CharacterViewer3D
                  raceId={customizeChar.raceId || "human"}
                  classId={customizeChar.classId || "warrior"}
                  customization={customState}
                  mode={viewerMode}
                  className="w-full h-full"
                />
              )}
              {viewerMode === "play" && (
                <div className="absolute bottom-4 left-4 bg-black/70 rounded-lg px-3 py-2 text-[10px] text-muted-foreground">
                  <span className="font-bold text-foreground">WASD</span> Move &nbsp;
                  <span className="font-bold text-foreground">Space</span> Jump &nbsp;
                  <span className="font-bold text-foreground">A/D</span> Turn
                </div>
              )}
            </div>

            {/* Right: Customization Panel */}
            {viewerMode !== "play" && customState && (
              <div className="w-72 border-l flex flex-col overflow-hidden shrink-0">
                <div className="px-3 py-1.5 border-b bg-sidebar/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Body & Appearance
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-4">
                    {/* Body Presets */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground uppercase">Presets</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(BODY_PRESETS).map(([key, preset]) => (
                          <Button key={key} size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => applyPreset(key)}>
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Body Sliders */}
                    {CUSTOMIZATION_SLIDERS.map((s) => (
                      <div key={s.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{s.icon} {s.label}</Label>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {(customState[s.key as keyof CharacterCustomization] as number).toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={[customState[s.key as keyof CharacterCustomization] as number]}
                          onValueChange={([v]) => updateSlider(s.key, v)}
                          className="h-1.5"
                        />
                      </div>
                    ))}

                    <Separator />

                    {/* Colors */}
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase">Colors</Label>
                      {CUSTOMIZATION_COLORS.map((c) => (
                        <div key={c.key} className="flex items-center justify-between gap-2">
                          <Label className="text-xs">{c.label}</Label>
                          <input
                            type="color"
                            value={customState[c.key as keyof CharacterCustomization] as string}
                            onChange={(e) => updateColor(c.key, e.target.value)}
                            className="h-7 w-10 rounded border border-border cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
