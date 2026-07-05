import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  COMBAT_TARGETING_REFERENCE_IMAGES,
  FOCUS_LOCK_RULES,
  SOFT_ACQUISITION,
  TARGETING_CONTROLS,
  TARGETING_MODES,
} from '@shared/wcs/definitions/combatTargetingSystem';

export default function CombatTargetingPanel() {
  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="p-4 space-y-6 max-w-6xl">
        <div>
          <h2 className="font-[var(--font-heading)] text-lg gold-text tracking-wide">Soft & Focus Targeting</h2>
          <p className="text-xs text-[hsl(45_15%_55%)] mt-1 max-w-3xl">
            Soft acquisition uses a distance + cone check to surface candidates. RMB toggles hard focus lock;
            movement strafes around the lock while the body faces camera-forward. Lock releases beyond 12m or on target death.
          </p>
        </div>

        <Card className="fantasy-panel border-[hsl(43_40%_25%)] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reference diagram</CardTitle>
            <CardDescription className="text-xs">Target acquisition math + locked combat rules</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <img
              src={COMBAT_TARGETING_REFERENCE_IMAGES.softAndFocus}
              alt="Soft acquisition cone and hard focus lock rules"
              className="w-full h-auto border-t border-[hsl(43_40%_25%)]"
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Target acquisition (soft)</CardTitle>
              <CardDescription className="text-xs">Cone + distance gate before lock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono">{SOFT_ACQUISITION.maxDistanceM}m max</Badge>
                <Badge variant="outline" className="font-mono">{SOFT_ACQUISITION.coneDegrees}° cone</Badge>
              </div>
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-[hsl(220_15%_20%)]">
                    <td className="py-1.5 text-[hsl(45_15%_55%)]">Distance</td>
                    <td className="py-1.5 font-mono text-[hsl(45_30%_75%)]">{SOFT_ACQUISITION.distanceFormula}</td>
                  </tr>
                  <tr className="border-b border-[hsl(220_15%_20%)]">
                    <td className="py-1.5 text-[hsl(45_15%_55%)]">Horizontal</td>
                    <td className="py-1.5 font-mono text-[hsl(45_30%_75%)]">{SOFT_ACQUISITION.horizontalFormula}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-[hsl(45_15%_55%)]">Vertical</td>
                    <td className="py-1.5 font-mono text-[hsl(45_30%_75%)]">{SOFT_ACQUISITION.verticalFormula}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Locked combat (focus)</CardTitle>
              <CardDescription className="text-xs">RMB sticky lock + camera behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="text-[hsl(45_30%_75%)]">
                Lock releases if distance &gt; {FOCUS_LOCK_RULES.releaseDistanceM}m or target dies.
              </p>
              <div>
                <span className="text-[hsl(45_15%_55%)]">Priority: </span>
                {FOCUS_LOCK_RULES.priority.map((p, i) => (
                  <span key={p.key} className="text-[hsl(45_30%_75%)]">
                    {i > 0 ? ' → ' : ''}{p.label}
                  </span>
                ))}
              </div>
              <ul className="space-y-1 text-[hsl(45_30%_75%)] list-disc list-inside">
                <li>Camera: fixed offset, vertical pitch only</li>
                <li>Smooth release: {FOCUS_LOCK_RULES.camera.smoothReleaseSec}s</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Input contract</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(220_15%_20%)] text-[hsl(45_15%_55%)]">
                  <th className="py-1.5 text-left font-normal">Keys</th>
                  <th className="py-1.5 text-left font-normal">Action</th>
                  <th className="py-1.5 text-left font-normal hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {TARGETING_CONTROLS.map((row) => (
                  <tr key={row.keys} className="border-b border-[hsl(220_15%_20%)] last:border-0">
                    <td className="py-2 font-mono text-primary/90">{row.keys}</td>
                    <td className="py-2">{row.action}</td>
                    <td className="py-2 text-[hsl(45_15%_55%)] hidden sm:table-cell">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {TARGETING_MODES.map((mode) => (
            <Card key={mode.id} className="fantasy-panel border-[hsl(43_40%_25%)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{mode.label}</CardTitle>
                <CardDescription className="text-xs font-mono">focusEnabled = {String(mode.focusEnabled)}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-[hsl(45_30%_75%)]">{mode.summary}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}