import { useState } from "react";
import { useLocation } from "wouter";

interface GameEntry {
  id: string;
  title: string;
  description: string;
  image: string;
  route: string;
  tags: string[];
  category: "pvp" | "pve" | "grudge" | "tools" | "platform";
  external?: boolean;
}

const GAMES: GameEntry[] = [
  // ── PvP Games ──
  { id: "grudge-rts", title: "Grudge Warlords RTS", description: "WC3-style RTS with heroes, creep camps, tech tree, and island warfare", image: "/assets/games/world-map.gif", route: "/grudge-swarm", tags: ["RTS", "PvP", "Heroes"], category: "pvp" },
  { id: "grudge-arena", title: "Grudge Arena", description: "PvP combat arena with class abilities and combos", image: "/assets/games/arena.jpg", route: "/grudge-arena", tags: ["PvP", "Arena"], category: "pvp" },
  { id: "grudge-box", title: "GrudgeBox", description: "2D sprite fighting game with multi-class combat", image: "/assets/games/scourge.png", route: "/grudge-box", tags: ["PvP", "Fighting"], category: "pvp" },
  { id: "nexus-nemesis", title: "Nexus Nemesis", description: "Strategic PvP battlefield with deck-building mechanics", image: "/assets/games/card-game.jpg", route: "/nexus-nemesis", tags: ["PvP", "TCG"], category: "pvp" },
  { id: "betta-warlords", title: "Betta Warlords", description: "Auto-battler with faction units and tier upgrades", image: "/assets/games/grudge-brand.png", route: "/betta-warlords", tags: ["PvP", "Auto-battle"], category: "pvp" },
  { id: "crown-clash", title: "Crown Clash", description: "3D combat for the crown — last player standing wins", image: "/assets/games/crown-clash.png", route: "/crown-clash", tags: ["PvP", "3D"], category: "pvp" },
  // ── PvE Games ──
  { id: "crypt-crawlers", title: "Crypt Crawlers", description: "BSP dungeon crawler with fog of war, A* enemies, multi-floor progression", image: "/assets/games/gruda-wars.png", route: "/crypt-crawlers", tags: ["PvE", "Dungeon"], category: "pve" },
  { id: "mmo-world", title: "MMO World", description: "Open world MMO with WCS heroes, crafting, and souls-like combat", image: "/assets/games/mmo-world.png", route: "/mmo", tags: ["PvE", "MMO"], category: "pve" },
  { id: "reef-hunt", title: "Reef Hunt", description: "Underwater exploration, hunting, and treasure diving", image: "/assets/games/grudge-brand.png", route: "/reef-hunt", tags: ["PvE", "Explore"], category: "pve" },
  { id: "gruda-wars", title: "Gruda Wars", description: "RPG with hero system, 32 world zones, arena PvP, and 5 professions", image: "/assets/games/gruda-wars.png", route: "/gruda-wars", tags: ["RPG", "PvE"], category: "pve" },
  { id: "decay", title: "Decay", description: "Survival horror — fight the undead horde", image: "/assets/games/warlords.jpg", route: "/decay", tags: ["PvE", "Horror"], category: "pve" },
  // ── Grudge Universe ──
  { id: "grudge-crafting", title: "Grudge Crafting", description: "Crafting bench with 3,425 items from ObjectStore database", image: "/assets/games/grudge-brand.png", route: "/grudge-crafting", tags: ["Crafting", "Economy"], category: "grudge" },
  { id: "grudge-factory", title: "Grudge Factory", description: "Production management — build your empire", image: "/assets/games/scourge.png", route: "/grudge-factory", tags: ["Management"], category: "grudge" },
  { id: "grudge-gangs", title: "Grudge Gangs", description: "Sprite combat showcase with SpriteEffects2D", image: "/assets/games/scourge.png", route: "/grudge-gangs", tags: ["Action"], category: "grudge" },
  { id: "warlord-suite", title: "Warlord Suite", description: "Full character builder, arsenal, crafting, skill trees — all WCS data", image: "/assets/games/warlords.jpg", route: "/warlord-suite/character-builder", tags: ["RPG", "Builder"], category: "grudge" },
  // ── Tools ──
  { id: "grudge-drive", title: "Grudge Drive", description: "Asset management and sprite deployment tool", image: "/assets/games/logo.png", route: "/grudge-drive", tags: ["Assets"], category: "tools" },
  { id: "char-editor", title: "Character Editor", description: "Design characters with WCS stats and equipment", image: "/assets/games/arena.jpg", route: "/character-editor", tags: ["Editor"], category: "tools" },
  { id: "effects", title: "Effects Lab", description: "VFX testing playground with 29+ effects", image: "/assets/games/grudge-brand.png", route: "/effects-playground", tags: ["VFX"], category: "tools" },
  { id: "map-editor", title: "Map Editor", description: "Terrain and island map builder", image: "/assets/games/world-map.gif", route: "/map-editor", tags: ["Editor"], category: "tools" },
  { id: "skill-tree", title: "Skill Tree Editor", description: "Interactive skill tree designer for all classes", image: "/assets/games/crown-clash.png", route: "/skill-tree-editor", tags: ["Editor"], category: "tools" },
  // ── Platform ──
  { id: "warlords-site", title: "Grudge Warlords", description: "Play the flagship game at grudgewarlords.com", image: "/assets/games/warlords.jpg", route: "https://grudgewarlords.com", tags: ["Flagship"], category: "platform", external: true },
  { id: "objectstore", title: "ObjectStore API", description: "10,000+ game assets, 49 JSON endpoints", image: "/assets/games/logo.png", route: "https://molochdagod.github.io/ObjectStore", tags: ["API"], category: "platform", external: true },
  { id: "discord", title: "Discord", description: "Join the Grudge Warlords community", image: "/assets/games/grudge-brand.png", route: "https://discord.gg/FtGtmxmwkh", tags: ["Community"], category: "platform", external: true },
];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "pvp", label: "⚔️ PvP" },
  { key: "pve", label: "🛡️ PvE" },
  { key: "grudge", label: "🔥 Grudge Universe" },
  { key: "tools", label: "🛠️ Tools" },
  { key: "platform", label: "🌐 Platform" },
];

export default function FeaturedGames() {
  const [category, setCategory] = useState("all");
  const [, navigate] = useLocation();

  const filtered = category === "all" ? GAMES : GAMES.filter(g => g.category === category);

  return (
    <div className="launcher-root">
      <style>{`
        .launcher-root {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
        }

        .launcher-root::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(1px 1px at 10% 20%, rgba(255,107,107,0.6), transparent),
            radial-gradient(1px 1px at 30% 60%, rgba(107,107,255,0.5), transparent),
            radial-gradient(1px 1px at 50% 10%, rgba(255,235,59,0.4), transparent),
            radial-gradient(1px 1px at 70% 80%, rgba(0,255,127,0.4), transparent),
            radial-gradient(1px 1px at 90% 40%, rgba(255,107,107,0.5), transparent),
            radial-gradient(1px 1px at 15% 85%, rgba(107,107,255,0.4), transparent),
            radial-gradient(1px 1px at 45% 45%, rgba(255,235,59,0.3), transparent),
            radial-gradient(1px 1px at 80% 15%, rgba(0,255,127,0.5), transparent),
            radial-gradient(1px 1px at 5% 50%, #fff3, transparent),
            radial-gradient(1px 1px at 60% 70%, #fff2, transparent),
            radial-gradient(1px 1px at 25% 35%, #fff2, transparent),
            radial-gradient(1px 1px at 75% 55%, #fff3, transparent);
          animation: drift 60s linear infinite;
          pointer-events: none;
        }
        @keyframes drift {
          from { transform: translateY(0) rotate(0deg); }
          to { transform: translateY(-30px) rotate(2deg); }
        }

        .launcher-header {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 2rem 1rem 1rem;
        }
        .launcher-header h1 {
          font-size: 2.2rem;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 30px rgba(255,107,107,0.5), 0 0 60px rgba(255,107,107,0.2);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0;
        }
        .launcher-header p {
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .launcher-tabs {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 0 1rem 1.5rem;
          flex-wrap: wrap;
        }
        .launcher-tab {
          padding: 0.5rem 1.5rem;
          border-radius: 25px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(20,20,20,0.8);
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }
        .launcher-tab:hover {
          border-color: #ff6b6b;
          color: #ff6b6b;
        }
        .launcher-tab.active {
          background: linear-gradient(45deg, #ff9500, #ff4d00);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 0 15px rgba(255,107,107,0.3);
        }

        .game-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2rem;
          padding: 0 2rem 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .game-card {
          background: rgba(20, 20, 20, 0.9);
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(15px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          position: relative;
          min-height: 280px;
        }
        .game-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
          border-color: #ff6b6b;
        }

        .game-image {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          transition: filter 0.3s;
          background: rgba(255,255,255,0.05);
        }
        .game-card:hover .game-image {
          filter: brightness(1.1);
        }

        .game-title {
          color: #fff;
          font-size: 1.15rem;
          text-align: center;
          margin-bottom: 0.25rem;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
          font-weight: 700;
        }
        .game-desc {
          color: rgba(255,255,255,0.45);
          font-size: 0.78rem;
          text-align: center;
          margin-bottom: 0.6rem;
          line-height: 1.4;
        }

        .game-tags {
          display: flex;
          justify-content: center;
          gap: 0.4rem;
          margin-bottom: 0.6rem;
          flex-wrap: wrap;
        }
        .game-tag {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(255,107,107,0.15);
          color: #ff6b6b;
          border: 1px solid rgba(255,107,107,0.25);
        }

        .launch-btn {
          background: linear-gradient(45deg, #ff9500, #ff4d00);
          color: #fff;
          padding: 0.55rem 1rem;
          border-radius: 25px;
          border: none;
          width: 100%;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .launch-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }
        .launch-btn:hover::before {
          width: 200%;
          height: 200%;
        }
        .launch-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
        }

        .launcher-footer {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.3);
          font-size: 0.75rem;
        }
        .launcher-footer a {
          color: #ff6b6b;
          text-decoration: none;
        }
        .launcher-footer a:hover { color: #ff9500; }

        @media (max-width: 1024px) {
          .game-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
          .game-card { min-height: 260px; }
          .game-image { height: 140px; }
        }
        @media (max-width: 640px) {
          .game-grid { grid-template-columns: 1fr; padding: 0 1rem 2rem; gap: 1.25rem; }
          .game-card { min-height: 240px; }
          .game-image { height: 120px; }
          .launcher-header h1 { font-size: 1.5rem; }
        }
      `}</style>

      <div className="launcher-header">
        <h1>Grudge Studio</h1>
        <p>Games, tools, and the full Grudge universe â€” all in one place</p>
      </div>

      <div className="launcher-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`launcher-tab ${category === cat.key ? "active" : ""}`}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="game-grid">
        {filtered.map(game => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => {
              if (game.external) {
                window.open(game.route, "_blank");
              } else {
                navigate(game.route);
              }
            }}
          >
            <img src={game.image} alt={game.title} className="game-image" loading="lazy" />
            <div className="game-title">{game.title}</div>
            <div className="game-desc">{game.description}</div>
            <div className="game-tags">
              {game.tags.map(t => (
                <span key={t} className="game-tag">{t}</span>
              ))}
            </div>
            <button
              type="button"
              className="launch-btn"
              onClick={e => {
                e.stopPropagation();
                if (game.external) {
                  window.open(game.route, "_blank");
                } else {
                  navigate(game.route);
                }
              }}
            >
              {game.external ? "Open" : "Launch"}
            </button>
          </div>
        ))}
      </div>

      <div className="launcher-footer">
        <p>
          <a href="https://grudgewarlords.com" target="_blank" rel="noopener noreferrer">grudgewarlords.com</a>
          {" Â· "}
          <a href="https://discord.gg/FtGtmxmwkh" target="_blank" rel="noopener noreferrer">Discord</a>
          {" Â· "}
          <a href="https://github.com/MolochDaGod" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
        <p style={{ marginTop: 4 }}>Â© 2026 Grudge Studio. All rights reserved.</p>
      </div>
    </div>
  );
}

