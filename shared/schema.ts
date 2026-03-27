import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
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

// Session storage table for Grudge ID Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Grudge ID Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: text("username").notNull(),
  password: text("password").notNull().default(""),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Player profile with game stats
export const playerProfiles = pgTable("player_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  displayName: varchar("display_name").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game characters/heroes
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // warrior, mage, archer, etc.
  rarity: varchar("rarity").notNull().default("common"), // common, rare, epic, legendary
  baseStats: jsonb("base_stats").notNull(), // { health, attack, defense, speed }
  abilities: jsonb("abilities").notNull(), // array of ability objects
  modelAssetUrl: varchar("model_asset_url"),
  portraitUrl: varchar("portrait_url"),
  unlockLevel: integer("unlock_level").notNull().default(1),
  unlockCost: jsonb("unlock_cost"), // { gold: 0, gems: 0 }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player owned characters
export const playerCharacters = pgTable("player_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => playerProfiles.id).notNull(),
  characterId: varchar("character_id").references(() => characters.id).notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  equipment: jsonb("equipment"), // equipped items
  customization: jsonb("customization"), // skins, colors, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Currency types
export const currencies = pgTable("currencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // GOLD, GEMS, TOKENS
  name: varchar("name").notNull(),
  iconUrl: varchar("icon_url"),
  isPremium: boolean("is_premium").notNull().default(false),
});

// Player wallets
export const playerWallets = pgTable("player_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => playerProfiles.id).notNull(),
  currencyId: varchar("currency_id").references(() => currencies.id).notNull(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").references(() => playerWallets.id).notNull(),
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  reason: varchar("reason").notNull(), // purchase, reward, refund, etc.
  referenceId: varchar("reference_id"), // related item/match id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Store items
export const storeItems = pgTable("store_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // character, skin, boost, currency
  itemType: varchar("item_type").notNull(),
  itemId: varchar("item_id"), // reference to character, skin, etc.
  price: jsonb("price").notNull(), // { gold: 100, gems: 0 }
  iconUrl: varchar("icon_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  iconUrl: varchar("icon_url"),
  category: varchar("category").notNull(), // combat, collection, progression
  requirement: jsonb("requirement").notNull(), // { type: "wins", count: 10 }
  reward: jsonb("reward").notNull(), // { gold: 100, xp: 50 }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player achievements
export const playerAchievements = pgTable("player_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => playerProfiles.id).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id).notNull(),
  progress: integer("progress").notNull().default(0),
  completedAt: timestamp("completed_at"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game lobbies
export const gameLobbies = pgTable("game_lobbies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  hostId: varchar("host_id").references(() => playerProfiles.id).notNull(),
  gameMode: varchar("game_mode").notNull().default("pvp"), // pvp, coop, campaign
  maxPlayers: integer("max_players").notNull().default(4),
  isPrivate: boolean("is_private").notNull().default(false),
  password: varchar("password"),
  status: varchar("status").notNull().default("waiting"), // waiting, starting, in_game, finished
  settings: jsonb("settings").notNull(), // game-specific settings
  rtsProjectId: varchar("rts_project_id").references(() => rtsProjects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lobby players
export const lobbyPlayers = pgTable("lobby_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lobbyId: varchar("lobby_id").references(() => gameLobbies.id).notNull(),
  playerId: varchar("player_id").references(() => playerProfiles.id).notNull(),
  characterId: varchar("character_id").references(() => characters.id),
  team: integer("team").notNull().default(1),
  isReady: boolean("is_ready").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Game sessions (active matches)
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lobbyId: varchar("lobby_id").references(() => gameLobbies.id).notNull(),
  status: varchar("status").notNull().default("active"), // active, paused, finished
  gameState: jsonb("game_state").notNull(), // current game state
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  winnerId: varchar("winner_id").references(() => playerProfiles.id),
  results: jsonb("results"), // match results and stats
});

// AI behavior profiles
export const aiBehaviors = pgTable("ai_behaviors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  difficulty: varchar("difficulty").notNull(), // easy, medium, hard, expert
  description: text("description"),
  aggressiveness: integer("aggressiveness").notNull().default(50), // 0-100
  defensiveness: integer("defensiveness").notNull().default(50), // 0-100
  economyFocus: integer("economy_focus").notNull().default(50), // 0-100
  expansionRate: integer("expansion_rate").notNull().default(50), // 0-100
  unitPreferences: jsonb("unit_preferences"), // preferred unit types
  buildOrder: jsonb("build_order"), // scripted build sequence
  decisionTree: jsonb("decision_tree"), // AI decision logic
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User settings
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  audioSettings: jsonb("audio_settings"), // { masterVolume, musicVolume, sfxVolume }
  graphicsSettings: jsonb("graphics_settings"), // { quality, shadows, particles }
  gameplaySettings: jsonb("gameplay_settings"), // { cameraSpeed, keybindings }
  notificationSettings: jsonb("notification_settings"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Level requirements
export const levelRequirements = pgTable("level_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: integer("level").notNull().unique(),
  xpRequired: integer("xp_required").notNull(),
  rewards: jsonb("rewards").notNull(), // { gold, gems, unlocks }
});

// Existing tables
export const gameProjects = pgTable("game_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  gameType: text("game_type").notNull(),
  specifications: jsonb("specifications").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => gameProjects.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => chatConversations.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gdevelopAssets = pgTable("gdevelop_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  fileSize: integer("file_size"),
  tags: text("tags").array().notNull(),
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

export const rtsProjects = pgTable("rts_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  gameMode: text("game_mode").notNull().default("pvp"),
  mapData: jsonb("map_data").notNull(),
  gameSettings: jsonb("game_settings").notNull(),
  campaignData: jsonb("campaign_data"),
  gdevelopTools: jsonb("gdevelop_tools").notNull().default(sql`'{"behaviors":[],"extensions":[],"templates":[]}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rtsAssets = pgTable("rts_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  fileUrl: text("file_url").notNull(),
  previewUrl: text("preview_url"),
  metadata: jsonb("metadata").notNull(),
  tags: text("tags").array().notNull(),
  source: text("source").notNull().default("user_upload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rtsUnitTemplates = pgTable("rts_unit_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id).notNull(),
  name: text("name").notNull(),
  modelAssetId: varchar("model_asset_id").references(() => rtsAssets.id),
  stats: jsonb("stats").notNull(),
  cost: jsonb("cost").notNull(),
  abilities: jsonb("abilities").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rtsBuildingTemplates = pgTable("rts_building_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id).notNull(),
  name: text("name").notNull(),
  modelAssetId: varchar("model_asset_id").references(() => rtsAssets.id),
  stats: jsonb("stats").notNull(),
  cost: jsonb("cost").notNull(),
  produces: jsonb("produces"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============= OpenRTS Engine Tables =============

// OpenRTS Movers - pathfinding and movement modes
export const openrtsMover = pgTable("openrts_movers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  pathfindingMode: text("pathfinding_mode").notNull().default("Walk"), // Walk, Fly
  heightmap: text("heightmap").notNull().default("Ground"), // Ground, Sky, Air
  standingMode: text("standing_mode").notNull().default("Stand"), // Stand, Prone
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Weapons - combat systems
export const openrtsWeapons = pgTable("openrts_weapons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name").notNull(),
  effectLink: text("effect_link"), // references effect
  range: text("range").notNull().default("5"), // attack range
  scanRange: text("scan_range").notNull().default("7"), // detection range
  period: text("period").notNull().default("4"), // attack cooldown
  damage: integer("damage").notNull().default(10),
  damageType: text("damage_type").notNull().default("physical"), // physical, magic, fire, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Effects - visual/damage effects
export const openrtsEffects = pgTable("openrts_effects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name"),
  effectType: text("effect_type").notNull().default("damage"), // damage, heal, buff, debuff, projectile
  damage: integer("damage").default(0),
  radius: text("radius"), // for AOE effects
  duration: text("duration"), // for buffs/debuffs
  projectileLink: text("projectile_link"), // for projectile-based effects
  particleEffect: text("particle_effect"), // visual effect name
  soundEffect: text("sound_effect"), // audio effect name
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Projectiles - flying objects
export const openrtsProjectiles = pgTable("openrts_projectiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  speed: text("speed").notNull().default("10"),
  modelPath: text("model_path"),
  trailEffect: text("trail_effect"),
  impactEffect: text("impact_effect"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Actors - visual representation
export const openrtsActors = pgTable("openrts_actors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  modelPath: text("model_path").notNull(),
  scale: text("scale").default("1"),
  animations: jsonb("animations").default(sql`'{}'::jsonb`), // { idle, walk, attack, death }
  sounds: jsonb("sounds").default(sql`'{}'::jsonb`), // { select, move, attack, death }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Units - complete unit definitions
export const openrtsUnits = pgTable("openrts_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  uiName: text("ui_name").notNull(),
  race: text("race").notNull().default("human"), // human, alien, undead, etc.
  radius: text("radius").notNull().default("0.25"), // collision radius
  separationRadius: text("separation_radius").notNull().default("0.25"),
  speed: text("speed").notNull().default("2.5"),
  mass: text("mass").notNull().default("1.0"),
  maxHealth: integer("max_health").notNull().default(100),
  sight: text("sight").notNull().default("7"), // vision range
  moverLink: text("mover_link"), // references mover
  weaponLinks: text("weapon_links").array(), // references weapons
  actorLink: text("actor_link"), // references actor
  modelPath: text("model_path"), // direct model path
  cost: jsonb("cost").default(sql`'{"gold":100}'::jsonb`),
  buildTime: integer("build_time").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Map Styles
export const openrtsMapStyles = pgTable("openrts_map_styles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  groundTexture: text("ground_texture"),
  cliffTexture: text("cliff_texture"),
  waterTexture: text("water_texture"),
  ambientColor: text("ambient_color"),
  sunColor: text("sun_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OpenRTS Trinkets (map decorations)
export const openrtsTrinkets = pgTable("openrts_trinkets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => rtsProjects.id),
  name: text("name").notNull(),
  modelPath: text("model_path").notNull(),
  isBlocking: boolean("is_blocking").default(false),
  isDestructible: boolean("is_destructible").default(false),
  scale: text("scale").default("1"),
  category: text("category").notNull().default("decoration"), // decoration, tree, rock, building
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Viewport Assets - centralized 3D/2D asset storage with rendering config
export const viewportAssets = pgTable("viewport_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sourceType: text("source_type").notNull().default("internal"), // internal, gdevelop, rts, external
  assetType: text("asset_type").notNull(), // gltf, fbx, sprite, texture, animation
  category: text("category").notNull(), // race/unit/building/weapon/ui/environment
  subcategory: text("subcategory"), // orcs/elves/humans/skeletons/etc
  filePath: text("file_path").notNull(), // relative path under attached_assets
  previewImageUrl: text("preview_image_url"), // generated thumbnail
  texturePaths: text("texture_paths").array(), // associated texture files
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`), // scale, pivot, animations, LOD
  viewportConfig: jsonb("viewport_config").notNull().default(sql`'{}'::jsonb`), // camera, lighting config
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  isAnimated: boolean("is_animated").notNull().default(false),
  fileSize: integer("file_size"), // bytes
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


// Custom RTS Project insert schema (avoiding drizzle-zod issues with complex jsonb)
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
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  gold: integer("gold").default(0),
  gbuxBalance: integer("gbux_balance").default(0),
  // Game counts
  totalCharacters: integer("total_characters").default(0),
  totalIslands: integer("total_islands").default(0),
  homeIslandId: varchar("home_island_id", { length: 255 }),
  hasCompletedTutorial: boolean("has_completed_tutorial").default(false),
  // Timestamps
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLoginAt: timestamp("last_login_at"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
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
export const grudgeCharacters = pgTable("grudge_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => accounts.id).notNull(),
  grudgeId: varchar("grudge_id", { length: 64 }),
  name: text("name").notNull(),
  classId: text("class_id"), // warrior, mage, ranger, shapeshifter
  raceId: text("race_id"), // human, orc, elf, dwarf, barbarian, undead
  profession: text("profession"),
  faction: text("faction"),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  gold: integer("gold").notNull().default(1000),
  skillPoints: integer("skill_points").notNull().default(5),
  attributePoints: integer("attribute_points").notNull().default(0),
  // WCS 8-stat attributes
  attributes: jsonb("attributes").default(sql`'{"Strength":0,"Vitality":0,"Endurance":0,"Intellect":0,"Wisdom":0,"Dexterity":0,"Agility":0,"Tactics":0}'::jsonb`),
  // 10-slot equipment
  equipment: jsonb("equipment").default(sql`'{"head":null,"chest":null,"legs":null,"feet":null,"hands":null,"shoulders":null,"mainHand":null,"offHand":null,"accessory1":null,"accessory2":null}'::jsonb`),
  // 5 profession progressions
  professionProgression: jsonb("profession_progression").default(sql`'{"Miner":{"level":1,"xp":0,"pointsSpent":0},"Forester":{"level":1,"xp":0,"pointsSpent":0},"Mystic":{"level":1,"xp":0,"pointsSpent":0},"Chef":{"level":1,"xp":0,"pointsSpent":0},"Engineer":{"level":1,"xp":0,"pointsSpent":0}}'::jsonb`),
  // Inventory
  inventory: jsonb("inventory").default(sql`'[]'::jsonb`),
  // Combat
  abilities: jsonb("abilities").default(sql`'[]'::jsonb`),
  skillTree: jsonb("skill_tree").default(sql`'{}'::jsonb`),
  currentHealth: integer("current_health"),
  currentMana: integer("current_mana"),
  currentStamina: integer("current_stamina"),
  avatarUrl: text("avatar_url"),
  // NFT fields
  isNft: boolean("is_nft").default(false),
  nftMintAddress: varchar("nft_mint_address", { length: 255 }),
  nftCollection: varchar("nft_collection", { length: 255 }),
  nftMintedAt: timestamp("nft_minted_at"),
  // State
  isActive: boolean("is_active").default(true),
  slotIndex: integer("slot_index").default(0),
  isGuest: boolean("is_guest").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => [
  index("grudge_chars_account_id_idx").on(table.accountId),
  index("grudge_chars_grudge_id_idx").on(table.grudgeId),
]);

export const insertGrudgeCharacterSchema = createInsertSchema(grudgeCharacters).omit({ id: true, createdAt: true });
export type InsertGrudgeCharacter = z.infer<typeof insertGrudgeCharacterSchema>;
export type GrudgeCharacter = typeof grudgeCharacters.$inferSelect;

// Saved custom characters from character creator (MMO-style)
export const savedCharacters = pgTable("saved_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  presetId: varchar("preset_id").notNull(),
  customization: jsonb("customization").notNull(),
  colors: jsonb("colors"),
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
export const assetMetadata = pgTable("asset_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storagePath: text("storage_path").notNull().unique(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // glb, gltf, fbx, obj, png, jpg, etc.
  fileSize: integer("file_size"),
  
  // Parsed 3D data
  meshes: jsonb("meshes").notNull().default(sql`'[]'::jsonb`), // [{name, vertexCount, faceCount}]
  materials: jsonb("materials").notNull().default(sql`'[]'::jsonb`), // [{name, type, color, textures}]
  animations: jsonb("animations").notNull().default(sql`'[]'::jsonb`), // [{name, duration, keyframes}]
  textures: jsonb("textures").notNull().default(sql`'[]'::jsonb`), // [{name, size, format}]
  
  // Bounding box and scene info
  boundingBox: jsonb("bounding_box"), // {min: {x,y,z}, max: {x,y,z}, center, size}
  sceneInfo: jsonb("scene_info"), // {nodeCount, totalVertices, totalFaces}
  
  // Thumbnail
  thumbnailUrl: text("thumbnail_url"),
  
  // Organization (enforced categories)
  folder: text("folder").notNull().default("/"),
  category: text("category").notNull().default("misc"), // models, textures, audio, animations, maps
  subcategory: text("subcategory"), // characters, buildings, terrain, ui, etc.
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  
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

export const unifiedAssets = pgTable("unified_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  fileSize: integer("file_size"),
  contentType: text("content_type"),
  contentHash: text("content_hash"), // SHA256 for deduplication
  
  // Metadata
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  description: text("description"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`), // flexible additional data (meshes, animations, etc.)
  
  // Source tracking
  source: text("source").notNull().default("user-upload"), // user-upload, kenney, kaykit, opengameart, ai-generated
  sourceUrl: text("source_url"),
  license: text("license").notNull().default("unknown"), // cc0, cc-by, cc-by-sa, cc-by-nc, personal, commercial
  
  // Ownership & scoping
  userId: varchar("user_id").references(() => users.id),
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
export const warlordStatBlocks = pgTable("warlord_stat_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Base stats
  strength: integer("strength").notNull().default(10),
  agility: integer("agility").notNull().default(10),
  intelligence: integer("intelligence").notNull().default(10),
  constitution: integer("constitution").notNull().default(10),
  wisdom: integer("wisdom").notNull().default(10),
  charisma: integer("charisma").notNull().default(10),
  
  // Combat stats
  attackPower: integer("attack_power").notNull().default(10),
  defense: integer("defense").notNull().default(5),
  critChance: integer("crit_chance").notNull().default(5), // percentage
  critDamage: integer("crit_damage").notNull().default(150), // percentage
  attackSpeed: integer("attack_speed").notNull().default(100), // percentage
  moveSpeed: integer("move_speed").notNull().default(100), // percentage
  
  // Resistances (percentage)
  physicalResist: integer("physical_resist").notNull().default(0),
  magicResist: integer("magic_resist").notNull().default(0),
  fireResist: integer("fire_resist").notNull().default(0),
  iceResist: integer("ice_resist").notNull().default(0),
  
  // Growth curves (JSON for level-based scaling)
  growthCurves: jsonb("growth_curves").notNull().default(sql`'{}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Energy pools (health, mana, stamina, etc.)
export const warlordEnergies = pgTable("warlord_energies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Energy definitions
  maxHealth: integer("max_health").notNull().default(100),
  healthRegen: integer("health_regen").notNull().default(1), // per second
  maxMana: integer("max_mana").notNull().default(50),
  manaRegen: integer("mana_regen").notNull().default(1),
  maxStamina: integer("max_stamina").notNull().default(100),
  staminaRegen: integer("stamina_regen").notNull().default(5),
  
  // Optional custom energies (rage, focus, etc.)
  customEnergies: jsonb("custom_energies").notNull().default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Skills and spells templates
export const warlordSkills = pgTable("warlord_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  skillType: varchar("skill_type").notNull().default("active"), // active, passive, toggle, aura
  
  // Cost and cooldown
  manaCost: integer("mana_cost").notNull().default(0),
  staminaCost: integer("stamina_cost").notNull().default(0),
  healthCost: integer("health_cost").notNull().default(0),
  cooldown: integer("cooldown").notNull().default(0), // milliseconds
  castTime: integer("cast_time").notNull().default(0), // milliseconds
  
  // Effects and damage
  damageType: varchar("damage_type").default("physical"), // physical, magic, fire, ice, etc.
  baseDamage: integer("base_damage").notNull().default(0),
  damageScaling: jsonb("damage_scaling").notNull().default(sql`'{}'::jsonb`), // stat scaling
  effects: jsonb("effects").notNull().default(sql`'[]'::jsonb`), // buffs, debuffs, etc.
  
  // Visual/animation
  animationName: varchar("animation_name"),
  animationSpeed: integer("animation_speed").notNull().default(100), // percentage
  vfxId: varchar("vfx_id"),
  iconUrl: varchar("icon_url"),
  
  // Requirements
  levelRequired: integer("level_required").notNull().default(1),
  prerequisites: jsonb("prerequisites").notNull().default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Harvesting and crafting profiles
export const warlordCraftingProfiles = pgTable("warlord_crafting_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  
  // Gathering skills
  miningLevel: integer("mining_level").notNull().default(0),
  harvestingLevel: integer("harvesting_level").notNull().default(0),
  loggingLevel: integer("logging_level").notNull().default(0),
  fishingLevel: integer("fishing_level").notNull().default(0),
  
  // Crafting skills
  smithingLevel: integer("smithing_level").notNull().default(0),
  tailoringLevel: integer("tailoring_level").notNull().default(0),
  alchemyLevel: integer("alchemy_level").notNull().default(0),
  enchantingLevel: integer("enchanting_level").notNull().default(0),
  cookingLevel: integer("cooking_level").notNull().default(0),
  
  // Known recipes (array of recipe IDs)
  knownRecipes: jsonb("known_recipes").notNull().default(sql`'[]'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Animation sets for entities
export const warlordAnimationSets = pgTable("warlord_animation_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  
  // Animation mappings (key: animation name, value: config)
  idle: jsonb("idle").notNull().default(sql`'{"name":"idle","speed":1,"loop":true}'::jsonb`),
  walk: jsonb("walk").notNull().default(sql`'{"name":"walk","speed":1,"loop":true}'::jsonb`),
  run: jsonb("run").notNull().default(sql`'{"name":"run","speed":1,"loop":true}'::jsonb`),
  attack: jsonb("attack").notNull().default(sql`'{"name":"attack","speed":1,"loop":false}'::jsonb`),
  death: jsonb("death").notNull().default(sql`'{"name":"death","speed":1,"loop":false}'::jsonb`),
  
  // Additional custom animations
  customAnimations: jsonb("custom_animations").notNull().default(sql`'{}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entity prefabs (player, NPC, monster, ally)
export const warlordEntityPrefabs = pgTable("warlord_entity_prefabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  name: varchar("name").notNull(),
  description: text("description"),
  entityType: varchar("entity_type").notNull(), // player, npc, monster, ally
  scope: varchar("scope").notNull().default("user"), // public, team, user
  
  // 3D asset references
  modelAssetId: varchar("model_asset_id").references(() => viewportAssets.id),
  modelUrl: text("model_url"), // direct URL fallback
  thumbnailUrl: text("thumbnail_url"),
  
  // Stats and abilities
  statBlockId: varchar("stat_block_id").references(() => warlordStatBlocks.id),
  energiesId: varchar("energies_id").references(() => warlordEnergies.id),
  animationSetId: varchar("animation_set_id").references(() => warlordAnimationSets.id),
  craftingProfileId: varchar("crafting_profile_id").references(() => warlordCraftingProfiles.id),
  
  // Skills (array of skill IDs)
  skillIds: jsonb("skill_ids").notNull().default(sql`'[]'::jsonb`),
  
  // AI behavior (for NPCs/monsters)
  aiBehaviorId: varchar("ai_behavior_id").references(() => aiBehaviors.id),
  
  // Physical properties
  scale: jsonb("scale").notNull().default(sql`'{"x":1,"y":1,"z":1}'::jsonb`),
  colliderType: varchar("collider_type").notNull().default("capsule"), // capsule, box, sphere
  colliderSize: jsonb("collider_size").notNull().default(sql`'{"radius":0.5,"height":2}'::jsonb`),
  
  // Loot table (for monsters)
  lootTable: jsonb("loot_table").notNull().default(sql`'[]'::jsonb`),
  
  // Dialogue (for NPCs)
  dialogueTree: jsonb("dialogue_tree"),
  
  // Shop inventory (for vendor NPCs)
  shopInventory: jsonb("shop_inventory"),
  
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  isTemplate: boolean("is_template").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Weapon prefabs
export const warlordWeaponPrefabs = pgTable("warlord_weapon_prefabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  name: varchar("name").notNull(),
  description: text("description"),
  weaponType: varchar("weapon_type").notNull(), // sword, axe, bow, staff, etc.
  scope: varchar("scope").notNull().default("user"),
  
  // 3D asset
  modelAssetId: varchar("model_asset_id").references(() => viewportAssets.id),
  modelUrl: text("model_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Stats
  baseDamage: integer("base_damage").notNull().default(10),
  attackSpeed: integer("attack_speed").notNull().default(100), // percentage
  critChance: integer("crit_chance").notNull().default(5),
  range: integer("range").notNull().default(2), // attack range in units
  
  // Bonuses
  statBonuses: jsonb("stat_bonuses").notNull().default(sql`'{}'::jsonb`),
  
  // Special abilities attached to weapon
  skillIds: jsonb("skill_ids").notNull().default(sql`'[]'::jsonb`),
  
  // Requirements
  levelRequired: integer("level_required").notNull().default(1),
  classRestrictions: jsonb("class_restrictions").notNull().default(sql`'[]'::jsonb`),
  
  // Rarity and value
  rarity: varchar("rarity").notNull().default("common"),
  sellPrice: integer("sell_price").notNull().default(10),
  
  // Attachment points (for equipping on character)
  attachBone: varchar("attach_bone").default("RightHand"),
  attachOffset: jsonb("attach_offset").notNull().default(sql`'{"x":0,"y":0,"z":0}'::jsonb`),
  attachRotation: jsonb("attach_rotation").notNull().default(sql`'{"x":0,"y":0,"z":0}'::jsonb`),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scene prefabs (environments, maps)
export const warlordScenePrefabs = pgTable("warlord_scene_prefabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  name: varchar("name").notNull(),
  description: text("description"),
  sceneType: varchar("scene_type").notNull(), // outdoor, dungeon, town, arena, etc.
  scope: varchar("scope").notNull().default("user"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Terrain configuration
  terrainConfig: jsonb("terrain_config").notNull().default(sql`'{
    "size": "medium",
    "biome": "grassland",
    "terrainType": "flat"
  }'::jsonb`),
  
  // Lighting configuration
  lightingConfig: jsonb("lighting_config").notNull().default(sql`'{
    "ambientColor": [0.3, 0.3, 0.3],
    "sunColor": [1, 1, 1],
    "sunIntensity": 1.5
  }'::jsonb`),
  
  // Environment settings
  environmentConfig: jsonb("environment_config").notNull().default(sql`'{
    "fogEnabled": true,
    "skyboxType": "procedural",
    "timeOfDay": 12
  }'::jsonb`),
  
  // Placed objects (buildings, props, vegetation)
  placedObjects: jsonb("placed_objects").notNull().default(sql`'[]'::jsonb`),
  
  // Spawn points
  spawnPoints: jsonb("spawn_points").notNull().default(sql`'[]'::jsonb`),
  
  // Placed entities (NPCs, monsters)
  placedEntities: jsonb("placed_entities").notNull().default(sql`'[]'::jsonb`),
  
  // Navigation mesh data
  navMeshData: jsonb("nav_mesh_data"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shop prefabs (for vendor NPCs or world shops)
export const warlordShopPrefabs = pgTable("warlord_shop_prefabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  
  name: varchar("name").notNull(),
  description: text("description"),
  shopType: varchar("shop_type").notNull(), // weapons, armor, general, magic, etc.
  scope: varchar("scope").notNull().default("user"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Inventory (items for sale)
  inventory: jsonb("inventory").notNull().default(sql`'[]'::jsonb`),
  
  // Buy/sell rates
  buyRate: integer("buy_rate").notNull().default(100), // percentage of base price
  sellRate: integer("sell_rate").notNull().default(50), // percentage of base price
  
  // Currency accepted
  acceptedCurrencies: jsonb("accepted_currencies").notNull().default(sql`'["gold"]'::jsonb`),
  
  // Requirements to access
  levelRequired: integer("level_required").notNull().default(1),
  reputationRequired: jsonb("reputation_required"),
  
  // Restocking
  restockInterval: integer("restock_interval").default(3600), // seconds
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
export const skillTrees = pgTable("skill_trees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull().default("general"),
  treeData: jsonb("tree_data").notNull().default(sql`'[]'::jsonb`),
  savedState: jsonb("saved_state"),
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
export const mmoWorlds = pgTable("mmo_worlds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  mapWidth: integer("map_width").notNull().default(100),
  mapHeight: integer("map_height").notNull().default(100),
  maxPlayers: integer("max_players").notNull().default(100),
  spawnX: integer("spawn_x").notNull().default(50),
  spawnY: integer("spawn_y").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MMO Characters - player avatars in the MMO world
export const mmoCharacters = pgTable("mmo_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  worldId: varchar("world_id").references(() => mmoWorlds.id).notNull(),
  name: varchar("name").notNull(),
  characterClass: varchar("character_class").notNull().default("warrior"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  health: integer("health").notNull().default(100),
  maxHealth: integer("max_health").notNull().default(100),
  mana: integer("mana").notNull().default(50),
  maxMana: integer("max_mana").notNull().default(50),
  posX: integer("pos_x").notNull().default(50),
  posY: integer("pos_y").notNull().default(50),
  gold: integer("gold").notNull().default(100),
  stats: jsonb("stats").default(sql`'{"strength":10,"dexterity":10,"intelligence":10,"vitality":10}'::jsonb`),
  inventory: jsonb("inventory").default(sql`'[]'::jsonb`),
  equipment: jsonb("equipment").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastOnline: timestamp("last_online").defaultNow().notNull(),
});

// MMO NPCs - non-player characters in the world
export const mmoNpcs = pgTable("mmo_npcs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  worldId: varchar("world_id").references(() => mmoWorlds.id).notNull(),
  name: varchar("name").notNull(),
  npcType: varchar("npc_type").notNull().default("monster"), // monster, merchant, quest_giver
  level: integer("level").notNull().default(1),
  health: integer("health").notNull().default(100),
  maxHealth: integer("max_health").notNull().default(100),
  posX: integer("pos_x").notNull().default(0),
  posY: integer("pos_y").notNull().default(0),
  spawnX: integer("spawn_x").notNull().default(0),
  spawnY: integer("spawn_y").notNull().default(0),
  isHostile: boolean("is_hostile").notNull().default(true),
  respawnTime: integer("respawn_time").notNull().default(30),
  lootTable: jsonb("loot_table").default(sql`'[]'::jsonb`),
  stats: jsonb("stats").default(sql`'{"attack":5,"defense":5}'::jsonb`),
  dialogues: jsonb("dialogues").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MMO Chat messages
export const mmoChatMessages = pgTable("mmo_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  worldId: varchar("world_id").references(() => mmoWorlds.id).notNull(),
  characterId: varchar("character_id").references(() => mmoCharacters.id).notNull(),
  channel: varchar("channel").notNull().default("global"), // global, local, party, guild
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
export const userObjects = pgTable("user_objects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  objectKey: varchar("object_key").notNull(), // full path in bucket
  namespace: varchar("namespace").notNull().default("assets"), // projects, assets, backups, runtime, app-storage
  filename: varchar("filename").notNull(),
  contentType: varchar("content_type"),
  fileSize: integer("file_size").notNull().default(0),
  checksum: varchar("checksum"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
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
export const storageAuditLogs = pgTable("storage_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  operation: varchar("operation").notNull(), // upload, download, delete, copy, list
  objectKey: varchar("object_key"),
  targetKey: varchar("target_key"), // for copy operations
  fileSize: integer("file_size"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_user").on(table.userId),
  index("idx_audit_operation").on(table.operation),
  index("idx_audit_created").on(table.createdAt),
]);

// User storage quotas
export const userStorageQuotas = pgTable("user_storage_quotas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  maxStorageBytes: integer("max_storage_bytes").notNull().default(1073741824), // 1GB default
  usedStorageBytes: integer("used_storage_bytes").notNull().default(0),
  objectCount: integer("object_count").notNull().default(0),
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

// -----------------------------------------------------------------------------
// GRUDGE DEVICES
// Tracks ESP32-GRD17 hardware nodes and browser firmware instances
// linked to Grudge accounts. Populated by POST /api/devices/register.
// -----------------------------------------------------------------------------

export const grudge_devices = pgTable("grudge_devices", {
  id:              varchar("id", { length: 64 }).primaryKey(),
  grudgeId:        varchar("grudge_id", { length: 64 }).notNull(),
  deviceName:      varchar("device_name", { length: 128 }).notNull(),
  publicKey:       varchar("public_key", { length: 128 }).notNull(),
  firmwareVersion: varchar("firmware_version", { length: 64 }).notNull().default("unknown"),
  hardwareType:    varchar("hardware_type", { length: 64 }).notNull().default("browser"),
  status:          varchar("status", { length: 20 }).notNull().default("online"),
  lastSeen:        text("last_seen"),
  lastHeartbeat:   text("last_heartbeat"),    // JSON blob: blockHeight, uptime, balances, etc.
  createdAt:       text("created_at").notNull(),
}, (t) => ({
  grudgeIdIdx: index("grd_devices_grudge_id_idx").on(t.grudgeId),
  pubkeyIdx:   index("grd_devices_pubkey_idx").on(t.publicKey),
}));

export const insertGrudgeDeviceSchema = createInsertSchema(grudge_devices).omit({
  createdAt: true,
});

export type GrudgeDevice       = typeof grudge_devices.$inferSelect;
export type InsertGrudgeDevice = z.infer<typeof insertGrudgeDeviceSchema>;
