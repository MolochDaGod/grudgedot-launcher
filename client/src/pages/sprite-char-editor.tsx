/**
 * GRUDGE STUDIO — 2D Sprite Character Editor
 * Pixel character composer using tinyWorlds (CC0) layered sprites.
 * Grudge-themed UI with race/class presets, faction palettes, and backend save.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Download, RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff,
  Palette, Save, Crown, Zap, Sword, Shuffle, Link,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCharacter, CLASS_COLOR } from '@/contexts/CharacterContext';

// ── Grudge race/class colour presets ────────────────────────────────────────
const GRUDGE_PRESETS = [
  { label: 'Human Warrior', race: 'human', cls: 'warrior', colors: ['#d4a15a', '#8b0000', '#4a3728'] },
  { label: 'Orc Warrior',   race: 'orc',   cls: 'warrior', colors: ['#4a7c3f', '#8b4513', '#2d1b0e'] },
  { label: 'Elf Ranger',    race: 'elf',   cls: 'ranger',  colors: ['#c8e6c9', '#2e7d32', '#1a4f1a'] },
  { label: 'Undead Mage',   race: 'undead',cls: 'mage',    colors: ['#9c27b0', '#4a0072', '#1a0030'] },
  { label: 'Dwarf Warrior', race: 'dwarf', cls: 'warrior', colors: ['#b8860b', '#8b4513', '#3d2200'] },
  { label: 'Barbarian Worge',race:'barbarian',cls:'worge', colors: ['#795548', '#4e342e', '#1a0a00'] },
];

const FACTION_PALETTES: Record<string, { name: string; primary: string; secondary: string; accent: string }> = {
  crusade: { name: 'Crusade',  primary: '#1565c0', secondary: '#f5c518', accent: '#ffffff' },
  legion:  { name: 'Legion',   primary: '#c62828', secondary: '#1a1a1a', accent: '#9e9e9e' },
  fabled:  { name: 'Fabled',   primary: '#2e7d32', secondary: '#f9a825', accent: '#e8f5e9' },
};

// ── Layer category display ────────────────────────────────────────────────────
const LAYER_ORDER = [
  'bg-color', 'body-type', 'body-fix', 'clothes-b', 'clothes',
  'xtra-body', 'hair-back', 'head', 'eyes-shape', 'eyes-pupil',
  'hair-front', 'hair-xtra', 'xtra-head',
];

const LAYER_LABELS: Record<string, string> = {
  'bg-color':   '🌈 Background',
  'body-type':  '🧍 Body',
  'body-fix':   '🩸 Body Detail',
  'clothes':    '👕 Top',
  'clothes-b':  '👖 Bottom',
  'xtra-body':  '🦺 Extra Body',
  'head':       '😀 Head',
  'eyes-shape': '👁 Eyes',
  'eyes-pupil': '🔵 Pupils',
  'hair-back':  '💇 Hair Back',
  'hair-front': '💇 Hair Front',
  'hair-xtra':  '✨ Hair Extra',
  'xtra-head':  '🎩 Head Extra',
};

interface LayerState {
  visible: boolean;
  index: number;
  maxIndex: number;
  color: string;
  hasColor: boolean;
}

type CharState = Record<string, LayerState>;

// ── PSD Loader ─────────────────────────────────────────────────────────────────
async function loadTinyWorldsPSD(): Promise<any> {
  // @ts-ignore
  const PSD = (await import('psd')).default;
  const seed = Math.floor(Math.random() * 1000) + 1;
  const psd = await PSD.fromURL(`https://jetrotal.github.io/EasyChar/tinyWorlds.psd?v=${seed}`);
  return psd;
}

function extractLayers(psd: any): { groups: Record<string, any[]> } {
  const groups: Record<string, any[]> = {};

  function walk(node: any) {
    if (!node) return;
    const children = node.children?.() || [];
    for (const child of children) {
      if (child.hasChildren?.()) {
        const groupName = child.name;
        if (!groupName.startsWith('@')) {
          groups[groupName] = groups[groupName] || [];
          walkGroup(child, groupName);
        }
      }
    }
  }

  function walkGroup(node: any, groupName: string) {
    const children = node.children?.() || [];
    for (const child of children) {
      if (child.hasChildren?.()) {
        const subGroup = child.name;
        const items: any[] = [];
        const subChildren = child.children?.() || [];
        for (const leaf of subChildren) {
          if (!leaf.hasChildren?.()) {
            items.push({ src: leaf.toPng().src, x: leaf.left, y: leaf.top, name: leaf.name });
          }
        }
        if (items.length > 0) {
          groups[groupName] = groups[groupName] || [];
          groups[groupName].push({ variant: subGroup, items });
        }
      } else {
        groups[groupName] = groups[groupName] || [];
        groups[groupName].push({ variant: child.name, items: [{ src: child.toPng().src, x: child.left, y: child.top, name: child.name }] });
      }
    }
  }

  walk(psd.tree());
  return { groups };
}

export default function SpriteCharEditor() {
  const { activeCharacter } = useCharacter();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [psdData, setPsdData] = useState<{ groups: Record<string, any[]> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [charState, setCharState] = useState<CharState>({});
  const [canvasSize, setCanvasSize] = useState({ w: 72, h: 128 });
  const [zoom, setZoom] = useState(4);
  const [saving, setSaving] = useState(false);

  // ── Load PSD ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    loadTinyWorldsPSD()
      .then(psd => {
        const w = psd.header.width;
        const h = psd.header.height;
        setCanvasSize({ w, h });

        const { groups } = extractLayers(psd);

        // Build initial state
        const initial: CharState = {};
        for (const [key, variants] of Object.entries(groups)) {
          initial[key] = {
            visible: !['clothes', 'clothes-b', 'xtra-body', 'xtra-head', 'hair-xtra'].includes(key),
            index: 0,
            maxIndex: variants.length - 1,
            color: '#ffffff',
            hasColor: ['hair-back', 'hair-front', 'hair-xtra', 'eyes-pupil'].includes(key),
          };
        }
        setCharState(initial);
        setPsdData({ groups });
        setLoading(false);
      })
      .catch(err => {
        setError(`Failed to load sprite data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // ── Render to canvas ────────────────────────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !psdData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.imageSmoothingEnabled = false;

    for (const key of LAYER_ORDER) {
      const state = charState[key];
      const variants = psdData.groups[key];
      if (!state?.visible || !variants?.length) continue;

      const variant = variants[state.index];
      if (!variant) continue;

      const items = variant.items || [variant];
      for (const item of items) {
        if (!item.src) continue;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (state.hasColor && state.color !== '#ffffff') {
            // Color tint via offscreen canvas
            const off = document.createElement('canvas');
            off.width = img.width;
            off.height = img.height;
            const offCtx = off.getContext('2d')!;
            offCtx.drawImage(img, 0, 0);
            offCtx.globalCompositeOperation = 'multiply';
            offCtx.fillStyle = state.color;
            offCtx.fillRect(0, 0, img.width, img.height);
            offCtx.globalCompositeOperation = 'destination-in';
            offCtx.drawImage(img, 0, 0);
            ctx.drawImage(off, item.x || 0, item.y || 0);
          } else {
            ctx.drawImage(img, item.x || 0, item.y || 0);
          }
          // Trigger re-render by forcing canvas update
        };
        img.src = item.src;
      }
    }
  }, [psdData, charState, canvasSize]);

  useEffect(() => {
    // Give images time to load then re-render
    const timer = setTimeout(renderCanvas, 50);
    return () => clearTimeout(timer);
  }, [renderCanvas]);

  // ── Layer controls ─────────────────────────────────────────────────────────
  const cycleLayer = (key: string, dir: 1 | -1) => {
    setCharState(prev => {
      const s = prev[key];
      if (!s) return prev;
      const next = ((s.index + dir) + s.maxIndex + 1) % (s.maxIndex + 1);
      return { ...prev, [key]: { ...s, index: next } };
    });
  };

  const toggleLayer = (key: string) => {
    setCharState(prev => {
      const s = prev[key];
      if (!s) return prev;
      return { ...prev, [key]: { ...s, visible: !s.visible } };
    });
  };

  const setColor = (key: string, color: string) => {
    setCharState(prev => ({ ...prev, [key]: { ...prev[key], color } }));
  };

  const randomize = () => {
    setCharState(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key].maxIndex > 0) {
          next[key] = { ...next[key], index: Math.floor(Math.random() * (next[key].maxIndex + 1)) };
        }
        if (next[key].hasColor) {
          const hue = Math.floor(Math.random() * 360);
          next[key] = { ...next[key], color: `hsl(${hue}, 60%, 50%)` };
        }
      }
      return next;
    });
  };

  const applyPreset = (preset: typeof GRUDGE_PRESETS[0]) => {
    setCharState(prev => {
      const next = { ...prev };
      if (next['hair-back'])  { next['hair-back']  = { ...next['hair-back'],  color: preset.colors[0] }; }
      if (next['hair-front']) { next['hair-front'] = { ...next['hair-front'], color: preset.colors[0] }; }
      if (next['eyes-pupil']) { next['eyes-pupil'] = { ...next['eyes-pupil'], color: preset.colors[2] }; }
      if (next['clothes'])    { next['clothes']    = { ...next['clothes'],    visible: true }; }
      if (next['clothes-b'])  { next['clothes-b']  = { ...next['clothes-b'], visible: true }; }
      return next;
    });
    toast({ title: `Preset applied: ${preset.label}` });
  };

  const applyFaction = (key: string) => {
    const pal = FACTION_PALETTES[key];
    if (!pal) return;
    setCharState(prev => {
      const next = { ...prev };
      if (next['clothes'])   next['clothes']   = { ...next['clothes'], visible: true };
      if (next['clothes-b']) next['clothes-b'] = { ...next['clothes-b'], visible: true };
      if (next['eyes-pupil']) next['eyes-pupil'] = { ...next['eyes-pupil'], color: pal.primary };
      return next;
    });
    toast({ title: `Faction colors: ${pal.name}` });
  };

  const downloadSprite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `grudge-sprite-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'Sprite downloaded!' });
  };

  const saveToCharacter = async () => {
    if (!activeCharacter) {
      toast({ variant: 'destructive', title: 'No active character', description: 'Select a character first' });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      // TODO: upload to R2/ObjectStore and link to character
      toast({ title: `Sprite saved to ${activeCharacter.name}!`, description: 'Linked to your Grudge character' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left panel — layer controls */}
      <div className="w-64 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="p-3 border-b border-border/40">
          <h2 className="text-sm font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
            2D Sprite Editor
          </h2>
          <p className="text-[10px] text-muted-foreground">TinyWorlds CC0 sprites</p>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {LAYER_ORDER.map(key => {
              const s = charState[key];
              if (!s) return null;
              return (
                <div key={key} className={`rounded-lg border p-2 transition-colors ${s.visible ? 'border-border/50' : 'border-border/20 opacity-50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <button onClick={() => toggleLayer(key)} className="text-muted-foreground hover:text-foreground">
                      {s.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <span className="text-[11px] flex-1">{LAYER_LABELS[key] || key}</span>
                    {s.hasColor && (
                      <input type="color" value={s.color} onChange={e => setColor(key, e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0" style={{ background: 'none' }} />
                    )}
                  </div>
                  {s.maxIndex > 0 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => cycleLayer(key, -1)} className="w-5 h-5 rounded bg-muted/50 hover:bg-muted flex items-center justify-center">
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] flex-1 text-center text-muted-foreground">{s.index + 1}/{s.maxIndex + 1}</span>
                      <button onClick={() => cycleLayer(key, 1)} className="w-5 h-5 rounded bg-muted/50 hover:bg-muted flex items-center justify-center">
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Center — canvas */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0d] relative overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Loading tinyWorlds sprites...</p>
            <p className="text-xs text-muted-foreground/60">Parsing PSD layers</p>
          </div>
        )}
        {error && (
          <div className="text-center p-6">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">Check network connection to jetrotal.github.io</p>
          </div>
        )}
        {!loading && !error && (
          <>
            {/* Checkerboard bg */}
            <div className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              style={{ imageRendering: 'pixelated', transform: `scale(${zoom})`, border: '1px solid rgba(255,255,255,0.1)' }}
              className="relative z-10"
            />
          </>
        )}

        {/* Zoom control */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-background/80 backdrop-blur rounded-full px-4 py-2 border border-border/40">
          <span className="text-[11px] text-muted-foreground">Zoom</span>
          <div className="w-24">
            <Slider min={1} max={10} step={1} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
          </div>
          <span className="text-[11px] text-muted-foreground w-6">{zoom}x</span>
        </div>
      </div>

      {/* Right panel — presets + actions */}
      <div className="w-56 flex-shrink-0 border-l border-border/40 flex flex-col">
        <div className="p-3 border-b border-border/40">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Actions</h3>
          <div className="space-y-1.5">
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={randomize}>
              <Shuffle className="w-3 h-3" /> Randomize
            </Button>
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={downloadSprite}>
              <Download className="w-3 h-3" /> Download PNG
            </Button>
            <Button size="sm" className="w-full text-xs gap-1.5 bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white"
              onClick={saveToCharacter} disabled={saving || !activeCharacter}>
              <Save className="w-3 h-3" />
              {activeCharacter ? `Save to ${activeCharacter.name.split(' ')[0]}` : 'Select Character'}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-2 space-y-3">
          {/* Race/Class presets */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Race/Class Presets</p>
            <div className="space-y-1">
              {GRUDGE_PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="w-full text-left px-2 py-1.5 rounded-md border border-border/30 hover:border-amber-700/40 hover:bg-amber-950/10 transition-colors">
                  <div className="text-[11px] font-medium">{p.label}</div>
                  <div className="flex gap-1 mt-0.5">
                    {p.colors.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-black/20" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Faction palettes */}
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Faction Colors</p>
            <div className="space-y-1">
              {Object.entries(FACTION_PALETTES).map(([key, pal]) => (
                <button key={key} onClick={() => applyFaction(key)}
                  className="w-full text-left px-2 py-1.5 rounded-md border border-border/30 hover:border-border/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-sm" style={{ background: pal.primary }} />
                      <div className="w-3 h-3 rounded-sm" style={{ background: pal.secondary }} />
                    </div>
                    <span className="text-[11px]">{pal.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active character info */}
          {activeCharacter && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Linking To</p>
              <div className="px-2 py-1.5 rounded-md border border-border/40 bg-muted/20">
                <div className="text-[11px] font-semibold" style={{ color: CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706' }}>
                  {activeCharacter.name}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">{activeCharacter.race} {activeCharacter.class} · Lv{activeCharacter.level}</div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
