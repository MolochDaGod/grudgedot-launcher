import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, timestamp, json, int, boolean, index } from "drizzle-orm/mysql-core";
import { createInsertSchema as _createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Workaround: drizzle-zod 0.7.x type inference breaks .omit()/.pick() on
// the schema returned by createInsertSchema.  This typed shim lets
// downstream .omit() calls compile while z.infer resolves to `any`
// (preserving assignability to drizzle insert/update helpers).
type _OmittableZod = z.ZodType<any> & {
  omit(mask: Record<string, true>): z.ZodType<any>;
  pick(mask: Record<string, true>): z.ZodType<any>;
};
const createInsertSchema: (...args: Parameters<typeof _createInsertSchema>) => _OmittableZod =
  _createInsertSchema as any;

// Session storage table for Replit Auth
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  email: varchar("email", { length: 255 }).unique(),
  username: text("username").notNull(),
  password: text("password").notNull().default(""),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Player profile with game stats
export const playerProfiles = mysqlTable("player_profiles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  level: int("level").notNull().default(1),
  xp: int("xp").notNull().default(0),
  totalGamesPlayed: int("total_games_played").notNull().default(0),
  totalWins: int("total_wins").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game characters/heroes
export const characters = mysqlTable("characters", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(), // warrior, mage, archer, etc.
  rarity: varchar("rarity", { length: 255 }).notNull().default("common"), // common, rare, epic, legendary
  baseStats: json("base_stats").notNull(), // { health, attack, defense, speed }
  abilities: json("abilities").notNull(), // array of ability objects
  modelAssetUrl: varchar("model_asset_url", { length: 255 }),
  portraitUrl: varchar("portrait_url", { length: 255 }),
  unlockLevel: int("unlock_level").notNull().default(1),
  unlockCost: json("unlock_cost"), // { gold: 0, gems: 0 }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player owned characters
export const playerCharacters = mysqlTable("player_characters", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  playerId: varchar("player_id", { length: 255 }).references(() => playerProfiles.id).notNull(),
  characterId: varchar("character_id", { length: 255 }).references(() => characters.id).notNull(),
  level: int("level").notNull().default(1),
  xp: int("xp").notNull().default(0),
  equipment: json("equipment"), // equipped items
  customization: json("customization"), // skins, colors, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Currency types
export const currencies = mysqlTable("currencies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  code: varchar("code", { length: 255 }).notNull().unique(), // GOLD, GEMS, TOKENS
  name: varchar("name", { length: 255 }).notNull(),
  iconUrl: varchar("icon_url", { length: 255 }),
  isPremium: boolean("is_premium").notNull().default(false),
});

// Player wallets
export const playerWallets = mysqlTable("player_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  playerId: varchar("player_id", { length: 255 }).references(() => playerProfiles.id).notNull(),
  currencyId: varchar("currency_id", { length: 255 }).references(() => currencies.id).notNull(),
  balance: int("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  walletId: varchar("wallet_id", { length: 255 }).references(() => playerWallets.id).notNull(),
  amount: int("amount").notNull(), // positive for credit, negative for debit
  reason: varchar("reason", { length: 255 }).notNull(), // purchase, reward, refund, etc.
  referenceId: varchar("reference_id", { length: 255 }), // related item/match id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Store items
export const storeItems = mysqlTable("store_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull(), // character, skin, boost, currency
  itemType: varchar("item_type", { length: 255 }).notNull(),
  itemId: varchar("item_id", { length: 255 }), // reference to character, skin, etc.
  price: json("price").notNull(), // { gold: 100, gems: 0 }
  iconUrl: varchar("icon_url", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Achievements
export const achievements = mysqlTable("achievements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  iconUrl: varchar("icon_url", { length: 255 }),
  category: varchar("category", { length: 255 }).notNull(), // combat, collection, progression
  requirement: json("requirement").notNull(), // { type: "wins", count: 10 }
  reward: json("reward").notNull(), // { gold: 100, xp: 50 }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player achievements
export const playerAchievements = mysqlTable("player_achievements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  playerId: varchar("player_id", { length: 255 }).references(() => playerProfiles.id).notNull(),
  achievementId: varchar("achievement_id", { length: 255 }).references(() => achievements.id).notNull(),
  progress: int("progress").notNull().default(0),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game lobbies
export const gameLobbies = mysqlTable("game_lobbies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  hostId: varchar("host_id", { length: 255 }).references(() => playerProfiles.id).notNull(),
  gameMode: varchar("game_mode", { length: 255 }).notNull().default("pvp"), // pvp, coop, campaign
  maxPlayers: int("max_players").notNull().default(4),
  isPrivate: boolean("is_private").notNull().default(false),
  password: varchar("password", { length: 255 }),
  status: varchar("status", { length: 255 }).notNull().default("waiting"), // waiting, starting, in_game, finished
  settings: json("settings").notNull(), // game-specific settings
  rtsProjectId: varchar("rts_project_id", { length: 255 }).references(() => rtsProjects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lobby players
export const lobbyPlayers = mysqlTable("lobby_players", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  lobbyId: varchar("lobby_id", { length: 255 }).references(() => gameLobbies.id).notNull(),
  playerId: varchar("player_id", { length: 255 }).references(() => playerProfiles.id).notNull(),
  characterId: varchar("character_id", { length: 255 }).references(() => characters.id),
  team: int("team").notNull().default(1),
  isReady: boolean("is_ready").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Game sessions (active matches)
export const gameSessions = mysqlTable("game_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  lobbyId: varchar("lobby_id", { length: 255 }).references(() => gameLobbies.id).notNull(),
  status: varchar("status", { length: 255 }).notNull().default("active"), // active, paused, finished
  gameState: json("game_state").notNull(), // current game state
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  winnerId: varchar("winner_id", { length: 255 }).references(() => playerProfiles.id),
  results: json("results"), // match results and stats
});

// AI behavior profiles
export const aiBehaviors = mysqlTable("ai_behaviors", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 255 }).notNull(), // easy, medium, hard, expert
  description: text("description"),
  aggressiveness: int("aggressiveness").notNull().default(50), // 0-100
  defensiveness: int("defensiveness").notNull().default(50), // 0-100
  economyFocus: int("economy_focus").notNull().default(50), // 0-100
  expansionRate: int("expansion_rate").notNull().default(50), // 0-100
  unitPreferences: json("unit_preferences"), // preferred unit types
  buildOrder: json("build_order"), // scripted build sequence
  decisionTree: json("decision_tree"), // AI decision logic
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User settings
export const userSettings = mysqlTable("user_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull().unique(),
  audioSettings: json("audio_settings"), // { masterVolume, musicVolume, sfxVolume }
  graphicsSettings: json("graphics_settings"), // { quality, shadows, particles }
  gameplaySettings: json("gameplay_settings"), // { cameraSpeed, keybindings }
  notificationSettings: json("notification_settings"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Level requirements
export const levelRequirements = mysqlTable("level_requirements", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  level: int("level").notNull().unique(),
  xpRequired: int("xp_required").notNull(),
  rewards: json("rewards").notNull(), // { gold, gems, unlocks }
});

// Existing tables
export const gameProjects = mysqlTable("game_projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  description: text("description"),
  gameType: text("game_type").notNull(),
  specifications: json("specifications").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatConversations = mysqlTable("chat_conversations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => gameProjects.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  conversationId: varchar("conversation_id", { length: 255 }).references(() => chatConversations.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gdevelopAssets = mysqlTable("gdevelop_assets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull().default("internal"),
  sourceUrl: text("source_url"),
  previewUrl: text("preview_url"),
  modelUrl: text("model_url"),
  objectKey: text("object_key"),
  bucketId: text("bucket_id"),
  contentType: text("content_type"),
  fileSize: int("file_size"),
  tags: json("tags").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at"),
});

export const insertGdevelopAssetSchema = createInsertSchema(gdevelopAssets).omit({
  id: true,
  uploadedAt: true,
});

export type InsertGdevelopAsset = z.infer<typeof insertGdevelopAssetSchema>;
export type GDevelopAsset = typeof gdevelopAssets.$inferSelect;

// GDevelop Tools Schema
export const gdevelopToolsSchema = z.object({
  behaviors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    docUrl: z.string().optional(),
    isBuiltIn: z.boolean().default(true),
  })).default([]),
  extensions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    docUrl: z.string().optional(),
    author: z.string().optional(),
  })).default([]),
  templates: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string(),
  })).default([]),
});

export type GDevelopTools = z.infer<typeof gdevelopToolsSchema>;

export const rtsProjects = mysqlTable("rts_projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  gameMode: text("game_mode").notNull().default("pvp"),
  mapData: json("map_data").notNull(),
  gameSettings: json("game_settings").notNull(),
  campaignData: json("campaign_data"),
  gdevelopTools: json("gdevelop_tools").notNull().default(sql`(CAST('{"behaviors":[],"extensions":[],"templates":[]}' AS JSON))`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rtsAssets = mysqlTable("rts_assets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  fileUrl: text("file_url").notNull(),
  previewUrl: text("preview_url"),
  metadata: json("metadata").notNull(),
  tags: json("tags").notNull(),
  source: text("source").notNull().default("user_upload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rtsUnitTemplates = mysqlTable("rts_unit_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id).notNull(),
  name: text("name").notNull(),
  modelAssetId: varchar("model_asset_id", { length: 255 }).references(() => rtsAssets.id),
  stats: json("stats").notNull(),
  cost: json("cost").notNull(),
  abilities: json("abilities").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rtsBuildingTemplates = mysqlTable("rts_building_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id).notNull(),
  name: text("name").notNull(),
  modelAssetId: varchar("model_asset_id", { length: 255 }).references(() => rtsAssets.id),
  stats: json("stats").notNull(),
  cost: json("cost").notNull(),
  produces: json("produces"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============= OpenRTS Engine Tables =============

// OpenRTS Movers - pathfinding and movement modes
export const openrtsMover = mysqlTable("openrts_movers", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  pathfindingMode: text("pathfinding_mode").notNull().default("Walk"), // Walk, Fly
  heightmap: text("heightmap").notNull().default("Ground"), // Ground, Sky, Air
  standingMode: text("standing_mode").notNull().default("Stand"), // Stand, Prone
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Weapons - combat systems
export const openrtsWeapons = mysqlTable("openrts_weapons", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name").notNull(),
  effectLink: text("effect_link"), // references effect
  range: text("range").notNull().default("5"), // attack range
  scanRange: text("scan_range").notNull().default("7"), // detection range
  period: text("period").notNull().default("4"), // attack cooldown
  damage: int("damage").notNull().default(10),
  damageType: text("damage_type").notNull().default("physical"), // physical, magic, fire, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Effects - visual/damage effects
export const openrtsEffects = mysqlTable("openrts_effects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name"),
  effectType: text("effect_type").notNull().default("damage"), // damage, heal, buff, debuff, projectile
  damage: int("damage").default(0),
  radius: text("radius"), // for AOE effects
  duration: text("duration"), // for buffs/debuffs
  projectileLink: text("projectile_link"), // for projectile-based effects
  particleEffect: text("particle_effect"), // visual effect name
  soundEffect: text("sound_effect"), // audio effect name
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Projectiles - flying objects
export const openrtsProjectiles = mysqlTable("openrts_projectiles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  speed: text("speed").notNull().default("10"),
  modelPath: text("model_path"),
  trailEffect: text("trail_effect"),
  impactEffect: text("impact_effect"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Actors - visual representation
export const openrtsActors = mysqlTable("openrts_actors", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  modelPath: text("model_path").notNull(),
  scale: text("scale").default("1"),
  animations: json("animations").default(sql`(CAST('{}' AS JSON))`), // { idle, walk, attack, death }
  sounds: json("sounds").default(sql`(CAST('{}' AS JSON))`), // { select, move, attack, death }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Units - complete unit definitions
export const openrtsUnits = mysqlTable("openrts_units", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name").notNull(),
  race: text("race").notNull().default("human"), // human, alien, undead, etc.
  radius: text("radius").notNull().default("0.25"), // collision radius
  separationRadius: text("separation_radius").notNull().default("0.25"),
  speed: text("speed").notNull().default("2.5"),
  mass: text("mass").notNull().default("1.0"),
  maxHealth: int("max_health").notNull().default(100),
  sight: text("sight").notNull().default("7"), // vision range
  moverLink: text("mover_link"), // references mover
  weaponLinks: json("weapon_links"), // references weapons
  actorLink: text("actor_link"), // references actor
  modelPath: text("model_path"), // direct model path
  cost: json("cost").default(sql`(CAST('{"gold":100}' AS JSON))`),
  buildTime: int("build_time").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Map Styles
export const openrtsMapStyles = mysqlTable("openrts_map_styles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  groundTexture: text("ground_texture"),
  cliffTexture: text("cliff_texture"),
  waterTexture: text("water_texture"),
  ambientColor: text("ambient_color"),
  sunColor: text("sun_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Trinkets (map decorations)
export const openrtsTrinkets = mysqlTable("openrts_trinkets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  projectId: varchar("project_id", { length: 255 }).references(() => rtsProjects.id),
  name: text("name").notNull(),
  modelPath: text("model_path").notNull(),
  isBlocking: boolean("is_blocking").default(false),
  isDestructible: boolean("is_destructible").default(false),
  scale: text("scale").default("1"),
  category: text("category").notNull().default("decoration"), // decoration, tree, rock, building
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Viewport Assets - centralized 3D/2D asset storage with rendering config
export const viewportAssets = mysqlTable("viewport_assets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sourceType: text("source_type").notNull().default("internal"), // internal, gdevelop, rts, external
  assetType: text("asset_type").notNull(), // gltf, fbx, sprite, texture, animation
  category: text("category").notNull(), // race/unit/building/weapon/ui/environment
  subcategory: text("subcategory"), // orcs/elves/humans/skeletons/etc
  filePath: text("file_path").notNull(), // relative path under attached_assets
  previewImageUrl: text("preview_image_url"), // generated thumbnail
  texturePaths: json("texture_paths"), // associated texture files
  metadata: json("metadata").notNull().default(sql`(CAST('{}' AS JSON))`), // scale, pivot, animations, LOD
  viewportConfig: json("viewport_config").notNull().default(sql`(CAST('{}' AS JSON))`), // camera, lighting config
  tags: json("tags").notNull().default(sql`(CAST('[]' AS JSON))`),
  isAnimated: boolean("is_animated").notNull().default(false),
  fileSize: int("file_size"), // bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGameProjectSchema = createInsertSchema(gameProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});


// Custom RTS Project insert schema (avoiding drizzle-zod issues with complex json)
export const insertRtsProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  gameMode: z.string().default("pvp"),
  mapData: z.any().default({ size: 64, terrain: "grass" }),
  gameSettings: z.any().default({ startingGold: 1000, maxPopulation: 50 }),
  campaignData: z.any().optional().nullable(),
  gdevelopTools: gdevelopToolsSchema.optional().default({ behaviors: [], extensions: [], templates: [] }),
});

export const insertRtsAssetSchema = createInsertSchema(rtsAssets).omit({
  id: true,
  createdAt: true,
});

export const insertRtsUnitTemplateSchema = createInsertSchema(rtsUnitTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertRtsBuildingTemplateSchema = createInsertSchema(rtsBuildingTemplates).omit({
  id: true,
  createdAt: true,
});

// OpenRTS Insert Schemas
export const insertOpenRTSMoverSchema = createInsertSchema(openrtsMover).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSWeaponSchema = createInsertSchema(openrtsWeapons).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSEffectSchema = createInsertSchema(openrtsEffects).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSProjectileSchema = createInsertSchema(openrtsProjectiles).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSActorSchema = createInsertSchema(openrtsActors).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSUnitSchema = createInsertSchema(openrtsUnits).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSMapStyleSchema = createInsertSchema(openrtsMapStyles).omit({
  id: true,
  createdAt: true,
});

export const insertOpenRTSTrinketSchema = createInsertSchema(openrtsTrinkets).omit({
  id: true,
  createdAt: true,
});

export const insertViewportAssetSchema = createInsertSchema(viewportAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerCharacterSchema = createInsertSchema(playerCharacters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurrencySchema = createInsertSchema(currencies).omit({
  id: true,
});

export const insertPlayerWalletSchema = createInsertSchema(playerWallets).omit({
  id: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertStoreItemSchema = createInsertSchema(storeItems).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerAchievementSchema = createInsertSchema(playerAchievements).omit({
  id: true,
  createdAt: true,
});

export const insertGameLobbySchema = createInsertSchema(gameLobbies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLobbyPlayerSchema = createInsertSchema(lobbyPlayers).omit({
  id: true,
  joinedAt: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  startedAt: true,
});

export const insertAiBehaviorSchema = createInsertSchema(aiBehaviors).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertLevelRequirementSchema = createInsertSchema(levelRequirements).omit({
  id: true,
});

// ============================================
// GRUDGE ACCOUNTS — Universal Grudge Studio identity
// Matches WCS accounts schema. Every login method produces a row here.
// Grudge ID = Puter ID. Crossmint wallet auto-created on registration.
// ============================================
export const accounts = mysqlTable("accounts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  grudgeId: varchar("grudge_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  avatarUrl: text("avatar_url"),
  faction: varchar("faction", { length: 50 }),
  // Auth — password
  passwordHash: varchar("password_hash", { length: 255 }),
  // Auth — Solana wallet (Crossmint auto-created)
  walletAddress: varchar("wallet_address", { length: 255 }),
  walletType: varchar("wallet_type", { length: 50 }), // crossmint-custodial | external
  crossmintWalletId: varchar("crossmint_wallet_id", { length: 255 }),
  crossmintEmail: varchar("crossmint_email", { length: 255 }),
  // Auth — Puter (Grudge ID IS the Puter ID)
  puterUuid: varchar("puter_uuid", { length: 255 }),
  puterUsername: varchar("puter_username", { length: 100 }),
  // Auth — Google
  googleId: varchar("google_id", { length: 255 }),
  googleEmail: varchar("google_email", { length: 255 }),
  // Auth — Discord
  discordId: varchar("discord_id", { length: 255 }),
  discordUsername: varchar("discord_username", { length: 100 }),
  // Auth — GitHub
  githubId: varchar("github_id", { length: 255 }),
  githubUsername: varchar("github_username", { length: 100 }),
  // Account status
  isPremium: boolean("is_premium").default(false),
  isGuest: boolean("is_guest").default(false),
  // Balances
  gold: int("gold").default(0),
  gbuxBalance: int("gbux_balance").default(0),
  // Game counts
  totalCharacters: int("total_characters").default(0),
  totalIslands: int("total_islands").default(0),
  homeIslandId: varchar("home_island_id", { length: 255 }),
  hasCompletedTutorial: boolean("has_completed_tutorial").default(false),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: json("metadata").default(sql`(CAST('{}' AS JSON))`),
}, (table) => [
  index("accounts_grudge_id_idx").on(table.grudgeId),
  index("accounts_puter_uuid_idx").on(table.puterUuid),
  index("accounts_wallet_idx").on(table.walletAddress),
  index("accounts_discord_id_idx").on(table.discordId),
  index("accounts_github_id_idx").on(table.githubId),
]);

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ============================================
// GRUDGE CHARACTERS — Per-player WCS-compatible characters
// Linked to accounts.id. Full 8 WCS stats, equipment, professions, NFT fields.
// Same schema as WCS characters table for cross-game portability.
// ============================================
export const grudgeCharacters = mysqlTable("grudge_characters", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  accountId: varchar("account_id", { length: 255 }).references(() => accounts.id).notNull(),
  grudgeId: varchar("grudge_id", { length: 64 }),
  name: text("name").notNull(),
  classId: text("class_id"), // warrior, mage, ranger, shapeshifter
  raceId: text("race_id"), // human, orc, elf, dwarf, barbarian, undead
  profession: text("profession"),
  faction: text("faction"),
  level: int("level").notNull().default(1),
  experience: int("experience").notNull().default(0),
  gold: int("gold").notNull().default(1000),
  skillPoints: int("skill_points").notNull().default(5),
  attributePoints: int("attribute_points").notNull().default(0),
  // WCS 8-stat attributes
  attributes: json("attributes").default(sql`(CAST('{"Strength":0,"Vitality":0,"Endurance":0,"Intellect":0,"Wisdom":0,"Dexterity":0,"Agility":0,"Tactics":0}' AS JSON))`),
  // 10-slot equipment
  equipment: json("equipment").default(sql`(CAST('{"head":null,"chest":null,"legs":null,"feet":null,"hands":null,"shoulders":null,"mainHand":null,"offHand":null,"accessory1":null,"accessory2":null}' AS JSON))`),
  // 5 profession progressions
  professionProgression: json("profession_progression").default(sql`(CAST('{"Miner":{"level":1,"xp":0,"pointsSpent":0},"Forester":{"level":1,"xp":0,"pointsSpent":0},"Mystic":{"level":1,"xp":0,"pointsSpent":0},"Chef":{"level":1,"xp":0,"pointsSpent":0},"Engineer":{"level":1,"xp":0,"pointsSpent":0}}' AS JSON))`),
  // Inventory
  inventory: json("inventory").default(sql`(CAST('[]' AS JSON))`),
  // Combat
  abilities: json("abilities").default(sql`(CAST('[]' AS JSON))`),
  skillTree: json("skill_tree").default(sql`(CAST('{}' AS JSON))`),
  currentHealth: int("current_health"),
  currentMana: int("current_mana"),
  currentStamina: int("current_stamina"),
  avatarUrl: text("avatar_url"),
  // NFT fields
  isNft: boolean("is_nft").default(false),
  nftMintAddress: varchar("nft_mint_address", { length: 255 }),
  nftCollection: varchar("nft_collection", { length: 255 }),
  nftMintedAt: timestamp("nft_minted_at"),
  // State
  isActive: boolean("is_active").default(true),
  slotIndex: int("slot_index").default(0),
  isGuest: boolean("is_guest").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("grudge_chars_account_id_idx").on(table.accountId),
  index("grudge_chars_grudge_id_idx").on(table.grudgeId),
]);

export const insertGrudgeCharacterSchema = createInsertSchema(grudgeCharacters).omit({ id: true, createdAt: true });
export type InsertGrudgeCharacter = z.infer<typeof insertGrudgeCharacterSchema>;
export type GrudgeCharacter = typeof grudgeCharacters.$inferSelect;

// Saved custom characters from character creator (MMO-style)
export const savedCharacters = mysqlTable("saved_characters", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  presetId: varchar("preset_id", { length: 255 }).notNull(),
  customization: json("customization").notNull(),
  colors: json("colors"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedCharacterSchema = createInsertSchema(savedCharacters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertGameProject = z.infer<typeof insertGameProjectSchema>;
export type GameProject = typeof gameProjects.$inferSelect;

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;


export type InsertRtsProject = z.infer<typeof insertRtsProjectSchema>;
export type RtsProject = typeof rtsProjects.$inferSelect;

export type InsertRtsAsset = z.infer<typeof insertRtsAssetSchema>;
export type RtsAsset = typeof rtsAssets.$inferSelect;

export type InsertRtsUnitTemplate = z.infer<typeof insertRtsUnitTemplateSchema>;
export type RtsUnitTemplate = typeof rtsUnitTemplates.$inferSelect;

export type InsertRtsBuildingTemplate = z.infer<typeof insertRtsBuildingTemplateSchema>;
export type RtsBuildingTemplate = typeof rtsBuildingTemplates.$inferSelect;

// OpenRTS Types
export type InsertOpenRTSMover = z.infer<typeof insertOpenRTSMoverSchema>;
export type OpenRTSMover = typeof openrtsMover.$inferSelect;

export type InsertOpenRTSWeapon = z.infer<typeof insertOpenRTSWeaponSchema>;
export type OpenRTSWeapon = typeof openrtsWeapons.$inferSelect;

export type InsertOpenRTSEffect = z.infer<typeof insertOpenRTSEffectSchema>;
export type OpenRTSEffect = typeof openrtsEffects.$inferSelect;

export type InsertOpenRTSProjectile = z.infer<typeof insertOpenRTSProjectileSchema>;
export type OpenRTSProjectile = typeof openrtsProjectiles.$inferSelect;

export type InsertOpenRTSActor = z.infer<typeof insertOpenRTSActorSchema>;
export type OpenRTSActor = typeof openrtsActors.$inferSelect;

export type InsertOpenRTSUnit = z.infer<typeof insertOpenRTSUnitSchema>;
export type OpenRTSUnit = typeof openrtsUnits.$inferSelect;

export type InsertOpenRTSMapStyle = z.infer<typeof insertOpenRTSMapStyleSchema>;
export type OpenRTSMapStyle = typeof openrtsMapStyles.$inferSelect;

export type InsertOpenRTSTrinket = z.infer<typeof insertOpenRTSTrinketSchema>;
export type OpenRTSTrinket = typeof openrtsTrinkets.$inferSelect;

export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerProfile = typeof playerProfiles.$inferSelect;

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

export type InsertPlayerCharacter = z.infer<typeof insertPlayerCharacterSchema>;
export type PlayerCharacter = typeof playerCharacters.$inferSelect;

export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currencies.$inferSelect;

export type InsertPlayerWallet = z.infer<typeof insertPlayerWalletSchema>;
export type PlayerWallet = typeof playerWallets.$inferSelect;

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export type InsertStoreItem = z.infer<typeof insertStoreItemSchema>;
export type StoreItem = typeof storeItems.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertPlayerAchievement = z.infer<typeof insertPlayerAchievementSchema>;
export type PlayerAchievement = typeof playerAchievements.$inferSelect;

export type InsertGameLobby = z.infer<typeof insertGameLobbySchema>;
export type GameLobby = typeof gameLobbies.$inferSelect;

export type InsertLobbyPlayer = z.infer<typeof insertLobbyPlayerSchema>;
export type LobbyPlayer = typeof lobbyPlayers.$inferSelect;

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

export type InsertAiBehavior = z.infer<typeof insertAiBehaviorSchema>;
export type AiBehavior = typeof aiBehaviors.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertLevelRequirement = z.infer<typeof insertLevelRequirementSchema>;
export type LevelRequirement = typeof levelRequirements.$inferSelect;

export type InsertViewportAsset = z.infer<typeof insertViewportAssetSchema>;
export type ViewportAsset = typeof viewportAssets.$inferSelect;

export type InsertSavedCharacter = z.infer<typeof insertSavedCharacterSchema>;
export type SavedCharacter = typeof savedCharacters.$inferSelect;

// Asset metadata for 3D model parsing (meshes, materials, animations)
export const assetMetadata = mysqlTable("asset_metadata", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  storagePath: text("storage_path").notNull().unique(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // glb, gltf, fbx, obj, png, jpg, etc.
  fileSize: int("file_size"),
  
  // Parsed 3D data
  meshes: json("meshes").notNull().default(sql`(CAST('[]' AS JSON))`), // [{name, vertexCount, faceCount}]
  materials: json("materials").notNull().default(sql`(CAST('[]' AS JSON))`), // [{name, type, color, textures}]
  animations: json("animations").notNull().default(sql`(CAST('[]' AS JSON))`), // [{name, duration, keyframes}]
  textures: json("textures").notNull().default(sql`(CAST('[]' AS JSON))`), // [{name, size, format}]
  
  // Bounding box and scene info
  boundingBox: json("bounding_box"), // {min: {x,y,z}, max: {x,y,z}, center, size}
  sceneInfo: json("scene_info"), // {nodeCount, totalVertices, totalFaces}
  
  // Thumbnail
  thumbnailUrl: text("thumbnail_url"),
  
  // Organization (enforced categories)
  folder: text("folder").notNull().default("/"),
  category: text("category").notNull().default("misc"), // models, textures, audio, animations, maps
  subcategory: text("subcategory"), // characters, buildings, terrain, ui, etc.
  tags: json("tags").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Provenance & licensing
  source: text("source"), // kenney, kaykit, imgur, user-upload, etc.
  sourceUrl: text("source_url"), // original URL if applicable
  license: text("license").notNull().default("unknown"), // cc0, cc-by, personal, commercial
  
  // Versioning
  version: text("version").notNull().default("1.0.0"),
  contentHash: text("content_hash"), // SHA256 for deduplication
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssetMetadataSchema = createInsertSchema(assetMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetMetadata = z.infer<typeof insertAssetMetadataSchema>;
export type AssetMetadata = typeof assetMetadata.$inferSelect;

// ============================================
// UNIFIED ASSET LIBRARY
// Consolidates gdevelopAssets, rtsAssets, viewportAssets into one system
// ============================================

export const unifiedAssets = mysqlTable("unified_assets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  
  // Classification
  assetType: text("asset_type").notNull(), // model, texture, audio, sprite, animation, map
  category: text("category").notNull(), // characters, buildings, weapons, terrain, ui, sfx, music
  subcategory: text("subcategory"),
  
  // Storage - Object Storage paths
  storagePath: text("storage_path").notNull(), // full object storage path
  fileUrl: text("file_url").notNull(), // public URL to access file
  previewUrl: text("preview_url"), // thumbnail/preview image URL
  fileSize: int("file_size"),
  contentType: text("content_type"),
  contentHash: text("content_hash"), // SHA256 for deduplication
  
  // Metadata
  tags: json("tags").notNull().default(sql`(CAST('[]' AS JSON))`),
  description: text("description"),
  metadata: json("metadata").notNull().default(sql`(CAST('{}' AS JSON))`), // flexible additional data (meshes, animations, etc.)
  
  // Source tracking
  source: text("source").notNull().default("user-upload"), // user-upload, kenney, kaykit, opengameart, ai-generated
  sourceUrl: text("source_url"),
  license: text("license").notNull().default("unknown"), // cc0, cc-by, cc-by-sa, cc-by-nc, personal, commercial
  
  // Ownership & scoping
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  scope: text("scope").notNull().default("user"), // public, team, user
  
  // Versioning
  version: text("version").notNull().default("1.0.0"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUnifiedAssetSchema = createInsertSchema(unifiedAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUnifiedAsset = z.infer<typeof insertUnifiedAssetSchema>;
export type UnifiedAsset = typeof unifiedAssets.$inferSelect;

// ============================================
// WARLORDS BUILDER PREFAB SYSTEM
// ============================================

// Stat blocks for entities (reusable templates)
export const warlordStatBlocks = mysqlTable("warlord_stat_blocks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Base stats
  strength: int("strength").notNull().default(10),
  agility: int("agility").notNull().default(10),
  intelligence: int("intelligence").notNull().default(10),
  constitution: int("constitution").notNull().default(10),
  wisdom: int("wisdom").notNull().default(10),
  charisma: int("charisma").notNull().default(10),
  
  // Combat stats
  attackPower: int("attack_power").notNull().default(10),
  defense: int("defense").notNull().default(5),
  critChance: int("crit_chance").notNull().default(5), // percentage
  critDamage: int("crit_damage").notNull().default(150), // percentage
  attackSpeed: int("attack_speed").notNull().default(100), // percentage
  moveSpeed: int("move_speed").notNull().default(100), // percentage
  
  // Resistances (percentage)
  physicalResist: int("physical_resist").notNull().default(0),
  magicResist: int("magic_resist").notNull().default(0),
  fireResist: int("fire_resist").notNull().default(0),
  iceResist: int("ice_resist").notNull().default(0),
  
  // Growth curves (JSON for level-based scaling)
  growthCurves: json("growth_curves").notNull().default(sql`(CAST('{}' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Energy pools (health, mana, stamina, etc.)
export const warlordEnergies = mysqlTable("warlord_energies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Energy definitions
  maxHealth: int("max_health").notNull().default(100),
  healthRegen: int("health_regen").notNull().default(1), // per second
  maxMana: int("max_mana").notNull().default(50),
  manaRegen: int("mana_regen").notNull().default(1),
  maxStamina: int("max_stamina").notNull().default(100),
  staminaRegen: int("stamina_regen").notNull().default(5),
  
  // Optional custom energies (rage, focus, etc.)
  customEnergies: json("custom_energies").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Skills and spells templates
export const warlordSkills = mysqlTable("warlord_skills", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  skillType: varchar("skill_type", { length: 255 }).notNull().default("active"), // active, passive, toggle, aura
  
  // Cost and cooldown
  manaCost: int("mana_cost").notNull().default(0),
  staminaCost: int("stamina_cost").notNull().default(0),
  healthCost: int("health_cost").notNull().default(0),
  cooldown: int("cooldown").notNull().default(0), // milliseconds
  castTime: int("cast_time").notNull().default(0), // milliseconds
  
  // Effects and damage
  damageType: varchar("damage_type", { length: 255 }).default("physical"), // physical, magic, fire, ice, etc.
  baseDamage: int("base_damage").notNull().default(0),
  damageScaling: json("damage_scaling").notNull().default(sql`(CAST('{}' AS JSON))`), // stat scaling
  effects: json("effects").notNull().default(sql`(CAST('[]' AS JSON))`), // buffs, debuffs, etc.
  
  // Visual/animation
  animationName: varchar("animation_name", { length: 255 }),
  animationSpeed: int("animation_speed").notNull().default(100), // percentage
  vfxId: varchar("vfx_id", { length: 255 }),
  iconUrl: varchar("icon_url", { length: 255 }),
  
  // Requirements
  levelRequired: int("level_required").notNull().default(1),
  prerequisites: json("prerequisites").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Harvesting and crafting profiles
export const warlordCraftingProfiles = mysqlTable("warlord_crafting_profiles", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Gathering skills
  miningLevel: int("mining_level").notNull().default(0),
  harvestingLevel: int("harvesting_level").notNull().default(0),
  loggingLevel: int("logging_level").notNull().default(0),
  fishingLevel: int("fishing_level").notNull().default(0),
  
  // Crafting skills
  smithingLevel: int("smithing_level").notNull().default(0),
  tailoringLevel: int("tailoring_level").notNull().default(0),
  alchemyLevel: int("alchemy_level").notNull().default(0),
  enchantingLevel: int("enchanting_level").notNull().default(0),
  cookingLevel: int("cooking_level").notNull().default(0),
  
  // Known recipes (array of recipe IDs)
  knownRecipes: json("known_recipes").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Animation sets for entities
export const warlordAnimationSets = mysqlTable("warlord_animation_sets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Animation mappings (key: animation name, value: config)
  idle: json("idle").notNull().default(sql`(CAST('{"name":"idle","speed":1,"loop":true}' AS JSON))`),
  walk: json("walk").notNull().default(sql`(CAST('{"name":"walk","speed":1,"loop":true}' AS JSON))`),
  run: json("run").notNull().default(sql`(CAST('{"name":"run","speed":1,"loop":true}' AS JSON))`),
  attack: json("attack").notNull().default(sql`(CAST('{"name":"attack","speed":1,"loop":false}' AS JSON))`),
  death: json("death").notNull().default(sql`(CAST('{"name":"death","speed":1,"loop":false}' AS JSON))`),
  
  // Additional custom animations
  customAnimations: json("custom_animations").notNull().default(sql`(CAST('{}' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entity prefabs (player, NPC, monster, ally)
export const warlordEntityPrefabs = mysqlTable("warlord_entity_prefabs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  entityType: varchar("entity_type", { length: 255 }).notNull(), // player, npc, monster, ally
  scope: varchar("scope", { length: 255 }).notNull().default("user"), // public, team, user
  
  // 3D asset references
  modelAssetId: varchar("model_asset_id", { length: 255 }).references(() => viewportAssets.id),
  modelUrl: text("model_url"), // direct URL fallback
  thumbnailUrl: text("thumbnail_url"),
  
  // Stats and abilities
  statBlockId: varchar("stat_block_id", { length: 255 }).references(() => warlordStatBlocks.id),
  energiesId: varchar("energies_id", { length: 255 }).references(() => warlordEnergies.id),
  animationSetId: varchar("animation_set_id", { length: 255 }).references(() => warlordAnimationSets.id),
  craftingProfileId: varchar("crafting_profile_id", { length: 255 }).references(() => warlordCraftingProfiles.id),
  
  // Skills (array of skill IDs)
  skillIds: json("skill_ids").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // AI behavior (for NPCs/monsters)
  aiBehaviorId: varchar("ai_behavior_id", { length: 255 }).references(() => aiBehaviors.id),
  
  // Physical properties
  scale: json("scale").notNull().default(sql`(CAST('{"x":1,"y":1,"z":1}' AS JSON))`),
  colliderType: varchar("collider_type", { length: 255 }).notNull().default("capsule"), // capsule, box, sphere
  colliderSize: json("collider_size").notNull().default(sql`(CAST('{"radius":0.5,"height":2}' AS JSON))`),
  
  // Loot table (for monsters)
  lootTable: json("loot_table").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Dialogue (for NPCs)
  dialogueTree: json("dialogue_tree"),
  
  // Shop inventory (for vendor NPCs)
  shopInventory: json("shop_inventory"),
  
  tags: json("tags").notNull().default(sql`(CAST('[]' AS JSON))`),
  isTemplate: boolean("is_template").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Weapon prefabs
export const warlordWeaponPrefabs = mysqlTable("warlord_weapon_prefabs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  weaponType: varchar("weapon_type", { length: 255 }).notNull(), // sword, axe, bow, staff, etc.
  scope: varchar("scope", { length: 255 }).notNull().default("user"),
  
  // 3D asset
  modelAssetId: varchar("model_asset_id", { length: 255 }).references(() => viewportAssets.id),
  modelUrl: text("model_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Stats
  baseDamage: int("base_damage").notNull().default(10),
  attackSpeed: int("attack_speed").notNull().default(100), // percentage
  critChance: int("crit_chance").notNull().default(5),
  range: int("range").notNull().default(2), // attack range in units
  
  // Bonuses
  statBonuses: json("stat_bonuses").notNull().default(sql`(CAST('{}' AS JSON))`),
  
  // Special abilities attached to weapon
  skillIds: json("skill_ids").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Requirements
  levelRequired: int("level_required").notNull().default(1),
  classRestrictions: json("class_restrictions").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Rarity and value
  rarity: varchar("rarity", { length: 255 }).notNull().default("common"),
  sellPrice: int("sell_price").notNull().default(10),
  
  // Attachment points (for equipping on character)
  attachBone: varchar("attach_bone", { length: 255 }).default("RightHand"),
  attachOffset: json("attach_offset").notNull().default(sql`(CAST('{"x":0,"y":0,"z":0}' AS JSON))`),
  attachRotation: json("attach_rotation").notNull().default(sql`(CAST('{"x":0,"y":0,"z":0}' AS JSON))`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scene prefabs (environments, maps)
export const warlordScenePrefabs = mysqlTable("warlord_scene_prefabs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sceneType: varchar("scene_type", { length: 255 }).notNull(), // outdoor, dungeon, town, arena, etc.
  scope: varchar("scope", { length: 255 }).notNull().default("user"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Terrain configuration
  terrainConfig: json("terrain_config").notNull().default(sql`(CAST('{
    "size": "medium",
    "biome": "grassland",
    "terrainType": "flat"
  }' AS JSON))`),
  
  // Lighting configuration
  lightingConfig: json("lighting_config").notNull().default(sql`(CAST('{
    "ambientColor": [0.3, 0.3, 0.3],
    "sunColor": [1, 1, 1],
    "sunIntensity": 1.5
  }' AS JSON))`),
  
  // Environment settings
  environmentConfig: json("environment_config").notNull().default(sql`(CAST('{
    "fogEnabled": true,
    "skyboxType": "procedural",
    "timeOfDay": 12
  }' AS JSON))`),
  
  // Placed objects (buildings, props, vegetation)
  placedObjects: json("placed_objects").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Spawn points
  spawnPoints: json("spawn_points").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Placed entities (NPCs, monsters)
  placedEntities: json("placed_entities").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Navigation mesh data
  navMeshData: json("nav_mesh_data"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shop prefabs (for vendor NPCs or world shops)
export const warlordShopPrefabs = mysqlTable("warlord_shop_prefabs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shopType: varchar("shop_type", { length: 255 }).notNull(), // weapons, armor, general, magic, etc.
  scope: varchar("scope", { length: 255 }).notNull().default("user"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Inventory (items for sale)
  inventory: json("inventory").notNull().default(sql`(CAST('[]' AS JSON))`),
  
  // Buy/sell rates
  buyRate: int("buy_rate").notNull().default(100), // percentage of base price
  sellRate: int("sell_rate").notNull().default(50), // percentage of base price
  
  // Currency accepted
  acceptedCurrencies: json("accepted_currencies").notNull().default(sql`(CAST('["gold"]' AS JSON))`),
  
  // Requirements to access
  levelRequired: int("level_required").notNull().default(1),
  reputationRequired: json("reputation_required"),
  
  // Restocking
  restockInterval: int("restock_interval").default(3600), // seconds
  restockOnPurchase: boolean("restock_on_purchase").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for Warlords prefabs
export const insertWarlordStatBlockSchema = createInsertSchema(warlordStatBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertWarlordEnergiesSchema = createInsertSchema(warlordEnergies).omit({
  id: true,
  createdAt: true,
});

export const insertWarlordSkillSchema = createInsertSchema(warlordSkills).omit({
  id: true,
  createdAt: true,
});

export const insertWarlordCraftingProfileSchema = createInsertSchema(warlordCraftingProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertWarlordAnimationSetSchema = createInsertSchema(warlordAnimationSets).omit({
  id: true,
  createdAt: true,
});

export const insertWarlordEntityPrefabSchema = createInsertSchema(warlordEntityPrefabs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarlordWeaponPrefabSchema = createInsertSchema(warlordWeaponPrefabs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarlordScenePrefabSchema = createInsertSchema(warlordScenePrefabs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarlordShopPrefabSchema = createInsertSchema(warlordShopPrefabs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Warlords prefab types
export type InsertWarlordStatBlock = z.infer<typeof insertWarlordStatBlockSchema>;
export type WarlordStatBlock = typeof warlordStatBlocks.$inferSelect;

export type InsertWarlordEnergies = z.infer<typeof insertWarlordEnergiesSchema>;
export type WarlordEnergies = typeof warlordEnergies.$inferSelect;

export type InsertWarlordSkill = z.infer<typeof insertWarlordSkillSchema>;
export type WarlordSkill = typeof warlordSkills.$inferSelect;

export type InsertWarlordCraftingProfile = z.infer<typeof insertWarlordCraftingProfileSchema>;
export type WarlordCraftingProfile = typeof warlordCraftingProfiles.$inferSelect;

export type InsertWarlordAnimationSet = z.infer<typeof insertWarlordAnimationSetSchema>;
export type WarlordAnimationSet = typeof warlordAnimationSets.$inferSelect;

export type InsertWarlordEntityPrefab = z.infer<typeof insertWarlordEntityPrefabSchema>;
export type WarlordEntityPrefab = typeof warlordEntityPrefabs.$inferSelect;

export type InsertWarlordWeaponPrefab = z.infer<typeof insertWarlordWeaponPrefabSchema>;
export type WarlordWeaponPrefab = typeof warlordWeaponPrefabs.$inferSelect;

export type InsertWarlordScenePrefab = z.infer<typeof insertWarlordScenePrefabSchema>;
export type WarlordScenePrefab = typeof warlordScenePrefabs.$inferSelect;

export type InsertWarlordShopPrefab = z.infer<typeof insertWarlordShopPrefabSchema>;
export type WarlordShopPrefab = typeof warlordShopPrefabs.$inferSelect;

// ============= Skill Trees =============

// Skill tree definitions for RPG-style progression systems
export const skillTrees = mysqlTable("skill_trees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull().default("general"),
  treeData: json("tree_data").notNull().default(sql`(CAST('[]' AS JSON))`),
  savedState: json("saved_state"),
  isPublic: boolean("is_public").notNull().default(false),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSkillTreeSchema = createInsertSchema(skillTrees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSkillTree = z.infer<typeof insertSkillTreeSchema>;
export type SkillTree = typeof skillTrees.$inferSelect;

// ============= MMO World System =============

// MMO World definitions - persistent game worlds
export const mmoWorlds = mysqlTable("mmo_worlds", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mapWidth: int("map_width").notNull().default(100),
  mapHeight: int("map_height").notNull().default(100),
  maxPlayers: int("max_players").notNull().default(100),
  spawnX: int("spawn_x").notNull().default(50),
  spawnY: int("spawn_y").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  settings: json("settings").default(sql`(CAST('{}' AS JSON))`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MMO Characters - player avatars in the MMO world
export const mmoCharacters = mysqlTable("mmo_characters", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  worldId: varchar("world_id", { length: 255 }).references(() => mmoWorlds.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  characterClass: varchar("character_class", { length: 255 }).notNull().default("warrior"),
  level: int("level").notNull().default(1),
  xp: int("xp").notNull().default(0),
  health: int("health").notNull().default(100),
  maxHealth: int("max_health").notNull().default(100),
  mana: int("mana").notNull().default(50),
  maxMana: int("max_mana").notNull().default(50),
  posX: int("pos_x").notNull().default(50),
  posY: int("pos_y").notNull().default(50),
  gold: int("gold").notNull().default(100),
  stats: json("stats").default(sql`(CAST('{"strength":10,"dexterity":10,"intelligence":10,"vitality":10}' AS JSON))`),
  inventory: json("inventory").default(sql`(CAST('[]' AS JSON))`),
  equipment: json("equipment").default(sql`(CAST('{}' AS JSON))`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastOnline: timestamp("last_online").defaultNow().notNull(),
});

// MMO NPCs - non-player characters in the world
export const mmoNpcs = mysqlTable("mmo_npcs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  worldId: varchar("world_id", { length: 255 }).references(() => mmoWorlds.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  npcType: varchar("npc_type", { length: 255 }).notNull().default("monster"), // monster, merchant, quest_giver
  level: int("level").notNull().default(1),
  health: int("health").notNull().default(100),
  maxHealth: int("max_health").notNull().default(100),
  posX: int("pos_x").notNull().default(0),
  posY: int("pos_y").notNull().default(0),
  spawnX: int("spawn_x").notNull().default(0),
  spawnY: int("spawn_y").notNull().default(0),
  isHostile: boolean("is_hostile").notNull().default(true),
  respawnTime: int("respawn_time").notNull().default(30),
  lootTable: json("loot_table").default(sql`(CAST('[]' AS JSON))`),
  stats: json("stats").default(sql`(CAST('{"attack":5,"defense":5}' AS JSON))`),
  dialogues: json("dialogues").default(sql`(CAST('[]' AS JSON))`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MMO Chat messages
export const mmoChatMessages = mysqlTable("mmo_chat_messages", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  worldId: varchar("world_id", { length: 255 }).references(() => mmoWorlds.id).notNull(),
  characterId: varchar("character_id", { length: 255 }).references(() => mmoCharacters.id).notNull(),
  channel: varchar("channel", { length: 255 }).notNull().default("global"), // global, local, party, guild
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MMO insert schemas
export const insertMmoWorldSchema = createInsertSchema(mmoWorlds).omit({
  id: true,
  createdAt: true,
});

export const insertMmoCharacterSchema = createInsertSchema(mmoCharacters).omit({
  id: true,
  createdAt: true,
  lastOnline: true,
});

export const insertMmoNpcSchema = createInsertSchema(mmoNpcs).omit({
  id: true,
  createdAt: true,
});

export const insertMmoChatMessageSchema = createInsertSchema(mmoChatMessages).omit({
  id: true,
  createdAt: true,
});

// MMO types
export type InsertMmoWorld = z.infer<typeof insertMmoWorldSchema>;
export type MmoWorld = typeof mmoWorlds.$inferSelect;

export type InsertMmoCharacter = z.infer<typeof insertMmoCharacterSchema>;
export type MmoCharacter = typeof mmoCharacters.$inferSelect;

export type InsertMmoNpc = z.infer<typeof insertMmoNpcSchema>;
export type MmoNpc = typeof mmoNpcs.$inferSelect;

export type InsertMmoChatMessage = z.infer<typeof insertMmoChatMessageSchema>;
export type MmoChatMessage = typeof mmoChatMessages.$inferSelect;

// ============================================
// ALE_HERMES - User Object Storage System
// ============================================

// User objects metadata table
export const userObjects = mysqlTable("user_objects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  objectKey: varchar("object_key", { length: 255 }).notNull(), // full path in bucket
  namespace: varchar("namespace", { length: 255 }).notNull().default("assets"), // projects, assets, backups, runtime, app-storage
  filename: varchar("filename", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 255 }),
  fileSize: int("file_size").notNull().default(0),
  checksum: varchar("checksum", { length: 255 }),
  tags: json("tags").default(sql`(CAST('[]' AS JSON))`),
  metadata: json("metadata").default(sql`(CAST('{}' AS JSON))`),
  isPublic: boolean("is_public").notNull().default(false),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_objects_user").on(table.userId),
  index("idx_user_objects_namespace").on(table.namespace),
  index("idx_user_objects_key").on(table.objectKey),
]);

// Storage audit logs for tracking operations
export const storageAuditLogs = mysqlTable("storage_audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  operation: varchar("operation", { length: 255 }).notNull(), // upload, download, delete, copy, list
  objectKey: varchar("object_key", { length: 255 }),
  targetKey: varchar("target_key", { length: 255 }), // for copy operations
  fileSize: int("file_size"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 255 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_user").on(table.userId),
  index("idx_audit_operation").on(table.operation),
  index("idx_audit_created").on(table.createdAt),
]);

// User storage quotas
export const userStorageQuotas = mysqlTable("user_storage_quotas", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull().unique(),
  maxStorageBytes: int("max_storage_bytes").notNull().default(1073741824), // 1GB default
  usedStorageBytes: int("used_storage_bytes").notNull().default(0),
  objectCount: int("object_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for ALE_HERMES
export const insertUserObjectSchema = createInsertSchema(userObjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true,
});

export const insertStorageAuditLogSchema = createInsertSchema(storageAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUserStorageQuotaSchema = createInsertSchema(userStorageQuotas).omit({
  id: true,
  updatedAt: true,
});

// ALE_HERMES types
export type InsertUserObject = z.infer<typeof insertUserObjectSchema>;
export type UserObject = typeof userObjects.$inferSelect;

export type InsertStorageAuditLog = z.infer<typeof insertStorageAuditLogSchema>;
export type StorageAuditLog = typeof storageAuditLogs.$inferSelect;

export type InsertUserStorageQuota = z.infer<typeof insertUserStorageQuotaSchema>;
export type UserStorageQuota = typeof userStorageQuotas.$inferSelect;
