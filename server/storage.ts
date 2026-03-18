import {
  type User,
  type UpsertUser,
  type GameProject,
  type InsertGameProject,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type GDevelopAsset,
  type InsertGdevelopAsset,
  type RtsProject,
  type InsertRtsProject,
  type RtsAsset,
  type InsertRtsAsset,
  type RtsUnitTemplate,
  type InsertRtsUnitTemplate,
  type RtsBuildingTemplate,
  type InsertRtsBuildingTemplate,
  type PlayerProfile,
  type InsertPlayerProfile,
  type Character,
  type InsertCharacter,
  type PlayerCharacter,
  type InsertPlayerCharacter,
  type Currency,
  type InsertCurrency,
  type PlayerWallet,
  type InsertPlayerWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type StoreItem,
  type InsertStoreItem,
  type Achievement,
  type InsertAchievement,
  type PlayerAchievement,
  type InsertPlayerAchievement,
  type GameLobby,
  type InsertGameLobby,
  type LobbyPlayer,
  type InsertLobbyPlayer,
  type GameSession,
  type InsertGameSession,
  type AiBehavior,
  type InsertAiBehavior,
  type UserSettings,
  type InsertUserSettings,
  type LevelRequirement,
  type InsertLevelRequirement,
  type ViewportAsset,
  type InsertViewportAsset,
  type SavedCharacter,
  type InsertSavedCharacter,
  type UnifiedAsset,
  type InsertUnifiedAsset,
  users,
  gameProjects,
  chatConversations,
  chatMessages,
  gdevelopAssets,
  rtsProjects,
  rtsAssets,
  rtsUnitTemplates,
  rtsBuildingTemplates,
  playerProfiles,
  characters,
  playerCharacters,
  currencies,
  playerWallets,
  walletTransactions,
  storeItems,
  achievements,
  playerAchievements,
  gameLobbies,
  lobbyPlayers,
  gameSessions,
  aiBehaviors,
  userSettings,
  levelRequirements,
  viewportAssets,
  savedCharacters,
  unifiedAssets,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { THREEJS_EXAMPLES, ASSET_TYPES } from "./threejsExamples";
import { randomUUID } from "crypto";

// MySQL doesn't support .returning() — insert with app-generated UUID, then select back
async function insertAndGet<T>(table: any, idCol: any, data: any): Promise<T> {
  const id = randomUUID();
  await db.insert(table).values({ ...data, id });
  const [row] = await db.select().from(table).where(eq(idCol, id));
  return row as T;
}

// MySQL update + re-select helper
async function updateAndGet<T>(table: any, idCol: any, id: string, updates: any): Promise<T | undefined> {
  await db.update(table).set(updates).where(eq(idCol, id));
  const [row] = await db.select().from(table).where(eq(idCol, id));
  return (row as T) || undefined;
}

export interface IStorage {
  // User methods (Grudge ID Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Player Profile methods
  getPlayerProfile(userId: string): Promise<PlayerProfile | undefined>;
  createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile>;
  updatePlayerProfile(id: string, updates: Partial<InsertPlayerProfile>): Promise<PlayerProfile | undefined>;

  // Character methods
  getAllCharacters(): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  getPlayerCharacters(playerId: string): Promise<PlayerCharacter[]>;
  addCharacterToPlayer(data: InsertPlayerCharacter): Promise<PlayerCharacter>;

  // Currency & Wallet methods
  getAllCurrencies(): Promise<Currency[]>;
  getPlayerWallets(playerId: string): Promise<PlayerWallet[]>;
  getPlayerWallet(playerId: string, currencyId: string): Promise<PlayerWallet | undefined>;
  updateWalletBalance(walletId: string, amount: number, reason: string): Promise<WalletTransaction>;
  createPlayerWallet(wallet: InsertPlayerWallet): Promise<PlayerWallet>;

  // Store methods
  getAllStoreItems(): Promise<StoreItem[]>;
  getStoreItem(id: string): Promise<StoreItem | undefined>;
  createStoreItem(item: InsertStoreItem): Promise<StoreItem>;

  // Achievement methods
  getAllAchievements(): Promise<Achievement[]>;
  getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]>;
  updatePlayerAchievement(playerId: string, achievementId: string, progress: number): Promise<PlayerAchievement>;

  // Lobby methods
  getAllLobbies(): Promise<GameLobby[]>;
  getLobby(id: string): Promise<GameLobby | undefined>;
  createLobby(lobby: InsertGameLobby): Promise<GameLobby>;
  updateLobby(id: string, updates: Partial<InsertGameLobby>): Promise<GameLobby | undefined>;
  deleteLobby(id: string): Promise<boolean>;
  getLobbyPlayers(lobbyId: string): Promise<LobbyPlayer[]>;
  joinLobby(data: InsertLobbyPlayer): Promise<LobbyPlayer>;
  leaveLobby(lobbyId: string, playerId: string): Promise<boolean>;
  updateLobbyPlayer(lobbyId: string, playerId: string, updates: Partial<InsertLobbyPlayer>): Promise<LobbyPlayer | undefined>;

  // Game Session methods
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<InsertGameSession>): Promise<GameSession | undefined>;

  // AI Behavior methods
  getAllAiBehaviors(): Promise<AiBehavior[]>;
  getAiBehavior(id: string): Promise<AiBehavior | undefined>;
  createAiBehavior(behavior: InsertAiBehavior): Promise<AiBehavior>;

  // User Settings methods
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;

  // Level Requirements methods
  getAllLevelRequirements(): Promise<LevelRequirement[]>;
  getLevelRequirement(level: number): Promise<LevelRequirement | undefined>;

  // Project methods
  getAllProjects(): Promise<GameProject[]>;
  getProject(id: string): Promise<GameProject | undefined>;
  createProject(project: InsertGameProject): Promise<GameProject>;
  updateProject(id: string, updates: Partial<InsertGameProject>): Promise<GameProject | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Chat Conversation methods
  getAllConversations(): Promise<ChatConversation[]>;
  getConversation(id: string): Promise<ChatConversation | undefined>;
  createConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  deleteConversation(id: string): Promise<boolean>;

  // Chat Message methods
  getMessagesByConversation(conversationId: string): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Asset methods
  getAllAssets(): Promise<GDevelopAsset[]>;
  getAssetsByType(type: string): Promise<GDevelopAsset[]>;
  searchAssets(query: string): Promise<GDevelopAsset[]>;
  createAsset(asset: InsertGdevelopAsset): Promise<GDevelopAsset>;
  seedAssets(): Promise<void>;

  // RTS Project methods
  getAllRtsProjects(): Promise<RtsProject[]>;
  getRtsProject(id: string): Promise<RtsProject | undefined>;
  createRtsProject(project: InsertRtsProject): Promise<RtsProject>;
  updateRtsProject(id: string, updates: Partial<InsertRtsProject>): Promise<RtsProject | undefined>;
  deleteRtsProject(id: string): Promise<boolean>;

  // RTS Asset methods
  getAllRtsAssets(): Promise<RtsAsset[]>;
  getRtsAssetsByType(type: string): Promise<RtsAsset[]>;
  createRtsAsset(asset: InsertRtsAsset): Promise<RtsAsset>;
  seedRtsAssets(): Promise<void>;

  // RTS Unit Template methods
  getUnitTemplatesByProject(projectId: string): Promise<RtsUnitTemplate[]>;
  createUnitTemplate(template: InsertRtsUnitTemplate): Promise<RtsUnitTemplate>;
  updateUnitTemplate(id: string, updates: Partial<InsertRtsUnitTemplate>): Promise<RtsUnitTemplate | undefined>;
  deleteUnitTemplate(id: string): Promise<boolean>;

  // RTS Building Template methods
  getBuildingTemplatesByProject(projectId: string): Promise<RtsBuildingTemplate[]>;
  createBuildingTemplate(template: InsertRtsBuildingTemplate): Promise<RtsBuildingTemplate>;
  updateBuildingTemplate(id: string, updates: Partial<InsertRtsBuildingTemplate>): Promise<RtsBuildingTemplate | undefined>;
  deleteBuildingTemplate(id: string): Promise<boolean>;

  // Seed methods
  seedGameData(): Promise<void>;

  // Viewport Asset methods
  getAllViewportAssets(): Promise<ViewportAsset[]>;
  getViewportAsset(id: string): Promise<ViewportAsset | undefined>;
  getViewportAssetBySlug(slug: string): Promise<ViewportAsset | undefined>;
  getViewportAssetsByType(assetType: string): Promise<ViewportAsset[]>;
  getViewportAssetsByCategory(category: string): Promise<ViewportAsset[]>;
  searchViewportAssets(query: string): Promise<ViewportAsset[]>;
  createViewportAsset(asset: InsertViewportAsset): Promise<ViewportAsset>;
  updateViewportAsset(id: string, updates: Partial<InsertViewportAsset>): Promise<ViewportAsset | undefined>;
  deleteViewportAsset(id: string): Promise<boolean>;
  seedViewportAssets(): Promise<void>;

  // Saved Characters (MMO-style character creation)
  getSavedCharacters(userId?: string): Promise<SavedCharacter[]>;
  getSavedCharacter(id: string): Promise<SavedCharacter | undefined>;
  createSavedCharacter(character: InsertSavedCharacter): Promise<SavedCharacter>;
  setActiveCharacter(userId: string, characterId: string): Promise<void>;
  deleteSavedCharacter(id: string): Promise<boolean>;

  // Unified Asset Library methods
  getAllUnifiedAssets(): Promise<UnifiedAsset[]>;
  getUnifiedAsset(id: string): Promise<UnifiedAsset | undefined>;
  getUnifiedAssetByHash(contentHash: string): Promise<UnifiedAsset | undefined>;
  getUnifiedAssetsByType(assetType: string): Promise<UnifiedAsset[]>;
  getUnifiedAssetsByCategory(category: string): Promise<UnifiedAsset[]>;
  getUnifiedAssetsByUser(userId: string): Promise<UnifiedAsset[]>;
  searchUnifiedAssets(query: string): Promise<UnifiedAsset[]>;
  createUnifiedAsset(asset: InsertUnifiedAsset): Promise<UnifiedAsset>;
  updateUnifiedAsset(id: string, updates: Partial<InsertUnifiedAsset>): Promise<UnifiedAsset | undefined>;
  deleteUnifiedAsset(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods (Grudge ID Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await db
      .insert(users)
      .values(userData)
      .onDuplicateKeyUpdate({
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      });
    const [user] = await db.select().from(users).where(eq(users.id, userData.id!));
    return user;
  }

  // Player Profile methods
  async getPlayerProfile(userId: string): Promise<PlayerProfile | undefined> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
    return profile || undefined;
  }

  async createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile> {
    return insertAndGet(playerProfiles, playerProfiles.id, profile);
  }

  async updatePlayerProfile(id: string, updates: Partial<InsertPlayerProfile>): Promise<PlayerProfile | undefined> {
    return updateAndGet(playerProfiles, playerProfiles.id, id, { ...updates, updatedAt: new Date() });
  }

  // Character methods
  async getAllCharacters(): Promise<Character[]> {
    return db.select().from(characters).orderBy(characters.name);
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    return insertAndGet(characters, characters.id, character);
  }

  async getPlayerCharacters(playerId: string): Promise<PlayerCharacter[]> {
    return db.select().from(playerCharacters).where(eq(playerCharacters.playerId, playerId));
  }

  async addCharacterToPlayer(data: InsertPlayerCharacter): Promise<PlayerCharacter> {
    return insertAndGet(playerCharacters, playerCharacters.id, data);
  }

  // Currency & Wallet methods
  async getAllCurrencies(): Promise<Currency[]> {
    return db.select().from(currencies);
  }

  async getPlayerWallets(playerId: string): Promise<PlayerWallet[]> {
    return db.select().from(playerWallets).where(eq(playerWallets.playerId, playerId));
  }

  async getPlayerWallet(playerId: string, currencyId: string): Promise<PlayerWallet | undefined> {
    const [wallet] = await db.select().from(playerWallets).where(
      and(eq(playerWallets.playerId, playerId), eq(playerWallets.currencyId, currencyId))
    );
    return wallet || undefined;
  }

  async updateWalletBalance(walletId: string, amount: number, reason: string): Promise<WalletTransaction> {
    // Update wallet balance
    await db
      .update(playerWallets)
      .set({ 
        balance: sql`${playerWallets.balance} + ${amount}`,
        updatedAt: new Date() 
      })
      .where(eq(playerWallets.id, walletId));
    
    // Create transaction record
    return insertAndGet(walletTransactions, walletTransactions.id, { walletId, amount, reason });
  }

  async createPlayerWallet(wallet: InsertPlayerWallet): Promise<PlayerWallet> {
    // Check if wallet already exists
    const existing = await this.getPlayerWallet(wallet.playerId, wallet.currencyId);
    if (existing) {
      return existing;
    }
    return insertAndGet(playerWallets, playerWallets.id, wallet);
  }

  // Store methods
  async getAllStoreItems(): Promise<StoreItem[]> {
    return db.select().from(storeItems).where(eq(storeItems.isActive, true));
  }

  async getStoreItem(id: string): Promise<StoreItem | undefined> {
    const [item] = await db.select().from(storeItems).where(eq(storeItems.id, id));
    return item || undefined;
  }

  async createStoreItem(item: InsertStoreItem): Promise<StoreItem> {
    return insertAndGet(storeItems, storeItems.id, item);
  }

  // Achievement methods
  async getAllAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements);
  }

  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
    return db.select().from(playerAchievements).where(eq(playerAchievements.playerId, playerId));
  }

  async updatePlayerAchievement(playerId: string, achievementId: string, progress: number): Promise<PlayerAchievement> {
    const existing = await db.select().from(playerAchievements).where(
      and(eq(playerAchievements.playerId, playerId), eq(playerAchievements.achievementId, achievementId))
    );

    if (existing.length > 0) {
      return (await updateAndGet(playerAchievements, playerAchievements.id, existing[0].id, { progress }))!;
    } else {
      return insertAndGet(playerAchievements, playerAchievements.id, { playerId, achievementId, progress });
    }
    }

  // Lobby methods
  async getAllLobbies(): Promise<GameLobby[]> {
    return db.select().from(gameLobbies).where(eq(gameLobbies.status, "waiting")).orderBy(desc(gameLobbies.createdAt));
  }

  async getLobby(id: string): Promise<GameLobby | undefined> {
    const [lobby] = await db.select().from(gameLobbies).where(eq(gameLobbies.id, id));
    return lobby || undefined;
  }

  async createLobby(lobby: InsertGameLobby): Promise<GameLobby> {
    return insertAndGet(gameLobbies, gameLobbies.id, lobby);
  }

  async updateLobby(id: string, updates: Partial<InsertGameLobby>): Promise<GameLobby | undefined> {
    return updateAndGet(gameLobbies, gameLobbies.id, id, { ...updates, updatedAt: new Date() });
  }

  async deleteLobby(id: string): Promise<boolean> {
    await db.delete(lobbyPlayers).where(eq(lobbyPlayers.lobbyId, id));
    const result = await db.delete(gameLobbies).where(eq(gameLobbies.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  async getLobbyPlayers(lobbyId: string): Promise<LobbyPlayer[]> {
    return db.select().from(lobbyPlayers).where(eq(lobbyPlayers.lobbyId, lobbyId));
  }

  async joinLobby(data: InsertLobbyPlayer): Promise<LobbyPlayer> {
    return insertAndGet(lobbyPlayers, lobbyPlayers.id, data);
  }

  async leaveLobby(lobbyId: string, playerId: string): Promise<boolean> {
    const result = await db.delete(lobbyPlayers).where(
      and(eq(lobbyPlayers.lobbyId, lobbyId), eq(lobbyPlayers.playerId, playerId))
    );
    return (result as any)[0]?.affectedRows > 0;
  }

  async updateLobbyPlayer(lobbyId: string, playerId: string, updates: Partial<InsertLobbyPlayer>): Promise<LobbyPlayer | undefined> {
    await db.update(lobbyPlayers).set(updates).where(and(eq(lobbyPlayers.lobbyId, lobbyId), eq(lobbyPlayers.playerId, playerId)));
    const [updated] = await db.select().from(lobbyPlayers).where(and(eq(lobbyPlayers.lobbyId, lobbyId), eq(lobbyPlayers.playerId, playerId)));
    return updated || undefined;
  }

  // Game Session methods
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    return insertAndGet(gameSessions, gameSessions.id, session);
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session || undefined;
  }

  async updateGameSession(id: string, updates: Partial<InsertGameSession>): Promise<GameSession | undefined> {
    return updateAndGet(gameSessions, gameSessions.id, id, updates);
  }

  // AI Behavior methods
  async getAllAiBehaviors(): Promise<AiBehavior[]> {
    return db.select().from(aiBehaviors).orderBy(aiBehaviors.difficulty);
  }

  async getAiBehavior(id: string): Promise<AiBehavior | undefined> {
    const [behavior] = await db.select().from(aiBehaviors).where(eq(aiBehaviors.id, id));
    return behavior || undefined;
  }

  async createAiBehavior(behavior: InsertAiBehavior): Promise<AiBehavior> {
    return insertAndGet(aiBehaviors, aiBehaviors.id, behavior);
  }

  // User Settings methods
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    await db
      .insert(userSettings)
      .values(settings)
      .onDuplicateKeyUpdate({
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      });
    const [upserted] = await db.select().from(userSettings).where(eq(userSettings.userId, settings.userId));
    return upserted;
  }

  // Level Requirements methods
  async getAllLevelRequirements(): Promise<LevelRequirement[]> {
    return db.select().from(levelRequirements).orderBy(levelRequirements.level);
  }

  async getLevelRequirement(level: number): Promise<LevelRequirement | undefined> {
    const [req] = await db.select().from(levelRequirements).where(eq(levelRequirements.level, level));
    return req || undefined;
  }

  // Project methods
  async getAllProjects(): Promise<GameProject[]> {
    return db.select().from(gameProjects).orderBy(desc(gameProjects.createdAt));
  }

  async getProject(id: string): Promise<GameProject | undefined> {
    const [project] = await db.select().from(gameProjects).where(eq(gameProjects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertGameProject): Promise<GameProject> {
    return insertAndGet(gameProjects, gameProjects.id, insertProject);
  }

  async updateProject(id: string, updates: Partial<InsertGameProject>): Promise<GameProject | undefined> {
    return updateAndGet(gameProjects, gameProjects.id, id, { ...updates, updatedAt: new Date() });
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(gameProjects).where(eq(gameProjects.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  // Conversation methods
  async getAllConversations(): Promise<ChatConversation[]> {
    return db.select().from(chatConversations).orderBy(desc(chatConversations.updatedAt));
  }

  async getConversation(id: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertChatConversation): Promise<ChatConversation> {
    return insertAndGet(chatConversations, chatConversations.id, insertConversation);
  }

  async deleteConversation(id: string): Promise<boolean> {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, id));
    const result = await db.delete(chatConversations).where(eq(chatConversations.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  // Message methods
  async getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async createMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const msg = await insertAndGet<ChatMessage>(chatMessages, chatMessages.id, insertMessage);
    await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, insertMessage.conversationId));
    return msg;
  }

  // Asset methods
  async getAllAssets(): Promise<GDevelopAsset[]> {
    return db.select().from(gdevelopAssets);
  }

  async getAssetsByType(type: string): Promise<GDevelopAsset[]> {
    return db.select().from(gdevelopAssets).where(eq(gdevelopAssets.type, type));
  }

  async searchAssets(query: string): Promise<GDevelopAsset[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db.select().from(gdevelopAssets).where(
      or(
        like(sql`LOWER(${gdevelopAssets.name})`, searchPattern),
        like(sql`LOWER(${gdevelopAssets.description})`, searchPattern)
      )
    );
  }

  async createAsset(insertAsset: InsertGdevelopAsset): Promise<GDevelopAsset> {
    return insertAndGet(gdevelopAssets, gdevelopAssets.id, insertAsset);
  }

  async seedAssets(): Promise<void> {
    await this.seedThreeJsExamples();
    await this.seedCrownClashAssets();
    await this.seedKayKit3DModels();
    await this.seedGrudgeGangsAssets();

    const existingAssets = await this.getAllAssets();
    if (existingAssets.length > 0) {
      return;
    }

    const sampleAssets: InsertGdevelopAsset[] = [
      {
        name: "Knight Character",
        type: "sprite",
        category: "Characters",
        source: "internal",
        tags: ["knight", "medieval", "hero"],
        description: "Animated knight character sprite",
      },
      {
        name: "Forest Background",
        type: "background",
        category: "Environments",
        source: "internal",
        tags: ["forest", "nature", "outdoor"],
        description: "Parallax forest background",
      },
    ];

    for (const asset of sampleAssets) {
      await this.createAsset(asset);
    }
  }

  async seedKayKit3DModels(): Promise<void> {
    const existingAssets = await db
      .select()
      .from(gdevelopAssets)
      .where(eq(gdevelopAssets.source, "kaykit-skeletons"))
      .limit(1);
    
    if (existingAssets.length > 0) {
      console.log("KayKit 3D models already seeded");
      return;
    }

    console.log("Seeding KayKit Skeleton 3D models...");

    const kayKitModels: InsertGdevelopAsset[] = [
      {
        name: "Skeleton Staff",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Staff.gltf",
        tags: ["skeleton", "staff", "3d", "character", "fantasy", "kaykit"],
        description: "Skeleton character holding a staff - perfect for mage or necromancer units in RTS games",
      },
      {
        name: "Skeleton Axe",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Axe.gltf",
        tags: ["skeleton", "axe", "3d", "warrior", "fantasy", "kaykit"],
        description: "Skeleton warrior wielding an axe - great for melee combat units",
      },
      {
        name: "Skeleton Blade",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Blade.gltf",
        tags: ["skeleton", "blade", "sword", "3d", "warrior", "fantasy", "kaykit"],
        description: "Skeleton swordsman with a sharp blade - versatile infantry unit",
      },
      {
        name: "Skeleton Crossbow",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Crossbow.gltf",
        tags: ["skeleton", "crossbow", "ranged", "3d", "archer", "fantasy", "kaykit"],
        description: "Skeleton archer with crossbow - ranged attack unit for strategic positioning",
      },
      {
        name: "Skeleton Shield Large A",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Large_A.gltf",
        tags: ["skeleton", "shield", "tank", "3d", "defender", "fantasy", "kaykit"],
        description: "Skeleton with large shield - defensive unit for protecting other troops",
      },
      {
        name: "Skeleton Shield Large B",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Large_B.gltf",
        tags: ["skeleton", "shield", "tank", "3d", "defender", "fantasy", "kaykit"],
        description: "Alternate skeleton defender with large shield variant",
      },
      {
        name: "Skeleton Shield Small A",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Small_A.gltf",
        tags: ["skeleton", "shield", "infantry", "3d", "soldier", "fantasy", "kaykit"],
        description: "Skeleton soldier with small shield - balanced offensive/defensive unit",
      },
      {
        name: "Skeleton Shield Small B",
        type: "3d-model",
        category: "Characters",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Small_B.gltf",
        tags: ["skeleton", "shield", "infantry", "3d", "soldier", "fantasy", "kaykit"],
        description: "Alternate skeleton soldier with small shield variant",
      },
      {
        name: "Skeleton Arrow",
        type: "3d-model",
        category: "Props",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Arrow.gltf",
        tags: ["arrow", "projectile", "3d", "prop", "weapon", "kaykit"],
        description: "Arrow prop for skeleton archers - can be used as projectile",
      },
      {
        name: "Skeleton Quiver",
        type: "3d-model",
        category: "Props",
        source: "kaykit-skeletons",
        modelUrl: "/attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Quiver.gltf",
        tags: ["quiver", "arrows", "3d", "prop", "equipment", "kaykit"],
        description: "Quiver of arrows prop - equipment for archer units",
      },
    ];

    for (const asset of kayKitModels) {
      await this.createAsset(asset);
    }

    console.log("KayKit 3D models seeded successfully!");
  }

  async seedCrownClashAssets(): Promise<void> {
    const existingAssets = await db
      .select()
      .from(gdevelopAssets)
      .where(eq(gdevelopAssets.source, "crown-clash"))
      .limit(1);
    
    if (existingAssets.length > 0) {
      console.log("Crown Clash assets already seeded");
      return;
    }

    console.log("Seeding Crown Clash game assets...");

    const crownClashAssets: InsertGdevelopAsset[] = [
      {
        name: "Skeleton Warrior",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/Dh99XuH.png",
        previewUrl: "https://i.imgur.com/Dh99XuH.png",
        tags: ["skeleton", "warrior", "troop", "fantasy", "crown-clash"],
        description: "Skeleton warrior sprite for Crown Clash card game - a 3 elixir troop with 100 HP and 30 damage",
      },
      {
        name: "Elf Archer",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/Enu1T7Y.png",
        previewUrl: "https://i.imgur.com/Enu1T7Y.png",
        tags: ["elf", "archer", "ranged", "troop", "fantasy", "crown-clash"],
        description: "Elf Archer sprite for Crown Clash - a 4 elixir ranged troop with 80 HP, 40 damage, and 150 range",
      },
      {
        name: "Scourge Warrior",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/NFjvmxO.png",
        previewUrl: "https://i.imgur.com/NFjvmxO.png",
        tags: ["scourge", "warrior", "tank", "troop", "fantasy", "crown-clash"],
        description: "Scourge Warrior sprite for Crown Clash - a 5 elixir heavy troop with 200 HP and 50 damage",
      },
      {
        name: "Dwarf Knight",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/TalRqz3.png",
        previewUrl: "https://i.imgur.com/TalRqz3.png",
        tags: ["dwarf", "knight", "melee", "troop", "fantasy", "crown-clash"],
        description: "Dwarf Knight sprite for Crown Clash - a 4 elixir melee troop with 150 HP and 35 damage",
      },
      {
        name: "Fire Ball Spell",
        type: "sprite",
        category: "Effects",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/KfE0K3N.png",
        previewUrl: "https://i.imgur.com/KfE0K3N.png",
        tags: ["fireball", "spell", "magic", "projectile", "crown-clash"],
        description: "Fire Ball spell sprite for Crown Clash - a 4 elixir spell dealing 200 area damage",
      },
      {
        name: "Explosion Effect",
        type: "sprite",
        category: "Effects",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/vUfG5PJ.png",
        previewUrl: "https://i.imgur.com/vUfG5PJ.png",
        tags: ["explosion", "effect", "particle", "spell", "crown-clash"],
        description: "Explosion effect sprite for Crown Clash - used for spell impact and destruction effects",
      },
      {
        name: "Boss Ship",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/3cpJ2XF.png",
        previewUrl: "https://i.imgur.com/3cpJ2XF.png",
        tags: ["ship", "boss", "vehicle", "legendary", "crown-clash"],
        description: "Boss Ship sprite for Crown Clash - a 7 elixir legendary unit with 1000 HP and 100 damage",
      },
      {
        name: "Battle Ship",
        type: "sprite",
        category: "Characters",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/z1fbkXx.png",
        previewUrl: "https://i.imgur.com/z1fbkXx.png",
        tags: ["ship", "vehicle", "ranged", "crown-clash"],
        description: "Battle Ship sprite for Crown Clash - a 6 elixir unit with 800 HP, 80 damage, and ranged attacks",
      },
      {
        name: "Defense Tower",
        type: "sprite",
        category: "Buildings",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/Xn1ry3x.png",
        previewUrl: "https://i.imgur.com/Xn1ry3x.png",
        tags: ["tower", "building", "defense", "structure", "crown-clash"],
        description: "Defense Tower sprite for Crown Clash - the main defensive structure players must protect",
      },
      {
        name: "Card Frame",
        type: "ui",
        category: "UI Elements",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/tK0TeUN.png",
        previewUrl: "https://i.imgur.com/tK0TeUN.png",
        tags: ["card", "frame", "ui", "interface", "crown-clash"],
        description: "Card frame UI element for Crown Clash - used to display troop and spell cards",
      },
      {
        name: "Arena Background",
        type: "background",
        category: "Environments",
        source: "crown-clash",
        sourceUrl: "https://i.imgur.com/JAHg1QC.png",
        previewUrl: "https://i.imgur.com/JAHg1QC.png",
        tags: ["arena", "background", "battlefield", "environment", "crown-clash"],
        description: "Arena background for Crown Clash - the main game battlefield environment",
      },
    ];

    for (const asset of crownClashAssets) {
      await this.createAsset(asset);
    }
    console.log("Crown Clash assets seeded successfully!");
  }

  async seedGrudgeGangsAssets(): Promise<void> {
    const existingAssets = await db
      .select()
      .from(gdevelopAssets)
      .where(eq(gdevelopAssets.source, "grudge-gangs"))
      .limit(1);
    
    if (existingAssets.length > 0) {
      console.log("Grudge Gangs assets already seeded");
      return;
    }

    console.log("Seeding Grudge Gangs MOBA assets...");

    const grudgeAssets: InsertGdevelopAsset[] = [
      {
        name: "Necros Champion Icon",
        type: "sprite",
        category: "Characters",
        source: "grudge-gangs",
        tags: ["necros", "champion", "moba", "icon", "grudge-gangs", "mage"],
        description: "Necros mage champion icon for Grudge Gangs MOBA",
      },
      {
        name: "Grimfang Champion Icon",
        type: "sprite",
        category: "Characters",
        source: "grudge-gangs",
        tags: ["grimfang", "champion", "moba", "icon", "grudge-gangs", "warrior"],
        description: "Grimfang warrior champion icon for Grudge Gangs MOBA",
      },
      {
        name: "Boneguard Champion Icon",
        type: "sprite",
        category: "Characters",
        source: "grudge-gangs",
        tags: ["boneguard", "champion", "moba", "icon", "grudge-gangs", "tank"],
        description: "Boneguard tank champion icon for Grudge Gangs MOBA",
      },
      {
        name: "Shadowblade Champion Icon",
        type: "sprite",
        category: "Characters",
        source: "grudge-gangs",
        tags: ["shadowblade", "champion", "moba", "icon", "grudge-gangs", "assassin"],
        description: "Shadowblade assassin champion icon for Grudge Gangs MOBA",
      },
      {
        name: "Deadeye Champion Icon",
        type: "sprite",
        category: "Characters",
        source: "grudge-gangs",
        tags: ["deadeye", "champion", "moba", "icon", "grudge-gangs", "marksman"],
        description: "Deadeye marksman champion icon for Grudge Gangs MOBA",
      },
    ];

    for (const asset of grudgeAssets) {
      await this.createAsset(asset);
    }
    console.log("Grudge Gangs assets seeded successfully!");
  }

  async seedThreeJsExamples(): Promise<void> {
    const existingAssets = await db
      .select()
      .from(gdevelopAssets)
      .where(eq(gdevelopAssets.type, ASSET_TYPES.THREEJS_EXAMPLE))
      .limit(1);
    
    if (existingAssets.length > 0) {
      console.log("Three.js examples already seeded");
      return;
    }

    console.log(`Seeding ${THREEJS_EXAMPLES.length} Three.js examples...`);

    const threejsAssets: InsertGdevelopAsset[] = THREEJS_EXAMPLES.map(example => ({
      name: example.name,
      type: ASSET_TYPES.THREEJS_EXAMPLE,
      category: example.category,
      source: "stemkoski",
      sourceUrl: `https://stemkoski.github.io/Three.js/${example.fileName}.html`,
      previewUrl: `https://stemkoski.github.io/Three.js/html-images/${example.fileName}.png`,
      tags: example.tags,
      description: example.description,
    }));

    const batchSize = 20;
    for (let i = 0; i < threejsAssets.length; i += batchSize) {
      const batch = threejsAssets.slice(i, i + batchSize);
      await db.insert(gdevelopAssets).values(batch);
      console.log(`Seeded ${Math.min(i + batchSize, threejsAssets.length)}/${threejsAssets.length} Three.js examples`);
    }

    console.log("Three.js examples seeded successfully!");
  }

  // RTS Project methods
  async getAllRtsProjects(): Promise<RtsProject[]> {
    return db.select().from(rtsProjects).orderBy(desc(rtsProjects.createdAt));
  }

  async getRtsProject(id: string): Promise<RtsProject | undefined> {
    const [project] = await db.select().from(rtsProjects).where(eq(rtsProjects.id, id));
    return project || undefined;
  }

  async createRtsProject(insertProject: InsertRtsProject): Promise<RtsProject> {
    return insertAndGet(rtsProjects, rtsProjects.id, insertProject as any);
  }

  async updateRtsProject(id: string, updates: Partial<InsertRtsProject>): Promise<RtsProject | undefined> {
    return updateAndGet(rtsProjects, rtsProjects.id, id, { ...updates, updatedAt: new Date() });
  }

  async deleteRtsProject(id: string): Promise<boolean> {
    await db.delete(rtsUnitTemplates).where(eq(rtsUnitTemplates.projectId, id));
    await db.delete(rtsBuildingTemplates).where(eq(rtsBuildingTemplates.projectId, id));
    const result = await db.delete(rtsProjects).where(eq(rtsProjects.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  // RTS Asset methods
  async getAllRtsAssets(): Promise<RtsAsset[]> {
    return db.select().from(rtsAssets).orderBy(desc(rtsAssets.createdAt));
  }

  async getRtsAssetsByType(type: string): Promise<RtsAsset[]> {
    return db.select().from(rtsAssets).where(eq(rtsAssets.type, type));
  }

  async createRtsAsset(insertAsset: InsertRtsAsset): Promise<RtsAsset> {
    return insertAndGet(rtsAssets, rtsAssets.id, insertAsset);
  }

  async seedRtsAssets(): Promise<void> {
    const existingAssets = await this.getAllRtsAssets();
    if (existingAssets.length > 0) {
      return;
    }

    const { rtsAssetSeeds } = await import("./rtsAssetSeed");
    
    console.log(`Seeding ${rtsAssetSeeds.length} RTS assets...`);
    
    const batchSize = 50;
    for (let i = 0; i < rtsAssetSeeds.length; i += batchSize) {
      const batch = rtsAssetSeeds.slice(i, i + batchSize);
      await db.insert(rtsAssets).values(batch);
      console.log(`Seeded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(rtsAssetSeeds.length / batchSize)}`);
    }
    
    console.log(`Successfully seeded ${rtsAssetSeeds.length} RTS assets!`);
  }

  // RTS Unit Template methods
  async getUnitTemplatesByProject(projectId: string): Promise<RtsUnitTemplate[]> {
    return db.select().from(rtsUnitTemplates).where(eq(rtsUnitTemplates.projectId, projectId));
  }

  async createUnitTemplate(insertTemplate: InsertRtsUnitTemplate): Promise<RtsUnitTemplate> {
    return insertAndGet(rtsUnitTemplates, rtsUnitTemplates.id, insertTemplate);
  }

  async updateUnitTemplate(id: string, updates: Partial<InsertRtsUnitTemplate>): Promise<RtsUnitTemplate | undefined> {
    return updateAndGet(rtsUnitTemplates, rtsUnitTemplates.id, id, updates);
  }

  async deleteUnitTemplate(id: string): Promise<boolean> {
    const result = await db.delete(rtsUnitTemplates).where(eq(rtsUnitTemplates.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  // RTS Building Template methods
  async getBuildingTemplatesByProject(projectId: string): Promise<RtsBuildingTemplate[]> {
    return db.select().from(rtsBuildingTemplates).where(eq(rtsBuildingTemplates.projectId, projectId));
  }

  async createBuildingTemplate(insertTemplate: InsertRtsBuildingTemplate): Promise<RtsBuildingTemplate> {
    return insertAndGet(rtsBuildingTemplates, rtsBuildingTemplates.id, insertTemplate);
  }

  async updateBuildingTemplate(id: string, updates: Partial<InsertRtsBuildingTemplate>): Promise<RtsBuildingTemplate | undefined> {
    return updateAndGet(rtsBuildingTemplates, rtsBuildingTemplates.id, id, updates);
  }

  async deleteBuildingTemplate(id: string): Promise<boolean> {
    const result = await db.delete(rtsBuildingTemplates).where(eq(rtsBuildingTemplates.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }

  // Seed game data (currencies, characters, AI behaviors, level requirements)
  async seedGameData(): Promise<void> {
    // Seed currencies
    const existingCurrencies = await this.getAllCurrencies();
    if (existingCurrencies.length === 0) {
      console.log("Seeding currencies...");
      await db.insert(currencies).values([
        { code: "GOLD", name: "Gold", isPremium: false },
        { code: "GEMS", name: "Gems", isPremium: true },
        { code: "TOKENS", name: "Battle Tokens", isPremium: false },
      ]);
    }

    // Seed AI behaviors
    const existingAi = await this.getAllAiBehaviors();
    if (existingAi.length === 0) {
      console.log("Seeding AI behaviors...");
      await db.insert(aiBehaviors).values([
        {
          name: "Passive Defender",
          difficulty: "easy",
          description: "Focuses on defense, rarely attacks",
          aggressiveness: 20,
          defensiveness: 80,
          economyFocus: 60,
          expansionRate: 30,
        },
        {
          name: "Balanced Commander",
          difficulty: "medium",
          description: "Well-rounded strategy with balanced offense and defense",
          aggressiveness: 50,
          defensiveness: 50,
          economyFocus: 50,
          expansionRate: 50,
        },
        {
          name: "Aggressive Warlord",
          difficulty: "hard",
          description: "Relentless attacker that pressures constantly",
          aggressiveness: 80,
          defensiveness: 30,
          economyFocus: 40,
          expansionRate: 70,
        },
        {
          name: "Master Strategist",
          difficulty: "expert",
          description: "Adapts to player strategy, exploits weaknesses",
          aggressiveness: 70,
          defensiveness: 60,
          economyFocus: 80,
          expansionRate: 80,
        },
      ]);
    }

    // Seed characters
    const existingCharacters = await this.getAllCharacters();
    if (existingCharacters.length === 0) {
      console.log("Seeding characters...");
      await db.insert(characters).values([
        {
          name: "Knight Commander",
          type: "warrior",
          rarity: "common",
          baseStats: { health: 150, attack: 20, defense: 25, speed: 80 },
          abilities: [{ name: "Shield Bash", damage: 15, cooldown: 5 }],
          unlockLevel: 1,
        },
        {
          name: "Arcane Wizard",
          type: "mage",
          rarity: "rare",
          baseStats: { health: 80, attack: 35, defense: 10, speed: 70 },
          abilities: [{ name: "Fireball", damage: 40, cooldown: 8 }],
          unlockLevel: 5,
          unlockCost: { gold: 500, gems: 0 },
        },
        {
          name: "Shadow Archer",
          type: "archer",
          rarity: "rare",
          baseStats: { health: 90, attack: 30, defense: 12, speed: 100 },
          abilities: [{ name: "Multi-Shot", damage: 25, cooldown: 6 }],
          unlockLevel: 3,
          unlockCost: { gold: 300, gems: 0 },
        },
        {
          name: "Dragon Lord",
          type: "legendary",
          rarity: "legendary",
          baseStats: { health: 200, attack: 50, defense: 40, speed: 60 },
          abilities: [{ name: "Dragon Breath", damage: 80, cooldown: 15 }],
          unlockLevel: 20,
          unlockCost: { gold: 5000, gems: 50 },
        },
      ]);
    }

    // Seed level requirements
    const existingLevels = await this.getAllLevelRequirements();
    if (existingLevels.length === 0) {
      console.log("Seeding level requirements...");
      const levels = [];
      for (let i = 1; i <= 50; i++) {
        // Use a more moderate formula to stay within integer limits
        const xp = Math.min(Math.floor(100 * i * i), 2000000000);
        levels.push({
          level: i,
          xpRequired: xp,
          rewards: {
            gold: 100 * i,
            gems: i % 5 === 0 ? 10 : 0,
            unlocks: [],
          },
        });
      }
      await db.insert(levelRequirements).values(levels);
    }

    // Seed achievements
    const existingAchievements = await this.getAllAchievements();
    if (existingAchievements.length === 0) {
      console.log("Seeding achievements...");
      await db.insert(achievements).values([
        {
          name: "First Victory",
          description: "Win your first battle",
          category: "combat",
          requirement: { type: "wins", count: 1 },
          reward: { gold: 100, xp: 50 },
        },
        {
          name: "Veteran",
          description: "Win 10 battles",
          category: "combat",
          requirement: { type: "wins", count: 10 },
          reward: { gold: 500, xp: 200 },
        },
        {
          name: "Champion",
          description: "Win 50 battles",
          category: "combat",
          requirement: { type: "wins", count: 50 },
          reward: { gold: 2000, xp: 1000, gems: 20 },
        },
        {
          name: "Collector",
          description: "Unlock 5 characters",
          category: "collection",
          requirement: { type: "characters", count: 5 },
          reward: { gold: 1000, xp: 300 },
        },
      ]);
    }

    console.log("Game data seeding complete!");
  }

  // Viewport Asset methods
  async getAllViewportAssets(): Promise<ViewportAsset[]> {
    return db.select().from(viewportAssets).orderBy(desc(viewportAssets.createdAt));
  }

  async getViewportAsset(id: string): Promise<ViewportAsset | undefined> {
    const [asset] = await db.select().from(viewportAssets).where(eq(viewportAssets.id, id));
    return asset || undefined;
  }

  async getViewportAssetBySlug(slug: string): Promise<ViewportAsset | undefined> {
    const [asset] = await db.select().from(viewportAssets).where(eq(viewportAssets.slug, slug));
    return asset || undefined;
  }

  async getViewportAssetsByType(assetType: string): Promise<ViewportAsset[]> {
    return db.select().from(viewportAssets).where(eq(viewportAssets.assetType, assetType));
  }

  async getViewportAssetsByCategory(category: string): Promise<ViewportAsset[]> {
    return db.select().from(viewportAssets).where(eq(viewportAssets.category, category));
  }

  async searchViewportAssets(query: string): Promise<ViewportAsset[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(viewportAssets).where(
      or(
        like(viewportAssets.name, searchPattern),
        like(viewportAssets.slug, searchPattern),
        like(viewportAssets.category, searchPattern)
      )
    );
  }

  async createViewportAsset(asset: InsertViewportAsset): Promise<ViewportAsset> {
    return insertAndGet(viewportAssets, viewportAssets.id, asset);
  }

  async updateViewportAsset(id: string, updates: Partial<InsertViewportAsset>): Promise<ViewportAsset | undefined> {
    return updateAndGet(viewportAssets, viewportAssets.id, id, { ...updates, updatedAt: new Date() });
  }

  async deleteViewportAsset(id: string): Promise<boolean> {
    const result = await db.delete(viewportAssets).where(eq(viewportAssets.id, id));
    return true;
  }

  async seedViewportAssets(): Promise<void> {
    // Always reseed to add new asset types
    const existingAssets = await this.getAllViewportAssets();
    
    // Check if we have new asset types (sounds, backgrounds, tilesets)
    const hasNewTypes = existingAssets.some(a => 
      ['audio', 'sound', 'background', 'tileset', 'spritesheet'].includes(a.assetType)
    );
    
    if (existingAssets.length > 0 && hasNewTypes) {
      console.log("Viewport assets already seeded with new types");
      return;
    }

    console.log("Seeding viewport assets with sounds, backgrounds, tilesets, sprites...");
    
    const assetData: InsertViewportAsset[] = [
      // Orc Units
      {
        name: "Orc Cavalry Run",
        slug: "orc-cavalry-run",
        sourceType: "internal",
        assetType: "fbx",
        category: "unit",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/animation/Cavalry/ORC_cavalry_03_run.FBX",
        tags: ["orc", "cavalry", "animation", "run"],
        isAnimated: true,
        metadata: { animationType: "run", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
      },
      {
        name: "Orc Cavalry Idle",
        slug: "orc-cavalry-idle",
        sourceType: "internal",
        assetType: "fbx",
        category: "unit",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/animation/Cavalry/ORC_cavalry_01_idle.FBX",
        tags: ["orc", "cavalry", "animation", "idle"],
        isAnimated: true,
        metadata: { animationType: "idle", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
      },
      {
        name: "Orc Catapult Attack",
        slug: "orc-catapult-attack",
        sourceType: "internal",
        assetType: "fbx",
        category: "siege",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/animation/Catapult/ORC_catapult_03_attack.FBX",
        tags: ["orc", "catapult", "siege", "attack"],
        isAnimated: true,
        metadata: { animationType: "attack", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 4, y: 3, z: 6 }, autoRotate: true },
      },
      {
        name: "Orc Worker",
        slug: "orc-worker",
        sourceType: "internal",
        assetType: "fbx",
        category: "unit",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/animation/Worker/ORC_worker_12_working_A.FBX",
        tags: ["orc", "worker", "animation", "working"],
        isAnimated: true,
        metadata: { animationType: "work", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
      },
      {
        name: "Orc Axe Weapon",
        slug: "orc-axe-weapon",
        sourceType: "internal",
        assetType: "fbx",
        category: "weapon",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/models/extra_models/Equipment/ORC_weapon_Axe_A.FBX",
        tags: ["orc", "weapon", "axe", "equipment"],
        isAnimated: false,
        metadata: { type: "weapon", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Orc Shield",
        slug: "orc-shield",
        sourceType: "internal",
        assetType: "fbx",
        category: "weapon",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/models/extra_models/Equipment/ORC_Shield_D.FBX",
        tags: ["orc", "shield", "equipment", "defense"],
        isAnimated: false,
        metadata: { type: "shield", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Orc Staff Weapon",
        slug: "orc-staff-weapon",
        sourceType: "internal",
        assetType: "fbx",
        category: "weapon",
        subcategory: "orcs",
        filePath: "attached_assets/Orcs/models/extra_models/Equipment/ORC_weapon_staff_B.FBX",
        tags: ["orc", "weapon", "staff", "magic"],
        isAnimated: false,
        metadata: { type: "staff", faction: "orcs" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      // Human Units
      {
        name: "Human Catapult",
        slug: "human-catapult",
        sourceType: "internal",
        assetType: "fbx",
        category: "siege",
        subcategory: "humans",
        filePath: "attached_assets/Humans/models/WK_Catapult.FBX",
        tags: ["human", "catapult", "siege", "war"],
        isAnimated: false,
        metadata: { type: "siege", faction: "humans" },
        viewportConfig: { cameraPosition: { x: 5, y: 3, z: 7 }, autoRotate: true },
      },
      // Elf Units
      {
        name: "Elf Cavalry Spear Attack",
        slug: "elf-cavalry-spear-attack",
        sourceType: "internal",
        assetType: "fbx",
        category: "unit",
        subcategory: "elves",
        filePath: "attached_assets/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_07_attack.FBX",
        tags: ["elf", "cavalry", "spear", "attack"],
        isAnimated: true,
        metadata: { animationType: "attack", faction: "elves" },
        viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
      },
      {
        name: "Elf Cavalry Mage Attack",
        slug: "elf-cavalry-mage-attack",
        sourceType: "internal",
        assetType: "fbx",
        category: "unit",
        subcategory: "elves",
        filePath: "attached_assets/Elves/animation/Cavalry_Mage/ELF_cavalry_mage_08_attack_B.FBX",
        tags: ["elf", "cavalry", "mage", "magic", "attack"],
        isAnimated: true,
        metadata: { animationType: "attack", faction: "elves" },
        viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
      },
      // KayKit Skeletons
      {
        name: "Skeleton Staff",
        slug: "skeleton-staff",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Staff.gltf",
        tags: ["skeleton", "staff", "weapon", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Axe",
        slug: "skeleton-axe",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Axe.gltf",
        tags: ["skeleton", "axe", "weapon", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Blade",
        slug: "skeleton-blade",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Blade.gltf",
        tags: ["skeleton", "blade", "sword", "weapon", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Crossbow",
        slug: "skeleton-crossbow",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Crossbow.gltf",
        tags: ["skeleton", "crossbow", "ranged", "weapon", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Shield Large",
        slug: "skeleton-shield-large",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Large_A.gltf",
        tags: ["skeleton", "shield", "defense", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Shield Small",
        slug: "skeleton-shield-small",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Shield_Small_A.gltf",
        tags: ["skeleton", "shield", "defense", "small", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Quiver",
        slug: "skeleton-quiver",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Quiver.gltf",
        tags: ["skeleton", "quiver", "arrows", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 1, y: 1, z: 2 }, autoRotate: true },
      },
      {
        name: "Skeleton Arrow",
        slug: "skeleton-arrow",
        sourceType: "internal",
        assetType: "gltf",
        category: "weapon",
        subcategory: "skeletons",
        filePath: "attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf/Skeleton_Arrow.gltf",
        tags: ["skeleton", "arrow", "projectile", "kaykit"],
        isAnimated: false,
        metadata: { source: "KayKit", faction: "undead" },
        viewportConfig: { cameraPosition: { x: 0.5, y: 0.5, z: 1 }, autoRotate: true },
      },
      
      // === FREE SOUNDS (Kenney & OpenGameArt) ===
      {
        name: "Sword Swing",
        slug: "sound-sword-swing",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "combat",
        filePath: "https://opengameart.org/sites/default/files/sword-unsheathe5.mp3",
        tags: ["sound", "sword", "swing", "combat", "sfx"],
        isAnimated: false,
        metadata: { duration: 0.5, format: "mp3", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Explosion Impact",
        slug: "sound-explosion-impact",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "combat",
        filePath: "https://opengameart.org/sites/default/files/explosion.mp3",
        tags: ["sound", "explosion", "impact", "combat", "sfx"],
        isAnimated: false,
        metadata: { duration: 1.2, format: "mp3", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Coin Collect",
        slug: "sound-coin-collect",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "ui",
        filePath: "https://opengameart.org/sites/default/files/coin.wav",
        tags: ["sound", "coin", "collect", "pickup", "ui", "sfx"],
        isAnimated: false,
        metadata: { duration: 0.3, format: "wav", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Victory Fanfare",
        slug: "sound-victory-fanfare",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "music",
        filePath: "https://opengameart.org/sites/default/files/fanfare.ogg",
        tags: ["sound", "victory", "fanfare", "music", "win"],
        isAnimated: false,
        metadata: { duration: 3.5, format: "ogg", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Button Click",
        slug: "sound-button-click",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "ui",
        filePath: "https://opengameart.org/sites/default/files/click1.ogg",
        tags: ["sound", "button", "click", "ui", "sfx"],
        isAnimated: false,
        metadata: { duration: 0.1, format: "ogg", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Footsteps Grass",
        slug: "sound-footsteps-grass",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "environment",
        filePath: "https://opengameart.org/sites/default/files/footstep_grass_001.ogg",
        tags: ["sound", "footsteps", "grass", "walk", "environment"],
        isAnimated: false,
        metadata: { duration: 0.4, format: "ogg", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Magic Spell Cast",
        slug: "sound-magic-spell",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "combat",
        filePath: "https://opengameart.org/sites/default/files/magic_spell_1.ogg",
        tags: ["sound", "magic", "spell", "cast", "sfx"],
        isAnimated: false,
        metadata: { duration: 1.0, format: "ogg", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      {
        name: "Jump Sound",
        slug: "sound-jump",
        sourceType: "external",
        assetType: "audio",
        category: "sound",
        subcategory: "player",
        filePath: "https://opengameart.org/sites/default/files/jump_05.ogg",
        tags: ["sound", "jump", "player", "platformer", "sfx"],
        isAnimated: false,
        metadata: { duration: 0.3, format: "ogg", source: "OpenGameArt", license: "CC0" },
        viewportConfig: {},
      },
      
      // === FREE BACKGROUNDS ===
      {
        name: "Forest Background Parallax",
        slug: "bg-forest-parallax",
        sourceType: "external",
        assetType: "background",
        category: "background",
        subcategory: "nature",
        filePath: "https://opengameart.org/sites/default/files/preview_53.png",
        tags: ["background", "forest", "nature", "parallax", "trees"],
        isAnimated: false,
        metadata: { width: 1920, height: 1080, style: "parallax", source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Night Sky Stars",
        slug: "bg-night-sky",
        sourceType: "external",
        assetType: "background",
        category: "background",
        subcategory: "sky",
        filePath: "https://opengameart.org/sites/default/files/space_bg.png",
        tags: ["background", "night", "sky", "stars", "space"],
        isAnimated: false,
        metadata: { width: 1920, height: 1080, style: "tile", source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Desert Dunes",
        slug: "bg-desert-dunes",
        sourceType: "external",
        assetType: "background",
        category: "background",
        subcategory: "desert",
        filePath: "https://opengameart.org/sites/default/files/desert_bg_2.png",
        tags: ["background", "desert", "sand", "dunes", "warm"],
        isAnimated: false,
        metadata: { width: 1920, height: 1080, style: "static", source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Mountain Range",
        slug: "bg-mountain-range",
        sourceType: "external",
        assetType: "background",
        category: "background",
        subcategory: "nature",
        filePath: "https://opengameart.org/sites/default/files/mountain_background.png",
        tags: ["background", "mountain", "range", "nature", "epic"],
        isAnimated: false,
        metadata: { width: 1920, height: 1080, style: "parallax", source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "City Skyline",
        slug: "bg-city-skyline",
        sourceType: "external",
        assetType: "background",
        category: "background",
        subcategory: "urban",
        filePath: "https://opengameart.org/sites/default/files/city_bg.png",
        tags: ["background", "city", "skyline", "urban", "buildings"],
        isAnimated: false,
        metadata: { width: 1920, height: 1080, style: "static", source: "OpenGameArt" },
        viewportConfig: {},
      },
      
      // === FREE TILESETS ===
      {
        name: "Grass Terrain Tileset",
        slug: "tileset-grass-terrain",
        sourceType: "external",
        assetType: "tileset",
        category: "tileset",
        subcategory: "terrain",
        filePath: "https://opengameart.org/sites/default/files/grass_tileset.png",
        tags: ["tileset", "grass", "terrain", "nature", "ground"],
        isAnimated: false,
        metadata: { tileWidth: 32, tileHeight: 32, columns: 8, rows: 8, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Dungeon Tileset",
        slug: "tileset-dungeon",
        sourceType: "external",
        assetType: "tileset",
        category: "tileset",
        subcategory: "dungeon",
        filePath: "https://opengameart.org/sites/default/files/dungeon_tileset.png",
        tags: ["tileset", "dungeon", "dark", "stone", "walls"],
        isAnimated: false,
        metadata: { tileWidth: 16, tileHeight: 16, columns: 16, rows: 16, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Water Tiles",
        slug: "tileset-water",
        sourceType: "external",
        assetType: "tileset",
        category: "tileset",
        subcategory: "terrain",
        filePath: "https://opengameart.org/sites/default/files/water_tileset.png",
        tags: ["tileset", "water", "ocean", "lake", "animated"],
        isAnimated: true,
        metadata: { tileWidth: 32, tileHeight: 32, columns: 4, rows: 4, frames: 4, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Medieval Building Tileset",
        slug: "tileset-medieval-building",
        sourceType: "external",
        assetType: "tileset",
        category: "tileset",
        subcategory: "building",
        filePath: "https://opengameart.org/sites/default/files/medieval_tileset.png",
        tags: ["tileset", "medieval", "building", "castle", "town"],
        isAnimated: false,
        metadata: { tileWidth: 32, tileHeight: 32, columns: 16, rows: 8, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Platformer Blocks",
        slug: "tileset-platformer-blocks",
        sourceType: "external",
        assetType: "tileset",
        category: "tileset",
        subcategory: "platformer",
        filePath: "https://opengameart.org/sites/default/files/platformer_tileset.png",
        tags: ["tileset", "platformer", "blocks", "ground", "platforms"],
        isAnimated: false,
        metadata: { tileWidth: 16, tileHeight: 16, columns: 8, rows: 8, source: "OpenGameArt" },
        viewportConfig: {},
      },
      
      // === FREE SPRITES ===
      {
        name: "Warrior Hero Sprite",
        slug: "sprite-warrior-hero",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "character",
        filePath: "https://opengameart.org/sites/default/files/warrior_sprite.png",
        tags: ["sprite", "warrior", "hero", "character", "player"],
        isAnimated: false,
        metadata: { width: 64, height: 64, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Skeleton Enemy",
        slug: "sprite-skeleton-enemy",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "enemy",
        filePath: "https://opengameart.org/sites/default/files/skeleton_sprite.png",
        tags: ["sprite", "skeleton", "enemy", "undead", "monster"],
        isAnimated: false,
        metadata: { width: 32, height: 32, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Coin Item",
        slug: "sprite-coin-item",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "item",
        filePath: "https://opengameart.org/sites/default/files/coin_sprite.png",
        tags: ["sprite", "coin", "item", "gold", "collectible"],
        isAnimated: false,
        metadata: { width: 16, height: 16, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Health Potion",
        slug: "sprite-health-potion",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "item",
        filePath: "https://opengameart.org/sites/default/files/potion_red.png",
        tags: ["sprite", "potion", "health", "item", "heal"],
        isAnimated: false,
        metadata: { width: 16, height: 16, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Treasure Chest",
        slug: "sprite-treasure-chest",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "item",
        filePath: "https://opengameart.org/sites/default/files/chest_sprite.png",
        tags: ["sprite", "chest", "treasure", "loot", "container"],
        isAnimated: false,
        metadata: { width: 32, height: 32, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Fireball Projectile",
        slug: "sprite-fireball-projectile",
        sourceType: "external",
        assetType: "sprite",
        category: "sprite",
        subcategory: "projectile",
        filePath: "https://opengameart.org/sites/default/files/fireball_sprite.png",
        tags: ["sprite", "fireball", "projectile", "magic", "fire"],
        isAnimated: false,
        metadata: { width: 32, height: 32, source: "OpenGameArt" },
        viewportConfig: {},
      },
      
      // === ANIMATED SPRITESHEETS ===
      {
        name: "Knight Walk Animation",
        slug: "anim-knight-walk",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "character",
        filePath: "https://opengameart.org/sites/default/files/knight_walk.png",
        tags: ["animation", "knight", "walk", "character", "spritesheet"],
        isAnimated: true,
        metadata: { frameWidth: 64, frameHeight: 64, frames: 8, fps: 12, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Explosion Effect",
        slug: "anim-explosion-effect",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "effect",
        filePath: "https://opengameart.org/sites/default/files/explosion_anim.png",
        tags: ["animation", "explosion", "effect", "boom", "spritesheet"],
        isAnimated: true,
        metadata: { frameWidth: 64, frameHeight: 64, frames: 12, fps: 24, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Fire Loop",
        slug: "anim-fire-loop",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "effect",
        filePath: "https://opengameart.org/sites/default/files/fire_animation.png",
        tags: ["animation", "fire", "loop", "effect", "spritesheet"],
        isAnimated: true,
        metadata: { frameWidth: 32, frameHeight: 48, frames: 6, fps: 12, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Slime Idle Animation",
        slug: "anim-slime-idle",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "enemy",
        filePath: "https://opengameart.org/sites/default/files/slime_idle.png",
        tags: ["animation", "slime", "idle", "enemy", "monster"],
        isAnimated: true,
        metadata: { frameWidth: 32, frameHeight: 32, frames: 4, fps: 8, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Coin Spin Animation",
        slug: "anim-coin-spin",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "item",
        filePath: "https://opengameart.org/sites/default/files/coin_spin.png",
        tags: ["animation", "coin", "spin", "item", "collectible"],
        isAnimated: true,
        metadata: { frameWidth: 16, frameHeight: 16, frames: 8, fps: 12, source: "OpenGameArt" },
        viewportConfig: {},
      },
      {
        name: "Water Splash Effect",
        slug: "anim-water-splash",
        sourceType: "external",
        assetType: "spritesheet",
        category: "animation",
        subcategory: "effect",
        filePath: "https://opengameart.org/sites/default/files/water_splash.png",
        tags: ["animation", "water", "splash", "effect", "spritesheet"],
        isAnimated: true,
        metadata: { frameWidth: 48, frameHeight: 48, frames: 6, fps: 16, source: "OpenGameArt" },
        viewportConfig: {},
      },
    ];

    // Delete old assets if reseed is needed
    if (existingAssets.length > 0 && !hasNewTypes) {
      console.log("Clearing old viewport assets to add new types...");
      await db.delete(viewportAssets);
    }

    await db.insert(viewportAssets).values(assetData);
    console.log(`Seeded ${assetData.length} viewport assets including sounds, backgrounds, tilesets, sprites, and animations`);
  }

  // Saved Characters (MMO-style character creation)
  async getSavedCharacters(userId?: string): Promise<SavedCharacter[]> {
    if (userId) {
      return await db.select().from(savedCharacters)
        .where(eq(savedCharacters.userId, userId))
        .orderBy(desc(savedCharacters.createdAt));
    }
    return await db.select().from(savedCharacters)
      .orderBy(desc(savedCharacters.createdAt));
  }

  async getSavedCharacter(id: string): Promise<SavedCharacter | undefined> {
    const [character] = await db.select().from(savedCharacters)
      .where(eq(savedCharacters.id, id));
    return character;
  }

  async createSavedCharacter(character: InsertSavedCharacter): Promise<SavedCharacter> {
    return insertAndGet(savedCharacters, savedCharacters.id, character);
  }

  async setActiveCharacter(userId: string, characterId: string): Promise<void> {
    // First, deactivate all characters for this user
    await db.update(savedCharacters)
      .set({ isActive: false })
      .where(eq(savedCharacters.userId, userId));
    
    // Then activate the selected character
    await db.update(savedCharacters)
      .set({ isActive: true })
      .where(eq(savedCharacters.id, characterId));
  }

  async deleteSavedCharacter(id: string): Promise<boolean> {
    const result = await db.delete(savedCharacters)
      .where(eq(savedCharacters.id, id));
    return true;
  }

  // Unified Asset Library methods
  async getAllUnifiedAssets(): Promise<UnifiedAsset[]> {
    return db.select().from(unifiedAssets).orderBy(desc(unifiedAssets.createdAt));
  }

  async getUnifiedAsset(id: string): Promise<UnifiedAsset | undefined> {
    const [asset] = await db.select().from(unifiedAssets).where(eq(unifiedAssets.id, id));
    return asset || undefined;
  }

  async getUnifiedAssetByHash(contentHash: string): Promise<UnifiedAsset | undefined> {
    const [asset] = await db.select().from(unifiedAssets).where(eq(unifiedAssets.contentHash, contentHash));
    return asset || undefined;
  }

  async getUnifiedAssetsByType(assetType: string): Promise<UnifiedAsset[]> {
    return db.select().from(unifiedAssets).where(eq(unifiedAssets.assetType, assetType)).orderBy(desc(unifiedAssets.createdAt));
  }

  async getUnifiedAssetsByCategory(category: string): Promise<UnifiedAsset[]> {
    return db.select().from(unifiedAssets).where(eq(unifiedAssets.category, category)).orderBy(desc(unifiedAssets.createdAt));
  }

  async getUnifiedAssetsByUser(userId: string): Promise<UnifiedAsset[]> {
    return db.select().from(unifiedAssets).where(eq(unifiedAssets.userId, userId)).orderBy(desc(unifiedAssets.createdAt));
  }

  async searchUnifiedAssets(query: string): Promise<UnifiedAsset[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db.select().from(unifiedAssets).where(
      or(
        like(sql`LOWER(${unifiedAssets.name})`, searchPattern),
        like(sql`LOWER(${unifiedAssets.description})`, searchPattern),
        like(sql`LOWER(${unifiedAssets.filename})`, searchPattern)
      )
    ).orderBy(desc(unifiedAssets.createdAt));
  }

  async createUnifiedAsset(asset: InsertUnifiedAsset): Promise<UnifiedAsset> {
    return insertAndGet(unifiedAssets, unifiedAssets.id, asset);
  }

  async updateUnifiedAsset(id: string, updates: Partial<InsertUnifiedAsset>): Promise<UnifiedAsset | undefined> {
    return updateAndGet(unifiedAssets, unifiedAssets.id, id, { ...updates, updatedAt: new Date() });
  }

  async deleteUnifiedAsset(id: string): Promise<boolean> {
    const result = await db.delete(unifiedAssets).where(eq(unifiedAssets.id, id));
    return (result as any)[0]?.affectedRows > 0;
  }
}

export const storage = new DatabaseStorage();
