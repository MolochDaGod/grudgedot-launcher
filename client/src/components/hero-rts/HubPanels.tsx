import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ExternalLink, Play, GitBranch, Layers, Keyboard, Swords, Building2,
  Factory, FlaskConical, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  HERO_RTS_DEPLOY,
  HERO_RTS_LINKS,
  SOURCE_TREE,
  BOOT_FLOW,
  HOTKEYS,
  FACTIONS,
  GLB_PACKS,
  UNIT_MESH_MAP,
  BUILDING_MESH_MAP,
  PRODUCTION_ROSTER,
  UPGRADES,
  TEXTURE_SOURCES,
} from '@shared/heroRtsFlow';

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.open(href, '_blank')}>
      <ExternalLink className="mr-1 h-3 w-3" />
      {label}
    </Button>
  );
}

export function HeroRtsOverviewPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Hero Commander RTS
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top-down 3D RTS in the Grudge Nexus armada era — WC3-style factions, production queues, lab upgrades, and tower defense.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LinkButton href={HERO_RTS_LINKS.play} label="Play now" />
          <LinkButton href={HERO_RTS_LINKS.showcase} label="Asset showcase" />
          <LinkButton href={HERO_RTS_LINKS.editor} label="Map editor" />
          <LinkButton href={HERO_RTS_LINKS.menu} label="Main menu" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Deploy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 font-mono">
              <div><span className="text-muted-foreground">URL </span>{HERO_RTS_DEPLOY.url}</div>
              <div><span className="text-muted-foreground">Vercel </span>{HERO_RTS_DEPLOY.vercelProject}</div>
              <div><span className="text-muted-foreground">Repo </span>{HERO_RTS_DEPLOY.repo}/{HERO_RTS_DEPLOY.root}</div>
              <div><span className="text-muted-foreground">CI </span>{HERO_RTS_DEPLOY.workflow}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                8 GLB packs
              </CardTitle>
              <CardDescription>Toon soldiers + Dune vehicles + Necron/Chaos buildings + turret</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {GLB_PACKS.length} curated packs under <code className="text-xs">public/models/rts/</code>.
                See Asset Map tab for unit→mesh and building→node wiring.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Source organization</CardTitle>
            <CardDescription>Key modules in artifacts/hero-rts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SOURCE_TREE.map((row) => (
                <div key={row.path} className="flex gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <code className="shrink-0 text-xs text-primary/90 w-52">{row.path}</code>
                  <span className="text-muted-foreground">{row.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Combat & weapon skills (WCS)</CardTitle>
            <CardDescription>MM distance bias, soft/focus targeting, and 4-skill weapon matrix</CardDescription>
          </CardHeader>
          <CardContent className="text-sm flex flex-wrap gap-2">
            <Link href="/warlord-suite/weapon-skills">
              <Button variant="outline" size="sm">MM & Weapon Skills</Button>
            </Link>
            <Link href="/warlord-suite/weapon-skills?tab=targeting">
              <Button variant="outline" size="sm">Soft & Focus targeting</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Factions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {FACTIONS.map((f) => (
                <div key={f.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>Theme: <Badge variant="outline" className="text-[10px]">{f.theme}</Badge></div>
                    <div>Hero: <code>{f.hero}</code></div>
                    <div>Default enemy: {f.enemy}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export function HeroRtsFlowPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Game flow
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            From boot to victory — matches the live game loop in App.tsx + gameLogic.ts.
          </p>
        </div>

        <div className="space-y-3">
          {BOOT_FLOW.map((step, i) => (
            <div key={step.step} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                {i < BOOT_FLOW.length - 1 && (
                  <div className="w-px h-6 bg-border my-1" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="font-medium">{step.label}</div>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
              {i < BOOT_FLOW.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 mt-2 hidden lg:block" />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Production roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 font-medium">Building</th>
                  <th className="pb-2 font-medium">Queues</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTION_ROSTER.map((row) => (
                  <tr key={row.building} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{row.building}</td>
                    <td className="py-2 text-muted-foreground">{row.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab upgrades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {UPGRADES.map((u) => (
              <div key={u.id} className="flex justify-between gap-4 text-sm border-b border-border/40 pb-2 last:border-0">
                <div>
                  <span className="font-medium">{u.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{u.effect}</span>
                </div>
                <Badge variant="secondary">{u.cost}g</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Hotkeys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {HOTKEYS.map((h) => (
                  <tr key={h.keys} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs w-36">{h.keys}</td>
                    <td className="py-2 text-muted-foreground">{h.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Button onClick={() => window.open(HERO_RTS_LINKS.play, '_blank')}>
          <Play className="mr-2 h-4 w-4" />
          Jump into live match
        </Button>
      </div>
    </ScrollArea>
  );
}

export function HeroRtsAssetsPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Asset map</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Building→GLB node and unit type→catalog asset wiring (Orange Star sample faction for heroes).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">GLB packs</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b text-xs">
                  <th className="pb-2">Pack</th>
                  <th className="pb-2">File</th>
                  <th className="pb-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {GLB_PACKS.map((p) => (
                  <tr key={p.key} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{p.key}</td>
                    <td className="py-2 font-mono text-[11px] max-w-[200px] truncate">{p.file}</td>
                    <td className="py-2 text-muted-foreground text-xs">{p.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unit type → mesh</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b text-xs">
                  <th className="pb-2">Unit</th>
                  <th className="pb-2">Catalog ID</th>
                  <th className="pb-2">GLB</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_MESH_MAP.map((row) => (
                  <tr key={row.unitType} className="border-b border-border/40">
                    <td className="py-1.5 font-mono text-xs">{row.unitType}</td>
                    <td className="py-1.5 font-mono text-[11px] text-muted-foreground">{row.assetId}</td>
                    <td className="py-1.5 font-mono text-[10px] max-w-[180px] truncate">{row.glb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Building type → GLTF node (by theme)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b text-xs">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">scifi (necron)</th>
                  <th className="pb-2">medieval (chaos)</th>
                  <th className="pb-2">fantasy (chaos2)</th>
                </tr>
              </thead>
              <tbody>
                {BUILDING_MESH_MAP.map((row) => (
                  <tr key={row.type} className="border-b border-border/40">
                    <td className="py-1.5 font-mono text-xs">{row.type}</td>
                    <td className="py-1.5 font-mono text-[10px] text-muted-foreground">{row.scifi}</td>
                    <td className="py-1.5 font-mono text-[10px] text-muted-foreground">{row.medieval}</td>
                    <td className="py-1.5 font-mono text-[10px] text-muted-foreground">{row.fantasy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Textures & icons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TEXTURE_SOURCES.map((t) => (
              <div key={t.layer} className="text-sm">
                <span className="font-medium">{t.layer}: </span>
                <span className="text-muted-foreground">{t.source}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}