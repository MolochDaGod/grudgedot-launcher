/**
 * Studio Forge hub — discovery surface for forge.grudge-studio.com
 * and launcher-native authoring tools. The in-launcher Babylon editor was retired;
 * all scene/map/effects authoring runs in Forge.
 */

import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Hammer,
  ExternalLink,
  Crosshair,
  Layers,
  Cuboid,
  Play,
  Crosshair,
} from 'lucide-react';
import { FORGE_ORIGIN, forgeUrl } from '@shared/forgeUrls';

interface HubItem {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  tags: string[];
  badge: string;
  cta: string;
}

const FORGE_ENTRIES: HubItem[] = [
  {
    id: 'forge-main',
    title: 'Grudge Studio Forge',
    description:
      'Canonical browser editor — scenes, assets, maps, effects, play mode, and AI tools. Replaces the legacy in-launcher Babylon studio.',
    href: '/forge',
    tags: ['editor', 'three.js', 'production'],
    badge: 'Forge',
    cta: 'Open Forge',
  },
  {
    id: 'forge-scene',
    title: 'Scene Editor',
    description: 'Author 3D scenes, hierarchy, materials, and lighting in Forge.',
    href: '/engine',
    tags: ['scene', 'gltf'],
    badge: 'Scene',
    cta: 'Open scenes',
  },
  {
    id: 'forge-map',
    title: 'Map Editor',
    description: 'Terrain, sectors, and entity placement — powered by Forge.',
    href: '/map-editor',
    tags: ['map', 'terrain'],
    badge: 'Map',
    cta: 'Edit maps',
  },
  {
    id: 'forge-effects',
    title: 'Effects Lab',
    description: 'Particles, shaders, and post-processing in the live studio stack.',
    href: '/effects',
    tags: ['vfx', 'shaders'],
    badge: 'VFX',
    cta: 'Open effects',
  },
  {
    id: 'forge-warlord',
    title: 'Warlords Builder',
    description: '3D builder and scene pipeline for Grudge Warlords — hosted on Forge.',
    href: '/warlords',
    tags: ['warlords', 'builder'],
    badge: 'Warlords',
    cta: 'Open builder',
  },
];

const ARMADA_GAMES: HubItem[] = [
  {
    id: 'gruda-armada-rts-star',
    title: 'Gruda Armada RTS Star',
    description:
      'GrudgeSpaceRTS is now open — solar-system scrims, star map (M), ship forge, and Racalvin producer intro on R2 CDN.',
    href: '/armada-saga',
    tags: ['rts', 'space', 'live'],
    badge: 'Live',
    cta: 'Play now',
  },
];

const NATIVE_TOOLS: HubItem[] = [
  {
    id: 'flat-engine',
    title: 'Grudge Flat Engine',
    description: 'Lightweight 2D canvas editor for sprites and tile workflows inside the launcher.',
    href: '/flat-engine',
    tags: ['2d', 'canvas'],
    badge: '2D',
    cta: 'Open 2D',
  },
  {
    id: 'shooter-3d',
    title: 'Grudge Assault',
    description: 'Playable TPS arena demo (Babylon + Rapier). Authoring happens in Forge, not here.',
    href: '/shooter-3d',
    tags: ['game', 'tps'],
    badge: 'Play',
    cta: 'Play demo',
  },
];

export default function StudioForgeHub() {
  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8" data-testid="page-studio-forge">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Hammer className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-tight">Studio Forge</h1>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">forge.grudge-studio.com</Badge>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          The launcher no longer ships the heavyweight Babylon editor. Scene, map, and effects authoring
          runs in <strong className="text-foreground">Grudge Studio Forge</strong> — embeds below with
          Grudge ID auth forwarding.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/forge">
              <Play className="mr-2 h-4 w-4" /> Open Forge Editor
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={forgeUrl({ from: 'launcher-hub' })} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
            </a>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cuboid className="h-5 w-5 text-amber-400" /> Forge authoring
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FORGE_ENTRIES.map((item) => (
            <Card key={item.id} className="border-amber-900/30 bg-stone-950/80">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
                <Button size="sm" variant="secondary" asChild>
                  <Link href={item.href}>{item.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-cyan-400" /> Armada era — now open
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ARMADA_GAMES.map((item) => (
            <Card key={item.id} className="border-cyan-900/40 bg-stone-950/80 overflow-hidden">
              <div className="aspect-video bg-black border-b border-cyan-900/30">
                <video
                  src="https://assets.grudge-studio.com/gruda-armada/space/videos/intro.mp4"
                  className="w-full h-full object-cover opacity-90"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge className="bg-emerald-600/90 text-white text-[10px] shrink-0">{item.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
                <Button size="sm" asChild>
                  <Link href={item.href}>{item.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" /> Launcher-native tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {NATIVE_TOOLS.map((item) => (
            <Card key={item.id} className="border-stone-800 bg-stone-950/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{item.badge}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href={item.href}>{item.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground pb-4">
        Forge origin: <code className="font-mono">{FORGE_ORIGIN}</code> · Legacy <code className="font-mono">/babygrudge</code> routes
        now point here. Babylon editor bundle removed from launcher routes.
      </p>
    </div>
  );
}