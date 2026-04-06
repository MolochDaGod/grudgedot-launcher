import { lazy, Suspense } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGrudgePlayer } from "@/hooks/useGrudgePlayer";
import {
  Loader2,
  TreeDeciduous,
  Shield,
  Hammer,
  Sword,
  UserCog,
  Home,
  Warehouse,
} from "lucide-react";
import { Link } from "wouter";

// Lazy-load native sub-pages (no iframes)
const SkillTreePage = lazy(() => import("./warlord-suite/SkillTreePage"));
const ArsenalPage = lazy(() => import("./warlord-suite/ArsenalPage"));
const CraftingPage = lazy(() => import("./warlord-suite/CraftingPage"));
const WeaponSkillsPage = lazy(() => import("./warlord-suite/WeaponSkillsPage"));
const CharacterBuilderPage = lazy(() => import("./warlord-suite/CharacterBuilderPage"));

const WCS_PAGES = [
  { slug: "skill-tree", label: "Skill Tree", icon: TreeDeciduous },
  { slug: "arsenal", label: "Arsenal", icon: Shield },
  { slug: "crafting", label: "Crafting", icon: Hammer },
  { slug: "weapon-skills", label: "Weapon Skills", icon: Sword },
  { slug: "character-builder", label: "Character Builder", icon: UserCog },
] as const;

const PAGE_COMPONENTS: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  "skill-tree": SkillTreePage,
  arsenal: ArsenalPage,
  crafting: CraftingPage,
  "weapon-skills": WeaponSkillsPage,
  "character-builder": CharacterBuilderPage,
};

export default function WarlordSuite() {
  const [, params] = useRoute("/warlord-suite/:page");
  const activePage = params?.page || "skill-tree";
  const player = useGrudgePlayer();

  const currentPage = WCS_PAGES.find((p) => p.slug === activePage) || WCS_PAGES[0];
  const ActiveComponent = PAGE_COMPONENTS[activePage] || SkillTreePage;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-sidebar shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-home">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <Warehouse className="w-4 h-4 text-cyan-500" />
          <span className="font-semibold text-sm">Warlord Suite</span>
          <div className="h-5 w-px bg-border" />
          {/* Sub-page nav */}
          {WCS_PAGES.map((page) => (
            <Link key={page.slug} href={`/warlord-suite/${page.slug}`}>
              <Button
                size="sm"
                variant={activePage === page.slug ? "default" : "ghost"}
                className={`h-7 text-xs gap-1 ${
                  activePage === page.slug ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                }`}
                data-testid={`button-wcs-tab-${page.slug}`}
              >
                <page.icon className="w-3 h-3" />
                {page.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Grudge player data bar */}
      {player.activeChar && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b bg-muted/50 text-xs">
          <Badge variant="outline" className="font-mono">
            {player.activeChar.name} — Lv {player.activeChar.level} {player.activeChar.class}
          </Badge>
          <span className="text-muted-foreground">{player.activeChar.gold} Gold</span>
          <span className="text-muted-foreground">{player.inventory.length} items</span>
          <span className="text-muted-foreground">{player.professions.length} professions</span>
          {player.characters.length > 1 && (
            <select
              className="h-6 text-xs bg-transparent border border-muted-foreground/30 rounded px-1"
              value={player.activeChar.id}
              onChange={(e) => {
                const ch = player.characters.find(c => c.id === Number(e.target.value));
                if (ch) player.setActiveChar(ch);
              }}
            >
              {player.characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Native page content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          }
        >
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  );
}
