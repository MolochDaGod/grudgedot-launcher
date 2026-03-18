# AI Systems Guide — GDevelop Assistant (GGE)

> How AI agents should understand, monitor, and contribute to the Grudge Studio game ecosystem.

## 1. Architecture Overview

GGE has three AI layers:

### AIWorker (Grok-Powered Frontend Monitor)
- **Location**: `server/services/aiWorker.ts` + `server/services/ai/providers/grok.ts`
- **Role**: Monitors live frontend sessions — captures console logs, errors, application state. Auto-analyzes errors and provides debugging assistance via Grok API.
- **Rate limit**: 5 requests/minute (built-in `RateLimiter` class)
- **Session model**: Each browser tab gets a session ID. Sessions expire after 30min inactivity.
- **Best practice**: Build context from recent logs + current URL + viewport before prompting. Keep prompts under 500 tokens for fast responses.

### GRUDA Legion (Railway Proxy)
- **Location**: `server/services/grudaLegion.ts` + `shared/grudachain.ts`
- **Production URL**: `https://api.grudge-studio.com`
- **Endpoints**: `/api/chat`, `/api/generate-code`, `/api/analyze-file`, `/api/vibe/chat`
- **Role**: Server-side AI proxy — keeps API keys off the client. Proxies to Railway-deployed GRUDA Legion node system.
- **Best practice**: Always proxy through server routes (`/api/gruda-legion/*`), never call Railway directly from client.

### AI Agent Server (Socket.IO)
- **Location**: `src/ai-agents/index.js`
- **Role**: Real-time agent registry via WebSocket. Agents register, receive queries, and respond.
- **Port**: 3001 (configurable via `AI_AGENT_PORT`)
- **Best practice**: Use Socket.IO events for real-time needs; REST endpoints for one-shot queries.

## 2. Shared Hero System (Cross-Game cNFT-Ready)

All games share the same hero data from `shared/grudaWarsHeroes.ts`:

### WCS 8-Stat System (`shared/grudachain.ts`)
Every hero has 8 attributes that drive ALL game mechanics across ALL games:

- **Strength** — Physical damage, carry weight
- **Vitality** — Max HP, HP regen
- **Endurance** — Defense, stamina, damage reduction
- **Intellect** — Spell damage, max mana
- **Wisdom** — Cast speed, mana regen, magic defense
- **Dexterity** — Crit chance, ranged accuracy, attack speed
- **Agility** — Dodge chance, move speed, evasion
- **Tactics** — AI companion effectiveness, tactical bonuses

### Stat Mapping to Game Mechanics
```
Max HP      = vitality × 10 + endurance × 5
Max Mana    = intellect × 8 + wisdom × 4
Phys Damage = strength × 2 + dexterity × 0.5
Spell Damage= intellect × 2.5 + wisdom × 0.5
Defense     = endurance × 2 + vitality + wisdom × 0.5
Crit Chance = dexterity × 1.5 + agility × 0.5 (cap 60%)
Dodge Chance= agility × 2 + dexterity × 0.5 (cap 40%)
Attack Speed= 1.0 + agility × 0.02
Move Speed  = 200 + agility × 4 + dexterity × 2
```

### Equipment Tier System (T0–T5)
- IDs follow: `GRUDA_WPN_{TYPE}_T{TIER}`, `GRUDA_ARM_{SLOT}_{WEIGHT}_T{TIER}`
- Each tier = ~30% stat increase
- Class restrictions on weapon types and armor weights

### Hero Roster
4 canonical heroes, each a different archetype:
- **Thane Ironshield** — Dwarf Warrior (tank)
- **Lyra Stormweaver** — Elf Mage (ranged DPS)
- **Kael Shadowblade** — Human Rogue (melee burst)
- **Mira Dawnbringer** — Human Cleric (healer/support)

## 3. Game-Specific AI Context

### MMO World (`/mmo`)
- **Engine**: Phaser 3 with Arcade Physics
- **Map**: 4800×3600 world, 5 biomes (forest, desert, snow, swamp, plains), 4 difficulty zones (safe → hard)
- **Combat**: Souls-like telegraphed attacks. Enemy melee = cone telegraph (500ms). Ranged = line indicator. AoE = filling circle. Boss = sweep/slam patterns.
- **Systems**: `mmo-systems.ts` has all combat formulas, equipment, crafting, professions
- **Indicators**: `mmo-indicators.ts` — `TelegraphManager` manages all active attack telegraphs
- **AI enemies**: Patrol → chase → attack behavior tree. Ranged enemies cast with wind-up. Bosses use multi-phase telegraphs.

### Grudge Swarm RTS (`/grudge-swarm`)
- **Engine**: Canvas 2D with custom sprite system
- **Sprites**: `sprite-loader.ts` + `character-loader.ts` — loads from `/assets/grudge-swarm/sprites/`
- **AI**: Faction-based unit AI with aggression/defense/economy balance

### Overdrive Racing (`/grudge-drive`)
- **Engine**: `overdriveEngine.ts` — physics-based racing
- **AI**: Track navigation, obstacle avoidance, boost management

### Gruda Wars (`/gruda-wars`)
- **Integration**: Embeds WCS (Warlord Crafting Suite) via iframe
- **Heroes**: Synced from `GRUDA_WARS_HEROES` → database
- **API**: `/api/gruda-wars/heroes`, `/api/gruda-wars/heroes/sync`

## 4. Sprite Pipeline

### Asset Flow
1. **Source**: Google Drive folder → `attached_assets/` (local) or CI sync
2. **Organization**: `npm run asset:sync` → `client/public/assets/{slug}/sprites/`
3. **Loading**: `character-loader.ts` → `sprite-loader.ts` → cached `Image` objects
4. **Rendering**: Canvas `drawImage()` with frame-based animation

### Sprite Naming Convention
- Main: `{Character}-{Animation}.png` (e.g., `Archer-Idle.png`)
- Multi-frame: `{Character}-{Animation}-{N}.png` (e.g., `Archer-Walk-1.png`)
- Effects: `(Split Effects)/{EffectName}-{Animation}.png`
- Projectiles: `(projectile)/{ProjectileId}-{Animation}.png`

### Adding Sprites for MMO
1. Upload to object storage or place in `attached_assets/tabs/mmo/sprites/`
2. Run `npm run asset:sync`
3. Register in `client/public/assets/mmo/characters.config.json`
4. The MMO scene falls back to procedural textures when sprites aren't found

## 5. Object Storage

### Architecture
- **Backend**: `server/objectStorage.ts` — wraps Google Cloud Storage via Replit sidecar
- **Public paths**: Configured via `PUBLIC_OBJECT_SEARCH_PATHS` env var
- **Private uploads**: Via signed URLs from `getAssetUploadURL()`

### Best Practices
- Always use server-side signed URLs for uploads — never expose GCS credentials client-side
- Use `PUBLIC_OBJECT_SEARCH_PATHS` for read access, `PRIVATE_OBJECT_DIR` for write
- Cache assets aggressively — set `Cache-Control` headers via `downloadObject()`
- On Vercel (production), object storage routes return 503 gracefully — use static assets instead

## 6. Combat AI Best Practices

### Enemy Behavior Trees
```
PATROL (wander near spawn) →
  IF player in aggro range → CHASE →
    IF player in attack range →
      IF ranged → START_CAST (show telegraph) → FIRE_PROJECTILE
      IF melee → WIND_UP (show telegraph) → STRIKE
    IF player leaves aggro+100px → RETURN_TO_PATROL
```

### Telegraph Integration
- **Always show telegraphs before damage**. This is the souls-like contract — player sees danger coming.
- Melee: `telegraphManager.meleeCone(x, y, range, direction, PI/3, 500ms)`
- Ranged: `telegraphManager.rangedLine(x, y, targetX, targetY, 800ms)`
- AoE: `telegraphManager.aoeCircle(x, y, radius, 1500ms)`
- Boss: Alternate between `bossSweep` and `bossSlam` patterns
- Damage only applies in `onComplete` callback — if player moves out, they dodge

### Difficulty Scaling
- Zone multipliers: easy=1×, medium=1.8×, hard=3× (health, attack, XP, gold)
- Boss enemies: 200 base HP, ranged + AoE, 5× XP multiplier
- Enemy level scales with player level: `scaledHealth = (base + playerLevel × 10) × zoneMultiplier`

## 7. CNFT Character & Island Ownership

Characters and home islands are minted as **Solana compressed NFTs (cNFTs)** via Crossmint. This is the backbone of cross-game character portability.

### How It Works
1. Player creates character in **Grudge Builder** (`D:\Games\Models\Grudge-Builder`) — picks race, class, name, generates AI avatar
2. `CrossmintWalletService.mintCharacterNFT()` mints a cNFT with all 8 WCS stats as on-chain metadata attributes
3. Any Grudge game can read the cNFT to hydrate the hero (stats, race, class, level, gear)
4. When the player earns XP / levels up / gets new gear, the game calls `updateNFTMetadata()` to update the on-chain data

### Collection IDs (Crossmint)
- Parent collection: `5061318d-ff65-4893-ac4b-9b28efb18ace`
- Character generation: `a9bb2c8d-1350-4413-aec7-5ba1f6888511`
- Home Island: `18d0e641-8713-4d5b-9a1d-ba67c516a3ce`

### On-chain Metadata Schema
Attributes array on each cNFT: Race, Class, Level, Strength, Vitality, Endurance, Intellect, Wisdom, Dexterity, Agility, Tactics, XP, HP. Built by `buildCharacterMetadata()` in `crossmintWallet.ts`.

### Reference Implementation
- `Grudge-Builder/server/spriteGeneration/services/crossmintWallet.ts` — low-level Crossmint API (mint, status poll, metadata update, wallet CRUD)
- `Grudge-Builder/server/spriteGeneration/services/nftMinting.ts` — `mintCharacterAsCNFT()`, `checkAndUpdateMintStatus()`, enriched NFT queries
- Island minting: `mintIslandToEmail()`, `mintIslandToWallet()`, `buildIslandMetadata()`

### Env Vars for Crossmint Integration
- `CROSSMINT_SERVER_API_KEY` / `CROSSMINT_SECRET_KEY`
- `CROSSMINT_COLLECTION_ID`
- `CROSSMINT_ISLAND_CNFT` (island template ID)
- `CROSSMINT_USE_STAGING` ("true" for staging API)

### AI Best Practices for CNFT-Aware Games
- Always read the player's cNFT on login to get the canonical hero state
- Apply WCS stats via `deriveCombatStats()` — never hardcode stat values
- When persisting progression, update both local DB and on-chain metadata
- Home islands should check for existing island cNFT before allowing new mint
- Use the same Crossmint collection IDs across all Grudge games for interoperability

## 8. Adding New Games

Follow the tab system in `docs/TABS_AND_APPS.md`:

1. `npm run scaffold:tab {slug} "{Title}"` — creates tab config, entry component, asset dirs
2. Register in `client/src/tabs.registry.json`
3. Add route in `client/src/App.tsx`
4. Import shared hero types from `shared/grudachain.ts` and `shared/grudaWarsHeroes.ts`
5. Use `deriveCombatStats()` from `mmo-systems.ts` (or create game-specific stat mapping)
6. Read player's cNFT via Crossmint API to load their universal hero
7. Same hero, same stats, same gear — different game mechanics

## 8. API Patterns

### Game State Persistence
- `server/services/gameStatePersistence.ts` — save/load game state per user
- Use `mmoApi.saveCharacterState()` for MMO character data
- Database: Drizzle ORM → Neon PostgreSQL

### Authentication
- JWT via Grudge Auth Gateway (`id.grudge-studio.com`)
- Token stored as `grudge_auth_token` in localStorage
- All API routes verify via `server/middleware/grudgeJwt.ts`

### Rate Limiting
- Grok AI: 5 requests/minute (built-in)
- GRUDA Legion proxy: 15s timeout per request
- Game APIs: No explicit rate limit — rely on auth + session management
