import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MM_REFERENCE_IMAGES,
  MM_WEAPON_MATRIX,
  MM_SCALE_EXAMPLES,
  MM_DOUBLE_JUMP_EXAMPLES,
  MM_RANGED_FIXED,
  MM_SKILL_KIND_LABELS,
  distanceBiasToMm,
  mmColor,
  mmLabel,
  type MmSkillKind,
} from '@shared/wcs/definitions/mmSystem';

function MmBadge({ value }: { value: number }) {
  const fixedRanged = value === MM_RANGED_FIXED;
  return (
    <span
      className="inline-flex items-center justify-center min-w-[2.5rem] px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
      style={{
        backgroundColor: `${mmColor(value)}22`,
        color: mmColor(value),
        border: `1px solid ${mmColor(value)}55`,
      }}
      title={fixedRanged ? 'Ranged exception: always -50' : mmLabel(value)}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

export default function MmReferencePanel() {
  const kinds: MmSkillKind[] = ['combo', 'special', 'ranged', 'power'];

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="p-4 space-y-6 max-w-6xl">
        <div>
          <h2 className="font-[var(--font-heading)] text-lg gold-text tracking-wide">MM & Weapon Skills</h2>
          <p className="text-xs text-[hsl(45_15%_55%)] mt-1 max-w-3xl">
            MM (Melee / Movement Modifier) controls whether a skill closes gap (+) or keeps distance (−).
            Each weapon has four skill types: Combo, Special, Ranged, and Power Move. Ranged skills always use MM = -50.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">MM scale & formula</CardTitle>
              <CardDescription className="text-xs">DistanceBias d ∈ [0, 1] → MM ∈ [-100, +100]</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <code className="block text-xs font-mono text-[hsl(45_30%_75%)] bg-black/30 p-2 rounded">
                MM = lerp(+100, -100, d)
              </code>
              <table className="w-full text-xs">
                <tbody>
                  {MM_SCALE_EXAMPLES.map((row) => (
                    <tr key={row.d} className="border-b border-[hsl(220_15%_20%)]">
                      <td className="py-1.5 font-mono">d = {row.d}</td>
                      <td className="py-1.5"><MmBadge value={row.mm} /></td>
                      <td className="py-1.5 text-[hsl(45_15%_55%)]">{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-[hsl(45_15%_50%)]">
                Example: d = 0.25 → MM = {distanceBiasToMm(0.25)} (slight melee lean)
              </p>
            </CardContent>
          </Card>

          <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Double jump uses MM twice</CardTitle>
              <CardDescription className="text-xs">Each jump applies MM — chains compound commitment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {MM_DOUBLE_JUMP_EXAMPLES.map((ex) => (
                <div key={ex.label} className="flex flex-wrap items-center gap-2 text-xs border-b border-[hsl(220_15%_20%)] pb-2">
                  <span className="text-[hsl(45_30%_75%)] w-36">{ex.label}</span>
                  <MmBadge value={ex.jump1} />
                  <span className="text-[hsl(45_15%_40%)]">→</span>
                  <MmBadge value={ex.jump2} />
                  <span className="text-[hsl(45_15%_55%)]">{ex.outcome}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="fantasy-panel border-[hsl(43_40%_25%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weapon skill matrix (data)</CardTitle>
            <CardDescription className="text-xs">
              Ranged column fixed at {MM_RANGED_FIXED} — enforces keep-distance even on melee weapons
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-left text-[hsl(45_15%_50%)] border-b border-[hsl(220_15%_25%)]">
                  <th className="pb-2 pr-3">Weapon</th>
                  {kinds.map((k) => (
                    <th key={k} className="pb-2 px-2 text-center">
                      {MM_SKILL_KIND_LABELS[k].index}: {MM_SKILL_KIND_LABELS[k].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MM_WEAPON_MATRIX.map((row) => (
                  <tr key={row.weapon} className="border-b border-[hsl(220_15%_18%)]">
                    <td className="py-2 pr-3 font-medium text-[hsl(45_30%_80%)]">{row.weapon}</td>
                    {kinds.map((k) => (
                      <td key={k} className="py-2 px-2 text-center">
                        <MmBadge value={row[k]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-[var(--font-heading)] text-sm tracking-wide text-[hsl(43_70%_55%)]">Reference diagrams</h3>

          <figure className="ornate-frame p-2">
            <img
              src={MM_REFERENCE_IMAGES.scaleAndAbilities}
              alt="MM scale from +100 close gap to -100 keep distance, ability grid, and double-jump examples"
              className="w-full rounded border border-[hsl(43_30%_20%)]"
              loading="lazy"
            />
            <figcaption className="text-[10px] text-[hsl(45_15%_50%)] mt-2 text-center">
              MM scale, mapping formula, sample abilities, and double-jump logic
            </figcaption>
          </figure>

          <figure className="ornate-frame p-2">
            <img
              src={MM_REFERENCE_IMAGES.weaponMatrix}
              alt="Full weapon skill matrix with MM values per Combo, Special, Ranged, and Power Move"
              className="w-full rounded border border-[hsl(43_30%_20%)]"
              loading="lazy"
            />
            <figcaption className="text-[10px] text-[hsl(45_15%_50%)] mt-2 text-center">
              12 weapons × 4 skills — green = close gap, red = keep distance; Ranged always -50
            </figcaption>
          </figure>

          <figure className="ornate-frame p-2">
            <img
              src={MM_REFERENCE_IMAGES.skillSprites}
              alt="Voxel character sprites showing each weapon's four skill animations"
              className="w-full rounded border border-[hsl(43_30%_20%)]"
              loading="lazy"
            />
            <figcaption className="text-[10px] text-[hsl(45_15%_50%)] mt-2 text-center">
              Visual skill sheet — same 1–4 layout (Combo / Special / Ranged / Power Move)
            </figcaption>
          </figure>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <Badge variant="outline" className="border-green-600/50 text-green-500">+MM Close gap</Badge>
          <Badge variant="outline">0 Neutral</Badge>
          <Badge variant="outline" className="border-red-600/50 text-red-400">-MM Keep distance</Badge>
          <Badge variant="outline" className="border-orange-500/50 text-orange-400">Ranged = -50 always</Badge>
        </div>
      </div>
    </ScrollArea>
  );
}