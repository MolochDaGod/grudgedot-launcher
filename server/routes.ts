import type { Express } from "express";
import { randomUUID } from "node:crypto";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import {
  ASSET_RULES,
  validateAssetUpload,
  assetUploadSchema,
  detectCategoryFromExtension,
  getContentType,
  autoTagAsset,
  extractFileMetadata,
  generateStoragePath,
} from "./assetValidation";

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}
// Grudge auth is handled in grudgeAuth.ts
import { registerUserRoutes } from "./routes/user";
import { registerGrudaWarsRoutes } from "./routes/grudaWars";
import { registerModelRoutes } from "./routes/models";
import { registerAssetTaggerRoutes } from "./workers/asset-tagger";
import { registerGrudaLegionRoutes } from "./services/grudaLegion";
import { lobbyManager } from "./multiplayer/lobby";
import { overdriveEngine } from "./services/overdriveEngine";
import { 
  insertGameProjectSchema, 
  insertChatConversationSchema, 
  insertChatMessageSchema, 
  insertGdevelopAssetSchema,
  insertRtsProjectSchema,
  insertRtsAssetSchema,
  insertRtsUnitTemplateSchema,
  insertRtsBuildingTemplateSchema,
  insertGameLobbySchema,
  insertLobbyPlayerSchema,
  insertPlayerProfileSchema,
  insertUnifiedAssetSchema,
  gdevelopAssets,
  gdevelopToolsSchema,
  users,
  openrtsUnits,
  openrtsWeapons,
  openrtsEffects,
  openrtsMover,
  openrtsActors,
  openrtsProjectiles,
  openrtsTrinkets,
  openrtsMapStyles,
  skillTrees,
  insertSkillTreeSchema,
  mmoWorlds,
  mmoCharacters,
  mmoNpcs,
  mmoChatMessages,
  insertMmoWorldSchema,
  insertMmoCharacterSchema,
  type MmoCharacter
} from "../shared/schema";
import OpenAI from "openai";
import { db } from "./db";
import { eq } from "drizzle-orm";

// This is using xAI's Grok API for game development assistance - reference: javascript_xai blueprint
const xai = process.env.XAI_API_KEY
  ? new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    })
  : null;

const GDEVELOP_SYSTEM_PROMPT = `You are an expert GDevelop game development assistant powered by xAI's Grok. GDevelop is an open-source, cross-platform game creator that allows users to create 2D and 3D games without programming using visual events.

Key capabilities you should help with:
- Game design and mechanics guidance
- GDevelop event system and behaviors
- 2D platformers, top-down games, side-scrollers, and RTS strategy games
- 3D game development with models and cameras
- Asset recommendations from the free library (Kenney, OpenGameArt, itch.io, etc.)
- Game logic and event creation
- Physics, collisions, and movement
- UI/UX design for games
- Performance optimization
- Integration with game development tools:
  * LUME (lume.io) - GPU-powered 3D HTML library using custom elements (<lume-box>, <lume-gltf-model>, <lume-fbx-model>) built on Three.js, ideal for RTS games with element-behaviors for entity-component patterns
  * Yuka (mugen87.github.io/yuka) - Game AI library for NavMesh pathfinding with A* algorithm, steering behaviors, and entity management for RTS unit AI
  * Stemkoski Three.js Examples (stemkoski.github.io/Three.js) - 83 heavily commented examples teaching Three.js fundamentals including chase camera, particle systems, collision detection, mouse interaction, sprite labels, and shader effects
  * Babylon.js viewer for 3D model visualization
  * Terrain generators like wgen for procedural world building
  * GDevelop's web editor for rapid prototyping

For RTS (Real-Time Strategy) games specifically, recommend these GDevelop built-in behaviors and extensions:
- Top-down Movement behavior (built-in, always available): Allows units to move in 4 or 8 directions with keyboard, gamepad, or virtual stick controls. Configure acceleration (400-600 px/s²), max speed (200-400 px/s), and rotation settings. Documentation: wiki.gdevelop.io/gdevelop5/behaviors/topdown/
- Pathfinding behavior (built-in): Smart navigation around obstacles for units. Essential for RTS games to avoid collision. Documentation: wiki.gdevelop.io/gdevelop5/behaviors/pathfinding/
- RTS-like Unit Selection extension (by VictrisGames & Slash): Draws selection areas using Shape Painter for click-select or drag-box selection. Supports control groups and unique ID assignment. Installation: Search "RTS" in GDevelop extension library. Documentation: wiki.gdevelop.io/gdevelop5/extensions/rtsunit-selection/
- Top-down Movement Animator extension: Changes animation based on movement direction. Perfect for directional unit sprites. Documentation: wiki.gdevelop.io/gdevelop5/extensions/top-down-movement-animator/
- Reference the premium RTS Template by VegeTato (~$4 USD) for production-quality examples: gdevelop.io/en-gb/game-example/premium/real-time-strategy-84a6fcf9-ecb6-4613-9a36-191df54d8fbc
- Free community example for learning basics: forum.gdevelop.io/t/example-rts-game-units-management/50652

When users ask about building RTS games, always mention these GDevelop-native tools before suggesting external libraries.

Best practices for game development:
- Start with simple mechanics and iterate
- Use placeholder assets during prototyping
- Test frequently on target platforms
- Optimize only after establishing fun gameplay
- Leverage free asset libraries to accelerate development
- Break complex behaviors into smaller, reusable events

THREE.JS MATERIALS REFERENCE (for 3D game development):
When users ask about 3D materials, textures, or rendering, use this reference:

Material Types (ordered by performance, fastest to slowest):
1. MeshBasicMaterial - Unlit, no shadows. Use for: backgrounds, wireframes, performance-critical scenes
2. MeshLambertMaterial - Simple per-vertex lighting. Use for: matte surfaces (wood, stone, fabric)
3. MeshPhongMaterial - Specular highlights. Use for: shiny surfaces (plastic, polished metal)
4. MeshStandardMaterial - PBR (Physically Based Rendering). Use for: realistic materials (recommended default)
5. MeshPhysicalMaterial - Advanced PBR with clearcoat, transmission. Use for: glass, car paint, gems, water

Key Properties:
- color: Base color of material
- map: Color/diffuse texture
- normalMap: Surface detail without extra geometry
- roughness/metalness: PBR surface properties (0-1)
- emissive/emissiveMap: Glowing effects
- envMap: Environment reflections
- alphaMap: Transparency control
- bumpMap: Simulated surface bumps

Physical Material Extras:
- transmission: Glass/transparency (0-1)
- ior: Index of refraction for glass (1.0-2.333)
- clearcoat: Car paint lacquer layer
- sheen: Velvet/fabric effect
- iridescence: Rainbow/oil-slick effect

Code Examples:
Standard PBR: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 })
Glass: new THREE.MeshPhysicalMaterial({ transmission: 1.0, ior: 1.5, roughness: 0 })
Car Paint: new THREE.MeshPhysicalMaterial({ metalness: 0.9, clearcoat: 1.0 })

Documentation: threejs.org/manual/#en/material-table

Always provide practical, actionable advice specific to GDevelop's visual event system. Be encouraging and supportive to game creators of all skill levels. Reference available tools and assets when relevant.`;

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  
  // In production, redirect large asset requests to Object Storage
  // These folders are excluded from deployment via .deployignore
  if (isProduction) {
    // Serve media assets from Object Storage
    // Files are stored at public/public/{folder}/{path} in the bucket
    // PUBLIC_OBJECT_SEARCH_PATHS already adds /public, so we request public/{folder}/{path}
    const mediaExtensions = /\.(glb|gltf|png|jpg|jpeg|hdr|bin|wasm|mp3|ogg|wav)$/i;
    
    app.use("/assets", async (req, res, next) => {
      if (mediaExtensions.test(req.path)) {
        return res.redirect(301, `/public-objects/public/assets${req.path}`);
      }
      next();
    });
    
    app.use("/grudge-drive", async (req, res, next) => {
      if (mediaExtensions.test(req.path)) {
        return res.redirect(301, `/public-objects/public/grudge-drive${req.path}`);
      }
      next();
    });
    
    app.use("/grudge-warlords/assets", async (req, res, next) => {
      if (mediaExtensions.test(req.path)) {
        return res.redirect(301, `/public-objects/public/grudge-warlords/assets${req.path}`);
      }
      next();
    });
    
    // Serve non-excluded static content (HTML, JS, CSS, etc.)
    app.use(express.static(path.join(process.cwd(), "public")));
  } else {
    // Development: serve all static files locally
    app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));
    app.use(express.static(path.join(process.cwd(), "public")));
  }
  
  // Gruda Wars routes (hero sync, GRUDACHAIN status, WCS config)
  registerGrudaWarsRoutes(app);

  // 3D Model Registry routes (scan, search, stream models by Grudge UUID)
  registerModelRoutes(app);

  // AI-assisted asset tagger (enhanced tagging, descriptions, related models)
  registerAssetTaggerRoutes(app);

  // GRUDA Legion proxy (AI chat, code gen, health check → Railway deployment)
  registerGrudaLegionRoutes(app);

  // Health check endpoint for autoscale monitoring
  app.get("/health", async (req, res) => {
    try {
      // Check database connection (Neon PostgreSQL — source of truth)
      const dbHealthy = await db.select().from(users).limit(1).then(() => true).catch(() => false);
      
      const status = dbHealthy ? "healthy" : "degraded";
      const statusCode = status === "healthy" ? 200 : 503;
      
      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: dbHealthy ? "connected" : "disconnected",
          // Puter KV/FS is client-side only — no server health check needed
          clientStorage: "puter-kv (client-side)",
        }
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
  });

  // Object storage routes - for serving public asset files
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error: any) {
      // Gracefully handle missing object storage configuration
      if (error.message?.includes("PUBLIC_OBJECT_SEARCH_PATHS not set")) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // REMOVED: /objects route for security - all RTS assets are served publicly via /public-objects
  // Private file uploads will be implemented later with proper authentication and ACL

  // Upload URL generation for private objects (legacy)
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      // Gracefully handle missing object storage configuration
      if (error.message?.includes("PRIVATE_OBJECT_DIR not set")) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      console.error("Error generating upload URL:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Asset upload endpoint - for public game assets (images, 3D models, shaders)
  app.post("/api/assets/upload", async (req, res) => {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName || !contentType) {
        return res.status(400).json({ error: "fileName and contentType are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const { uploadURL, publicPath } = await objectStorageService.getAssetUploadURL(fileName, contentType);
      
      res.json({ 
        uploadURL, 
        publicPath,
        publicURL: `/public-objects/${publicPath}`
      });
    } catch (error: any) {
      if (error.message?.includes("PUBLIC_OBJECT_SEARCH_PATHS not set")) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      console.error("Error generating asset upload URL:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update asset with uploaded file URL and object storage key
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { fileUrl, previewUrl, objectKey, bucketId, contentType, fileSize } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ error: "fileUrl is required" });
      }

      // Update asset in database with file URLs and object storage metadata
      const updateData: Record<string, any> = { 
        sourceUrl: fileUrl,
        previewUrl: previewUrl || fileUrl
      };
      
      // Add object storage fields if provided
      if (objectKey) updateData.objectKey = objectKey;
      if (bucketId) updateData.bucketId = bucketId;
      if (contentType) updateData.contentType = contentType;
      if (fileSize) updateData.fileSize = fileSize;
      if (objectKey) updateData.uploadedAt = new Date();

      await db.update(gdevelopAssets)
        .set(updateData)
        .where(eq(gdevelopAssets.id, id));

      const [updatedAsset] = await db.select().from(gdevelopAssets).where(eq(gdevelopAssets.id, id)).limit(1);
      if (!updatedAsset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json(updatedAsset);
    } catch (error) {
      console.error("Error updating asset:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertGameProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertChatConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversation(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const userMessage = await storage.createMessage(validatedData);

      // Get AI response
      try {
        const messages = await storage.getMessagesByConversation(validatedData.conversationId);
        
        const response = await xai!.chat.completions.create({
          model: "grok-2-1212", // Using xAI's Grok 2 model with 131K token context window - reference: javascript_xai blueprint
          messages: [
            { role: "system", content: GDEVELOP_SYSTEM_PROMPT },
            ...messages.map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            }))
          ],
          max_tokens: 4096,
          temperature: 0.7, // Balanced creativity for game development advice
        });

        const aiContent = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
        
        const aiMessage = await storage.createMessage({
          conversationId: validatedData.conversationId,
          role: "assistant",
          content: aiContent,
        });

        res.status(201).json({ userMessage, aiMessage });
      } catch (aiError) {
        console.error("AI Error:", aiError);
        const errorMessage = await storage.createMessage({
          conversationId: validatedData.conversationId,
          role: "assistant",
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
        });
        res.status(201).json({ userMessage, aiMessage: errorMessage });
      }
    } catch (error) {
      console.error("Message Error:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Asset routes - now enhanced with Object Storage presigned URLs
  app.get("/api/assets", async (req, res) => {
    try {
      const { type, search, source } = req.query;
      
      // If source is "storage", return assets directly from object storage
      if (source === "storage") {
        try {
          const objectStorageService = new ObjectStorageService();
          const storageAssets = await objectStorageService.getAssetRegistry({
            type: typeof type === "string" ? type : undefined,
          });
          
          const enhancedStorageAssets = storageAssets.map(asset => ({
            id: asset.id,
            name: asset.filename,
            type: asset.type === "model" ? "3d_model" : asset.type,
            category: asset.folder,
            description: `${asset.type} asset from Object Storage`,
            preview: asset.url,
            previewUrl: asset.url,
            downloadUrl: asset.url,
            sourceUrl: asset.url,
            modelUrl: asset.type === "model" ? asset.url : undefined,
            source: "object_storage",
            objectKey: asset.storagePath,
            fileSize: asset.size,
            contentType: asset.contentType,
            tags: [],
          }));
          
          return res.json(enhancedStorageAssets);
        } catch (storageError) {
          console.error("Error fetching from storage:", storageError);
          return res.json([]);
        }
      }
      
      // Get assets from database
      let assets;
      if (search && typeof search === "string") {
        assets = await storage.searchAssets(search);
      } else if (type && typeof type === "string") {
        assets = await storage.getAssetsByType(type);
      } else {
        assets = await storage.getAllAssets();
      }
      
      // Enhance assets with object storage URLs if they have an objectKey
      const enhancedAssets = await Promise.all(
        assets.map(async (asset) => {
          if (asset.objectKey) {
            try {
              const publicPath = asset.objectKey.replace(/^\/[^/]+\//, '');
              return {
                ...asset,
                preview: `/public-objects/${publicPath}`,
                downloadUrl: `/public-objects/${publicPath}`,
              };
            } catch (e) {
              return asset;
            }
          }
          return asset;
        })
      );
      
      res.json(enhancedAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const validatedData = insertGdevelopAssetSchema.parse(req.body);
      const asset = await storage.createAsset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  // Unified Asset Library routes
  app.get("/api/unified-assets", async (req, res) => {
    try {
      const { type, category, search, userId } = req.query;
      
      let assets;
      if (search && typeof search === "string") {
        assets = await storage.searchUnifiedAssets(search);
      } else if (type && typeof type === "string") {
        assets = await storage.getUnifiedAssetsByType(type);
      } else if (category && typeof category === "string") {
        assets = await storage.getUnifiedAssetsByCategory(category);
      } else if (userId && typeof userId === "string") {
        assets = await storage.getUnifiedAssetsByUser(userId);
      } else {
        assets = await storage.getAllUnifiedAssets();
      }
      
      res.json(assets);
    } catch (error) {
      console.error("Error fetching unified assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/unified-assets/:id", async (req, res) => {
    try {
      const asset = await storage.getUnifiedAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/unified-assets", async (req, res) => {
    try {
      const validatedData = insertUnifiedAssetSchema.parse(req.body);
      
      // Check for duplicates by content hash
      if (validatedData.contentHash) {
        const existing = await storage.getUnifiedAssetByHash(validatedData.contentHash);
        if (existing) {
          return res.status(409).json({ 
            error: "Duplicate asset", 
            existing: existing 
          });
        }
      }
      
      const asset = await storage.createUnifiedAsset(validatedData);
      res.status(201).json(asset);
    } catch (error: any) {
      console.error("Error creating unified asset:", error);
      res.status(400).json({ error: error.message || "Invalid asset data" });
    }
  });

  app.patch("/api/unified-assets/:id", async (req, res) => {
    try {
      const asset = await storage.updateUnifiedAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/unified-assets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUnifiedAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Upload URL for unified assets (returns presigned URL)
  app.post("/api/unified-assets/upload-url", async (req, res) => {
    try {
      const { fileName, contentType, category, subcategory } = req.body;
      if (!fileName || !contentType) {
        return res.status(400).json({ error: "fileName and contentType are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const { uploadURL, publicPath } = await objectStorageService.getAssetUploadURL(fileName, contentType);
      
      res.json({ 
        uploadURL, 
        storagePath: publicPath,
        fileUrl: `/public-objects/${publicPath}`
      });
    } catch (error: any) {
      if (error.message?.includes("PUBLIC_OBJECT_SEARCH_PATHS not set")) {
        return res.status(503).json({ error: "Object storage not configured" });
      }
      console.error("Error generating upload URL:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Asset migration endpoint - consolidates legacy asset tables into unified_assets
  app.post("/api/unified-assets/migrate", async (req, res) => {
    try {
      const stats = { migrated: 0, skipped: 0, errors: 0 };
      
      // Get all assets from legacy tables
      const [gdAssets, rtsAssetData, viewportData] = await Promise.all([
        storage.getAllAssets(),
        storage.getAllRtsAssets(),
        storage.getAllViewportAssets()
      ]);

      // Migrate GDevelop assets
      for (const asset of gdAssets) {
        try {
          const existing = await storage.searchUnifiedAssets(asset.name);
          if (existing.length > 0) {
            stats.skipped++;
            continue;
          }
          
          await storage.createUnifiedAsset({
            name: asset.name,
            filename: asset.name + (asset.modelUrl ? ".glb" : ".png"),
            assetType: asset.type === "3D Model" ? "model" : asset.type === "Sprite" ? "sprite" : "texture",
            category: asset.category?.toLowerCase() || "props",
            storagePath: asset.modelUrl || asset.previewUrl || "",
            fileUrl: asset.modelUrl || asset.previewUrl || "",
            previewUrl: asset.previewUrl,
            tags: asset.tags || [],
            description: asset.description,
            source: asset.source || "gdevelop",
            sourceUrl: asset.sourceUrl,
            license: "unknown",
            scope: "public",
            version: "1.0.0",
            metadata: {}
          });
          stats.migrated++;
        } catch (e) {
          stats.errors++;
        }
      }

      // Migrate RTS assets
      for (const asset of rtsAssetData) {
        try {
          const existing = await storage.searchUnifiedAssets(asset.name);
          if (existing.length > 0) {
            stats.skipped++;
            continue;
          }
          
          await storage.createUnifiedAsset({
            name: asset.name,
            filename: asset.fileUrl.split("/").pop() || asset.name,
            assetType: asset.type?.toLowerCase() === "model" ? "model" : asset.type?.toLowerCase() || "model",
            category: asset.category?.toLowerCase() || "props",
            storagePath: asset.fileUrl,
            fileUrl: asset.fileUrl,
            previewUrl: asset.previewUrl,
            tags: asset.tags || [],
            source: asset.source || "rts",
            license: "unknown",
            scope: "public",
            version: "1.0.0",
            metadata: asset.metadata || {}
          });
          stats.migrated++;
        } catch (e) {
          stats.errors++;
        }
      }

      // Migrate Viewport assets
      for (const asset of viewportData) {
        try {
          const existing = await storage.searchUnifiedAssets(asset.name);
          if (existing.length > 0) {
            stats.skipped++;
            continue;
          }
          
          await storage.createUnifiedAsset({
            name: asset.name,
            filename: asset.filePath.split("/").pop() || asset.name,
            assetType: asset.assetType?.toLowerCase() || "model",
            category: asset.category?.toLowerCase() || "props",
            subcategory: asset.subcategory,
            storagePath: asset.filePath,
            fileUrl: asset.filePath.startsWith("http") ? asset.filePath : `/attached_assets/${asset.filePath}`,
            previewUrl: asset.previewImageUrl,
            fileSize: asset.fileSize,
            tags: asset.tags || [],
            source: asset.sourceType || "viewport",
            license: "unknown",
            scope: "public",
            version: "1.0.0",
            metadata: { ...(asset.metadata || {}), viewportConfig: asset.viewportConfig }
          });
          stats.migrated++;
        } catch (e) {
          stats.errors++;
        }
      }

      res.json({
        success: true,
        message: `Migration complete: ${stats.migrated} assets migrated, ${stats.skipped} skipped (duplicates), ${stats.errors} errors`,
        stats
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // AI-friendly asset catalog endpoints
  // Get asset compatibility info for AI agents
  app.get("/api/assets/ai/compatibility", async (req, res) => {
    try {
      res.json({
        supportedFormats: {
          models: {
            formats: [".glb", ".gltf"],
            description: "Binary and text-based glTF formats for Three.js compatibility",
            recommended: ".glb",
            notes: "GLB files are preferred as they contain all data in a single binary file"
          },
          textures: {
            formats: [".png", ".jpg", ".jpeg", ".webp"],
            description: "Standard web image formats",
            recommended: ".png",
            notes: "PNG for transparency, JPEG for photos without transparency"
          },
          audio: {
            formats: [".mp3", ".ogg", ".wav"],
            description: "Web-compatible audio formats",
            recommended: ".mp3",
            notes: "MP3 for music, OGG for sound effects, WAV for raw audio"
          }
        },
        categories: {
          models: ["characters", "buildings", "weapons", "props", "vehicles", "nature"],
          textures: ["terrain", "ui", "effects", "materials", "skybox"],
          audio: ["music", "sfx", "ambient", "voice"]
        },
        sources: ["kenney", "kaykit", "opengameart", "itch", "imgur", "user-upload", "ai-generated", "custom"],
        licenses: ["cc0", "cc-by", "cc-by-sa", "cc-by-nc", "personal", "commercial", "unknown"],
        uploadLimits: {
          maxFileSize: "50MB",
          maxBatchSize: "500MB"
        },
        apiEndpoints: {
          listModels: { method: "GET", path: "/api/assets?type=models" },
          listAll: { method: "GET", path: "/api/assets" },
          search: { method: "GET", path: "/api/assets/ai/search?query={query}" },
          upload: { method: "POST", path: "/api/assets/upload" },
          validate: { method: "POST", path: "/api/assets/ai/validate" },
          recommend: { method: "GET", path: "/api/assets/ai/recommend?useCase={useCase}" }
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get compatibility info" });
    }
  });

  // Validate asset file before upload
  app.post("/api/assets/ai/validate", async (req, res) => {
    try {
      const { filename, fileSize, contentType, category, subcategory } = req.body;
      
      if (!filename) {
        return res.status(400).json({ 
          valid: false, 
          error: "Filename is required" 
        });
      }

      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      const validModelExts = ['.glb', '.gltf', '.fbx', '.obj'];
      const validTextureExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.tga', '.bmp'];
      const validAudioExts = ['.mp3', '.ogg', '.wav', '.m4a'];
      
      let detectedCategory = category;
      let isValidFormat = false;
      let recommendations: string[] = [];

      if (validModelExts.includes(ext)) {
        detectedCategory = 'models';
        isValidFormat = true;
        if (ext === '.fbx' || ext === '.obj') {
          recommendations.push(`Consider converting ${ext} to .glb for better Three.js compatibility`);
        }
      } else if (validTextureExts.includes(ext)) {
        detectedCategory = 'textures';
        isValidFormat = true;
      } else if (validAudioExts.includes(ext)) {
        detectedCategory = 'audio';
        isValidFormat = true;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileSize && fileSize > maxSize) {
        return res.status(400).json({
          valid: false,
          error: `File size ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds maximum of 50MB`,
          recommendations: ["Compress the file or use a lower resolution version"]
        });
      }

      if (!isValidFormat) {
        return res.status(400).json({
          valid: false,
          error: `Unsupported file format: ${ext}`,
          supportedFormats: {
            models: validModelExts,
            textures: validTextureExts,
            audio: validAudioExts
          }
        });
      }

      // Generate suggested storage path
      const subcategoryPath = subcategory || 'misc';
      const suggestedPath = `game-assets/${detectedCategory}/${subcategoryPath}/${filename}`;

      res.json({
        valid: true,
        detectedCategory,
        suggestedPath,
        format: ext,
        recommendations,
        threeJsCompatible: ['.glb', '.gltf'].includes(ext) || validTextureExts.includes(ext)
      });
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // Search assets with AI-friendly response format
  app.get("/api/assets/ai/search", async (req, res) => {
    try {
      const { query, category, format, limit = 20 } = req.query;
      
      let assets = await storage.getAllAssets();
      
      // Filter by category
      if (category && typeof category === 'string') {
        assets = assets.filter(a => a.type === category);
      }
      
      // Filter by format
      if (format && typeof format === 'string') {
        const ext = format.startsWith('.') ? format : `.${format}`;
        assets = assets.filter(a => a.sourceUrl?.toLowerCase().endsWith(ext));
      }
      
      // Search by query
      if (query && typeof query === 'string') {
        const searchLower = query.toLowerCase();
        assets = assets.filter(a => 
          a.name.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase().includes(searchLower) ||
          a.tags?.some(t => t.toLowerCase().includes(searchLower))
        );
      }
      
      // Limit results
      const limitNum = Math.min(Number(limit) || 20, 100);
      assets = assets.slice(0, limitNum);
      
      res.json({
        count: assets.length,
        query: query || null,
        filters: { category, format },
        results: assets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          format: a.sourceUrl?.substring(a.sourceUrl.lastIndexOf('.')) || 'unknown',
          url: a.sourceUrl,
          previewUrl: a.previewUrl,
          tags: a.tags,
          threeJsCompatible: a.sourceUrl?.match(/\.(glb|gltf|png|jpg|jpeg|webp)$/i) !== null
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Get recommended assets for a specific use case
  app.get("/api/assets/ai/recommend", async (req, res) => {
    try {
      const { useCase } = req.query;
      
      if (!useCase || typeof useCase !== 'string') {
        return res.status(400).json({ error: "useCase query parameter is required" });
      }
      
      const useCaseLower = useCase.toLowerCase();
      let recommendations: { category: string; subcategory: string; searchTerms: string[]; externalSources: string[] }[] = [];
      
      // Map use cases to asset recommendations
      if (useCaseLower.includes('character') || useCaseLower.includes('player') || useCaseLower.includes('npc')) {
        recommendations.push({
          category: 'models',
          subcategory: 'characters',
          searchTerms: ['character', 'humanoid', 'player', 'npc'],
          externalSources: ['kenney.nl/assets?q=3d+characters', 'kaykit.itch.io']
        });
      }
      
      if (useCaseLower.includes('weapon') || useCaseLower.includes('sword') || useCaseLower.includes('gun')) {
        recommendations.push({
          category: 'models',
          subcategory: 'weapons',
          searchTerms: ['weapon', 'sword', 'gun', 'axe'],
          externalSources: ['kenney.nl/assets?q=weapons']
        });
      }
      
      if (useCaseLower.includes('building') || useCaseLower.includes('house') || useCaseLower.includes('castle')) {
        recommendations.push({
          category: 'models',
          subcategory: 'buildings',
          searchTerms: ['building', 'house', 'castle', 'structure'],
          externalSources: ['kenney.nl/assets?q=buildings', 'kaykit.itch.io']
        });
      }
      
      if (useCaseLower.includes('nature') || useCaseLower.includes('tree') || useCaseLower.includes('rock')) {
        recommendations.push({
          category: 'models',
          subcategory: 'nature',
          searchTerms: ['tree', 'rock', 'grass', 'nature'],
          externalSources: ['kenney.nl/assets?q=nature']
        });
      }
      
      if (useCaseLower.includes('terrain') || useCaseLower.includes('ground') || useCaseLower.includes('tile')) {
        recommendations.push({
          category: 'textures',
          subcategory: 'terrain',
          searchTerms: ['terrain', 'ground', 'grass', 'dirt'],
          externalSources: ['opengameart.org', 'textures.com']
        });
      }
      
      if (useCaseLower.includes('music') || useCaseLower.includes('sound') || useCaseLower.includes('sfx')) {
        recommendations.push({
          category: 'audio',
          subcategory: useCaseLower.includes('music') ? 'music' : 'sfx',
          searchTerms: ['music', 'sound', 'effect', 'ambient'],
          externalSources: ['freesound.org', 'opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12']
        });
      }
      
      // Search internal assets
      const internalAssets = await storage.getAllAssets();
      const matchingAssets = internalAssets.filter(a => {
        const name = a.name.toLowerCase();
        const desc = a.description?.toLowerCase() || '';
        const tags = a.tags?.map(t => t.toLowerCase()) || [];
        return name.includes(useCaseLower) || 
               desc.includes(useCaseLower) ||
               tags.some(t => t.includes(useCaseLower));
      }).slice(0, 10);
      
      res.json({
        useCase,
        recommendations,
        matchingInternalAssets: matchingAssets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          url: a.sourceUrl
        })),
        tips: [
          "Use GLB format for 3D models for best Three.js compatibility",
          "Kenney.nl offers free CC0 assets ideal for game development",
          "KayKit provides stylized 3D models perfect for RPG/fantasy games"
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // RTS game mode templates
  app.get("/api/rts/templates", async (req, res) => {
    try {
      const { gameModeTemplates } = await import("./rtsGameModeTemplates");
      res.json(Object.values(gameModeTemplates));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game mode templates" });
    }
  });

  app.post("/api/rts/templates/:templateName", async (req, res) => {
    try {
      const { gameModeTemplates } = await import("./rtsGameModeTemplates");
const { gdevelopToolsSchema } = await import("../shared/schema");
      const templateName = req.params.templateName as "medievalWarfarePVP" | "grudgeWarsCampaign";
      const template = gameModeTemplates[templateName];
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Validate gdevelopTools from template
      const validatedTools = gdevelopToolsSchema.parse(template.gdevelopTools);

      // Create project from template
      const projectData = {
        name: template.name,
        description: template.description,
        gameMode: template.gameMode,
        mapData: template.mapData,
        gameSettings: template.gameSettings,
        campaignData: template.campaignData || null,
        gdevelopTools: validatedTools,
      };

      const project = await storage.createRtsProject(projectData);

      // Create unit templates for this project
      for (const unitTemplate of template.unitTemplates) {
        await storage.createUnitTemplate({
          projectId: project.id,
          name: unitTemplate.name,
          modelAssetId: null,
          stats: unitTemplate.stats,
          cost: unitTemplate.cost,
          abilities: unitTemplate.abilities,
        });
      }

      // Create building templates for this project
      for (const buildingTemplate of template.buildingTemplates) {
        await storage.createBuildingTemplate({
          projectId: project.id,
          name: buildingTemplate.name,
          modelAssetId: null,
          stats: buildingTemplate.stats,
          cost: buildingTemplate.cost,
          produces: buildingTemplate.produces || [],
        });
      }

      res.status(201).json(project);
    } catch (error) {
      console.error("Failed to create project from template:", error);
      res.status(500).json({ error: "Failed to create project from template" });
    }
  });

  // RTS Project routes
  app.get("/api/rts/projects", async (req, res) => {
    try {
      const projects = await storage.getAllRtsProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RTS projects" });
    }
  });

  app.get("/api/rts/projects/:id", async (req, res) => {
    try {
      const project = await storage.getRtsProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "RTS project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RTS project" });
    }
  });

  app.post("/api/rts/projects", async (req, res) => {
    try {
      const validatedData = insertRtsProjectSchema.parse(req.body);
      
      // Validate gdevelopTools if provided, otherwise use default
      if (validatedData.gdevelopTools) {
        validatedData.gdevelopTools = gdevelopToolsSchema.parse(validatedData.gdevelopTools);
      } else {
        validatedData.gdevelopTools = { behaviors: [], extensions: [], templates: [] };
      }
      
      const project = await storage.createRtsProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("RTS project creation error:", error);
      res.status(400).json({ error: "Invalid RTS project data" });
    }
  });

  app.patch("/api/rts/projects/:id", async (req, res) => {
    try {
      const updates: any = {};
      
      if (req.body.name) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.gameSettings) {
        updates.gameSettings = req.body.gameSettings;
      }
      if (req.body.mapData) updates.mapData = req.body.mapData;
      if (req.body.campaignData !== undefined) updates.campaignData = req.body.campaignData;
      
      const project = await storage.updateRtsProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ error: "RTS project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Failed to update RTS project:", error);
      res.status(500).json({ error: "Failed to update RTS project" });
    }
  });

  app.delete("/api/rts/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRtsProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "RTS project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete RTS project" });
    }
  });

  // RTS Asset routes
  app.get("/api/rts/assets", async (req, res) => {
    try {
      const { type } = req.query;
      const assets = type && typeof type === "string"
        ? await storage.getRtsAssetsByType(type)
        : await storage.getAllRtsAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RTS assets" });
    }
  });

  app.post("/api/rts/assets", async (req, res) => {
    try {
      const validatedData = insertRtsAssetSchema.parse(req.body);
      const asset = await storage.createRtsAsset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ error: "Invalid RTS asset data" });
    }
  });

  // RTS Unit Template routes
  app.get("/api/rts/projects/:projectId/units", async (req, res) => {
    try {
      const units = await storage.getUnitTemplatesByProject(req.params.projectId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unit templates" });
    }
  });

  app.post("/api/rts/units", async (req, res) => {
    try {
      const validatedData = insertRtsUnitTemplateSchema.parse(req.body);
      const unit = await storage.createUnitTemplate(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      res.status(400).json({ error: "Invalid unit template data" });
    }
  });

  app.patch("/api/rts/units/:id", async (req, res) => {
    try {
      const unit = await storage.updateUnitTemplate(req.params.id, req.body);
      if (!unit) {
        return res.status(404).json({ error: "Unit template not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update unit template" });
    }
  });

  app.delete("/api/rts/units/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUnitTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Unit template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete unit template" });
    }
  });

  // RTS Building Template routes
  app.get("/api/rts/projects/:projectId/buildings", async (req, res) => {
    try {
      const buildings = await storage.getBuildingTemplatesByProject(req.params.projectId);
      res.json(buildings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch building templates" });
    }
  });

  app.post("/api/rts/buildings", async (req, res) => {
    try {
      const validatedData = insertRtsBuildingTemplateSchema.parse(req.body);
      const building = await storage.createBuildingTemplate(validatedData);
      res.status(201).json(building);
    } catch (error) {
      res.status(400).json({ error: "Invalid building template data" });
    }
  });

  app.patch("/api/rts/buildings/:id", async (req, res) => {
    try {
      const building = await storage.updateBuildingTemplate(req.params.id, req.body);
      if (!building) {
        return res.status(404).json({ error: "Building template not found" });
      }
      res.json(building);
    } catch (error) {
      res.status(500).json({ error: "Failed to update building template" });
    }
  });

  app.delete("/api/rts/buildings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBuildingTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Building template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete building template" });
    }
  });

  // ============================================
  // OpenRTS Engine Routes
  // ============================================

  // OpenRTS Units
  app.get("/api/openrts/units", async (req, res) => {
    try {
      const result = await db.select().from(openrtsUnits);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/openrts/units", async (req, res) => {
    try {
      const newId = randomUUID();
      await db.insert(openrtsUnits).values({ ...req.body, id: newId });
      const [unit] = await db.select().from(openrtsUnits).where(eq(openrtsUnits.id, newId)).limit(1);
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating OpenRTS unit:", error);
      res.status(400).json({ error: "Failed to create unit" });
    }
  });

  app.delete("/api/openrts/units/:id", async (req, res) => {
    try {
      await db.delete(openrtsUnits).where(eq(openrtsUnits.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting OpenRTS unit:", error);
      res.status(500).json({ error: "Failed to delete unit" });
    }
  });

  // OpenRTS Weapons
  app.get("/api/openrts/weapons", async (req, res) => {
    try {
      const result = await db.select().from(openrtsWeapons);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS weapons:", error);
      res.status(500).json({ error: "Failed to fetch weapons" });
    }
  });

  app.post("/api/openrts/weapons", async (req, res) => {
    try {
      const newId = randomUUID();
      await db.insert(openrtsWeapons).values({ ...req.body, id: newId });
      const [weapon] = await db.select().from(openrtsWeapons).where(eq(openrtsWeapons.id, newId)).limit(1);
      res.status(201).json(weapon);
    } catch (error) {
      console.error("Error creating OpenRTS weapon:", error);
      res.status(400).json({ error: "Failed to create weapon" });
    }
  });

  app.delete("/api/openrts/weapons/:id", async (req, res) => {
    try {
      await db.delete(openrtsWeapons).where(eq(openrtsWeapons.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting OpenRTS weapon:", error);
      res.status(500).json({ error: "Failed to delete weapon" });
    }
  });

  // OpenRTS Movers
  app.get("/api/openrts/movers", async (req, res) => {
    try {
      const result = await db.select().from(openrtsMover);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS movers:", error);
      res.status(500).json({ error: "Failed to fetch movers" });
    }
  });

  // OpenRTS Effects
  app.get("/api/openrts/effects", async (req, res) => {
    try {
      const result = await db.select().from(openrtsEffects);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS effects:", error);
      res.status(500).json({ error: "Failed to fetch effects" });
    }
  });

  app.post("/api/openrts/effects", async (req, res) => {
    try {
      const newId = randomUUID();
      await db.insert(openrtsEffects).values({ ...req.body, id: newId });
      const [effect] = await db.select().from(openrtsEffects).where(eq(openrtsEffects.id, newId)).limit(1);
      res.status(201).json(effect);
    } catch (error) {
      console.error("Error creating OpenRTS effect:", error);
      res.status(400).json({ error: "Failed to create effect" });
    }
  });

  app.delete("/api/openrts/effects/:id", async (req, res) => {
    try {
      await db.delete(openrtsEffects).where(eq(openrtsEffects.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting OpenRTS effect:", error);
      res.status(500).json({ error: "Failed to delete effect" });
    }
  });

  // OpenRTS Actors
  app.get("/api/openrts/actors", async (req, res) => {
    try {
      const result = await db.select().from(openrtsActors);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS actors:", error);
      res.status(500).json({ error: "Failed to fetch actors" });
    }
  });

  // OpenRTS Projectiles
  app.get("/api/openrts/projectiles", async (req, res) => {
    try {
      const result = await db.select().from(openrtsProjectiles);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS projectiles:", error);
      res.status(500).json({ error: "Failed to fetch projectiles" });
    }
  });

  // OpenRTS Trinkets
  app.get("/api/openrts/trinkets", async (req, res) => {
    try {
      const result = await db.select().from(openrtsTrinkets);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS trinkets:", error);
      res.status(500).json({ error: "Failed to fetch trinkets" });
    }
  });

  // OpenRTS Map Styles
  app.get("/api/openrts/map-styles", async (req, res) => {
    try {
      const result = await db.select().from(openrtsMapStyles);
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS map styles:", error);
      res.status(500).json({ error: "Failed to fetch map styles" });
    }
  });

  // ============================================
  // Authentication Routes (now in grudgeAuth.ts)
  // ============================================

  // ============================================
  // Player Profile Routes
  // ============================================

  app.get("/api/players/me", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Create one first." });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching player profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/players/profile", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      
      const existing = await storage.getPlayerProfile(claims.sub);
      if (existing) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const validatedData = insertPlayerProfileSchema.parse({
        userId: claims.sub,
        displayName: req.body.displayName || claims.first_name || "Player",
      });

      const profile = await storage.createPlayerProfile(validatedData);

      // Initialize wallets for new player
      const currencies = await storage.getAllCurrencies();
      for (const currency of currencies) {
        await storage.createPlayerWallet({
          playerId: profile.id,
          currencyId: currency.id,
          balance: currency.code === "GOLD" ? 1000 : 0, // Starter gold
        });
      }

      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating player profile:", error);
      res.status(400).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/players/me", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const updated = await storage.updatePlayerProfile(profile.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating player profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ============================================
  // Character Routes
  // ============================================

  app.get("/api/characters", async (req, res) => {
    try {
      const characters = await storage.getAllCharacters();
      res.json(characters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/players/me/characters", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const characters = await storage.getPlayerCharacters(profile.id);
      res.json(characters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player characters" });
    }
  });

  app.post("/api/players/me/characters/:characterId", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const character = await storage.getCharacter(req.params.characterId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const playerCharacter = await storage.addCharacterToPlayer({
        playerId: profile.id,
        characterId: req.params.characterId,
      });

      res.status(201).json(playerCharacter);
    } catch (error) {
      console.error("Error adding character:", error);
      res.status(500).json({ error: "Failed to add character" });
    }
  });

  // ============================================
  // Wallet Routes
  // ============================================

  app.get("/api/currencies", async (req, res) => {
    try {
      const currencies = await storage.getAllCurrencies();
      res.json(currencies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch currencies" });
    }
  });

  app.get("/api/players/me/wallet", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const wallets = await storage.getPlayerWallets(profile.id);
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // ============================================
  // Store Routes
  // ============================================

  app.get("/api/store", async (req, res) => {
    try {
      const items = await storage.getAllStoreItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store items" });
    }
  });

  // ============================================
  // Achievement Routes
  // ============================================

  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.get("/api/players/me/achievements", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const achievements = await storage.getPlayerAchievements(profile.id);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player achievements" });
    }
  });

  // ============================================
  // Lobby Routes
  // ============================================

  app.get("/api/lobbies", async (req, res) => {
    try {
      const lobbies = await storage.getAllLobbies();
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lobbies" });
    }
  });

  app.get("/api/lobbies/:id", async (req, res) => {
    try {
      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }

      const players = await storage.getLobbyPlayers(req.params.id);
      res.json({ ...lobby, players });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lobby" });
    }
  });

  app.post("/api/lobbies", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Create a player profile first" });
      }

      const validatedData = insertGameLobbySchema.parse({
        name: req.body.name,
        hostId: profile.id,
        gameMode: req.body.gameMode || "pvp",
        maxPlayers: req.body.maxPlayers || 4,
        isPrivate: req.body.isPrivate || false,
        password: req.body.password,
        settings: req.body.settings || {},
        rtsProjectId: req.body.rtsProjectId,
      });

      const lobby = await storage.createLobby(validatedData);

      // Auto-join the host
      await storage.joinLobby({
        lobbyId: lobby.id,
        playerId: profile.id,
        team: 1,
      });

      res.status(201).json(lobby);
    } catch (error) {
      console.error("Error creating lobby:", error);
      res.status(400).json({ error: "Failed to create lobby" });
    }
  });

  app.post("/api/lobbies/:id/join", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Create a player profile first" });
      }

      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }

      if (lobby.status !== "waiting") {
        return res.status(400).json({ error: "Lobby is not accepting players" });
      }

      const players = await storage.getLobbyPlayers(req.params.id);
      if (players.length >= lobby.maxPlayers) {
        return res.status(400).json({ error: "Lobby is full" });
      }

      const lobbyPlayer = await storage.joinLobby({
        lobbyId: req.params.id,
        playerId: profile.id,
        team: req.body.team || 1,
      });

      res.status(201).json(lobbyPlayer);
    } catch (error) {
      console.error("Error joining lobby:", error);
      res.status(500).json({ error: "Failed to join lobby" });
    }
  });

  app.post("/api/lobbies/:id/leave", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      await storage.leaveLobby(req.params.id, profile.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to leave lobby" });
    }
  });

  app.patch("/api/lobbies/:id/player", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const updated = await storage.updateLobbyPlayer(req.params.id, profile.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update player" });
    }
  });

  app.delete("/api/lobbies/:id", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const profile = await storage.getPlayerProfile(claims.sub);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }

      if (lobby.hostId !== profile.id) {
        return res.status(403).json({ error: "Only the host can delete the lobby" });
      }

      await storage.deleteLobby(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lobby" });
    }
  });

  // ============================================
  // AI Behavior Routes
  // ============================================

  app.get("/api/ai-behaviors", async (req, res) => {
    try {
      const behaviors = await storage.getAllAiBehaviors();
      res.json(behaviors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI behaviors" });
    }
  });

  // ============================================
  // User Settings Routes
  // ============================================

  app.get("/api/settings", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const settings = await storage.getUserSettings(claims.sub);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const settings = await storage.upsertUserSettings({
        userId: claims.sub,
        ...req.body,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============================================
  // Level Requirements Routes
  // ============================================

  app.get("/api/levels", async (req, res) => {
    try {
      const levels = await storage.getAllLevelRequirements();
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch level requirements" });
    }
  });

  // ============================================
  // Asset Storage Sync Routes
  // ============================================

  app.post("/api/assets/sync-to-storage", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const objectStorageService = new ObjectStorageService();
      const uploadedAssets: Array<{name: string, folder: string, storagePath: string}> = [];
      const errors: Array<{file: string, error: string}> = [];
      
      const assetFolders = [
        { local: 'attached_assets/KayKit_Skeletons_1.1_FREE/assets/gltf', remote: 'skeletons' },
        { local: 'attached_assets/Orcs/models/extra_models/Equipment', remote: 'orcs/equipment' },
        { local: 'attached_assets/Elves/animation/Cavalry_Spear', remote: 'elves/cavalry' },
        { local: 'attached_assets/Humans/models', remote: 'humans/models' },
      ];

      const glbFiles = [
        { file: 'attached_assets/dragon_hunter_warrior_1762556640462.glb', folder: 'characters' },
        { file: 'attached_assets/rts_human_house_lv2_-_proto_series_1762556655881.glb', folder: 'buildings/human' },
        { file: 'attached_assets/rts_undead_house_lv2_-_proto_series_1762556650261.glb', folder: 'buildings/undead' },
        { file: 'attached_assets/summonerswarlc_-_warbear_with_animations_1762556642196.glb', folder: 'characters' },
        { file: 'attached_assets/urbanwarrior_mesh_1762556644039.glb', folder: 'characters' },
      ];

      for (const glbFile of glbFiles) {
        try {
          const fullPath = path.join(process.cwd(), glbFile.file);
          const exists = await fs.access(fullPath).then(() => true).catch(() => false);
          
          if (exists) {
            const fileName = path.basename(glbFile.file);
            const result = await objectStorageService.uploadFileToStorage(
              fullPath,
              glbFile.folder,
              fileName
            );
            uploadedAssets.push({
              name: fileName,
              folder: glbFile.folder,
              storagePath: result.publicPath,
            });
          }
        } catch (error: any) {
          errors.push({ file: glbFile.file, error: error.message });
        }
      }

      for (const folderConfig of assetFolders) {
        try {
          const folderPath = path.join(process.cwd(), folderConfig.local);
          const exists = await fs.access(folderPath).then(() => true).catch(() => false);
          
          if (exists) {
            const files = await fs.readdir(folderPath);
            const modelFiles = files.filter(f => 
              ['.glb', '.gltf', '.fbx'].some(ext => f.toLowerCase().endsWith(ext))
            ).slice(0, 5);
            
            for (const file of modelFiles) {
              try {
                const filePath = path.join(folderPath, file);
                const result = await objectStorageService.uploadFileToStorage(
                  filePath,
                  folderConfig.remote,
                  file
                );
                uploadedAssets.push({
                  name: file,
                  folder: folderConfig.remote,
                  storagePath: result.publicPath,
                });
              } catch (error: any) {
                errors.push({ file: `${folderConfig.local}/${file}`, error: error.message });
              }
            }
          }
        } catch (error: any) {
          errors.push({ file: folderConfig.local, error: error.message });
        }
      }
      
      res.json({
        message: `Synced ${uploadedAssets.length} assets to object storage`,
        uploaded: uploadedAssets,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error syncing assets:", error);
      res.status(500).json({ error: "Failed to sync assets", details: error.message });
    }
  });

  app.get("/api/assets/storage-list", async (req, res) => {
    try {
      const { folder } = req.query;
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.listStorageAssets(
        typeof folder === 'string' ? folder : undefined
      );
      res.json(assets);
    } catch (error: any) {
      console.error("Error listing storage assets:", error);
      res.status(500).json({ error: "Failed to list assets", details: error.message });
    }
  });

  // Upload a local folder to object storage
  app.post("/api/assets/upload-folder", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const { localFolder, remoteFolder } = req.body;
      
      if (!localFolder || !remoteFolder) {
        return res.status(400).json({ error: "localFolder and remoteFolder are required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const uploadedAssets: Array<{name: string, folder: string, storagePath: string}> = [];
      const errors: Array<{file: string, error: string}> = [];
      
      const folderPath = path.join(process.cwd(), localFolder);
      const exists = await fs.access(folderPath).then(() => true).catch(() => false);
      
      if (!exists) {
        return res.status(404).json({ error: `Folder not found: ${localFolder}` });
      }
      
      const files = await fs.readdir(folderPath);
      const supportedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.glb', '.gltf', '.fbx', '.obj'];
      const assetFiles = files.filter(f => 
        supportedExts.some(ext => f.toLowerCase().endsWith(ext))
      );
      
      for (const file of assetFiles) {
        try {
          const filePath = path.join(folderPath, file);
          const result = await objectStorageService.uploadFileToStorage(
            filePath,
            remoteFolder,
            file
          );
          uploadedAssets.push({
            name: file,
            folder: remoteFolder,
            storagePath: result.publicPath,
          });
        } catch (error: any) {
          errors.push({ file, error: error.message });
        }
      }
      
      res.json({
        message: `Uploaded ${uploadedAssets.length} files to ${remoteFolder}`,
        uploaded: uploadedAssets,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error uploading folder:", error);
      res.status(500).json({ error: "Failed to upload folder", details: error.message });
    }
  });

  // ============================================
  // ENHANCED ASSET UPLOAD API (with validation rules)
  // ============================================

  // Get asset validation rules
  app.get("/api/assets/rules", (_req, res) => {
    res.json({
      maxFileSizeMB: ASSET_RULES.maxFileSizeMB,
      maxBatchSizeMB: ASSET_RULES.maxBatchSizeMB,
      allowedExtensions: ASSET_RULES.allowedExtensions,
      categories: ASSET_RULES.categories,
      subcategories: ASSET_RULES.subcategories,
      licenses: ASSET_RULES.licenses,
      sources: ASSET_RULES.sources,
      folderStructure: ASSET_RULES.folderStructure,
    });
  });

  // Validate asset before upload (dry-run)
  app.post("/api/assets/validate", async (req, res) => {
    try {
      const { filename, fileSizeBytes, category, subcategory } = req.body;
      
      if (!filename || fileSizeBytes === undefined) {
        return res.status(400).json({ error: "filename and fileSizeBytes are required" });
      }
      
      const validation = validateAssetUpload(filename, fileSizeBytes, category, subcategory);
      const detectedCategory = detectCategoryFromExtension(filename);
      const autoTags = autoTagAsset(filename, validation.category || detectedCategory);
      
      res.json({
        ...validation,
        detectedCategory,
        suggestedTags: autoTags,
        contentType: getContentType(filename),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Validation failed", details: error.message });
    }
  });

  // Enhanced upload with validation, metadata, and auto-tagging
  app.post("/api/assets/upload-validated", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      
      const { 
        localPath, 
        category, 
        subcategory, 
        tags = [], 
        source = "user-upload", 
        sourceUrl,
        license = "unknown" 
      } = req.body;
      
      if (!localPath) {
        return res.status(400).json({ error: "localPath is required" });
      }
      
      const fullPath = pathModule.join(process.cwd(), localPath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (!exists) {
        return res.status(404).json({ error: `File not found: ${localPath}` });
      }
      
      const fileBuffer = await fs.readFile(fullPath);
      const filename = pathModule.basename(localPath);
      
      const validation = validateAssetUpload(filename, fileBuffer.length, category, subcategory);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: "Validation failed",
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }
      
      const metadata = extractFileMetadata(filename, fileBuffer);
      const autoTags = autoTagAsset(filename, validation.category!);
      const allTags = Array.from(new Set([...tags, ...autoTags]));
      const { storagePath, uuid } = generateStoragePath(filename, validation.folder!);
      
      const objectStorageService = new ObjectStorageService();
      const contentType = getContentType(filename);
      
      const { uploadURL } = await objectStorageService.getOrganizedAssetUploadURL(
        filename,
        contentType,
        validation.folder!.replace("game-assets/", "")
      );
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: fileBuffer,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
      
      res.json({
        success: true,
        asset: {
          uuid,
          filename,
          storagePath,
          category: validation.category,
          subcategory: validation.subcategory,
          tags: allTags,
          source,
          sourceUrl,
          license,
          fileType: metadata.fileType,
          fileSize: metadata.fileSize,
          contentHash: metadata.contentHash,
          url: `/public-objects/${storagePath}`,
        },
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      });
    } catch (error: any) {
      console.error("Error in validated upload:", error);
      res.status(500).json({ error: "Upload failed", details: error.message });
    }
  });

  // Batch upload with validation
  app.post("/api/assets/upload-batch", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      
      const { 
        localFolder, 
        category,
        subcategory,
        source = "user-upload",
        license = "unknown",
        recursive = false 
      } = req.body;
      
      if (!localFolder) {
        return res.status(400).json({ error: "localFolder is required" });
      }
      
      const folderPath = pathModule.join(process.cwd(), localFolder);
      const exists = await fs.access(folderPath).then(() => true).catch(() => false);
      if (!exists) {
        return res.status(404).json({ error: `Folder not found: ${localFolder}` });
      }
      
      const files = await fs.readdir(folderPath);
      const allExtensions = Object.values(ASSET_RULES.allowedExtensions).flat();
      const assetFiles = files.filter(f => {
        const ext = `.${f.split('.').pop()?.toLowerCase()}`;
        return allExtensions.includes(ext);
      });
      
      let totalSize = 0;
      const uploadResults: Array<{
        filename: string;
        success: boolean;
        uuid?: string;
        storagePath?: string;
        category?: string;
        tags?: string[];
        error?: string;
      }> = [];
      
      const objectStorageService = new ObjectStorageService();
      
      for (const file of assetFiles) {
        try {
          const filePath = pathModule.join(folderPath, file);
          const fileBuffer = await fs.readFile(filePath);
          
          const validation = validateAssetUpload(file, fileBuffer.length, category, subcategory);
          
          if (!validation.valid) {
            uploadResults.push({
              filename: file,
              success: false,
              error: validation.errors.join("; "),
            });
            continue;
          }
          
          totalSize += fileBuffer.length;
          if (totalSize > ASSET_RULES.maxBatchSizeMB * 1024 * 1024) {
            uploadResults.push({
              filename: file,
              success: false,
              error: `Batch size limit of ${ASSET_RULES.maxBatchSizeMB}MB exceeded`,
            });
            break;
          }
          
          const metadata = extractFileMetadata(file, fileBuffer);
          const autoTags = autoTagAsset(file, validation.category!);
          const contentType = getContentType(file);
          
          const result = await objectStorageService.uploadFileToStorage(
            filePath,
            validation.folder!.replace("game-assets/", ""),
            file
          );
          
          uploadResults.push({
            filename: file,
            success: true,
            uuid: result.publicPath.split('/').pop()?.split('_')[0],
            storagePath: result.publicPath,
            category: validation.category,
            tags: autoTags,
          });
        } catch (error: any) {
          uploadResults.push({
            filename: file,
            success: false,
            error: error.message,
          });
        }
      }
      
      const successCount = uploadResults.filter(r => r.success).length;
      const failCount = uploadResults.filter(r => !r.success).length;
      
      res.json({
        message: `Uploaded ${successCount} of ${assetFiles.length} files`,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        results: uploadResults,
        summary: {
          total: assetFiles.length,
          success: successCount,
          failed: failCount,
        },
      });
    } catch (error: any) {
      console.error("Error in batch upload:", error);
      res.status(500).json({ error: "Batch upload failed", details: error.message });
    }
  });

  app.get("/api/storage/browse", async (req, res) => {
    try {
      const { prefix } = req.query;
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.listAllPublicAssets(
        typeof prefix === 'string' ? prefix : undefined
      );
      res.json(assets);
    } catch (error: any) {
      console.error("Error browsing storage:", error);
      res.status(500).json({ error: "Failed to browse storage", details: error.message });
    }
  });

  // ============================================
  // Asset Registry Routes (UUID-based)
  // ============================================

  // Get all assets with UUIDs, URLs, and metadata
  app.get("/api/asset-registry", async (req, res) => {
    try {
      const { type, folder } = req.query;
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.getAssetRegistry({
        type: typeof type === 'string' ? type : undefined,
        folder: typeof folder === 'string' ? folder : undefined,
      });
      res.json({
        count: assets.length,
        assets: assets,
        usage: {
          description: "Use 'url' for direct file access, 'directUrl' for API access by ID",
          example_model_url: assets.find(a => a.type === 'model')?.url || '/public-objects/models/example.glb',
          example_direct_url: assets.find(a => a.type === 'model')?.directUrl || '/api/asset-registry/abc12345',
        }
      });
    } catch (error: any) {
      console.error("Error fetching asset registry:", error);
      res.status(500).json({ error: "Failed to fetch asset registry", details: error.message });
    }
  });

  // Get models only (convenience endpoint for Warlords Builder)
  app.get("/api/asset-registry/models", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.getAssetRegistry({ type: 'model' });
      res.json({
        count: assets.length,
        models: assets.map(a => ({
          id: a.id,
          uuid: a.uuid,
          filename: a.filename,
          url: a.url,
          folder: a.folder,
          size: a.size,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models", details: error.message });
    }
  });

  // Get single asset by ID (serves the file)
  app.get("/api/asset-registry/:id", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      
      // On Vercel (no GCS), redirect to the static file URL
      if (!objectStorageClient) {
        const staticUrl = objectStorageService.getStaticAssetUrl(req.params.id);
        if (staticUrl) {
          return res.redirect(302, staticUrl);
        }
        return res.status(404).json({ error: "Asset not found" });
      }
      
      const result = await objectStorageService.getAssetById(req.params.id);
      
      if (!result) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      await objectStorageService.downloadObject(result.file, res);
    } catch (error: any) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset", details: error.message });
    }
  });

  // Get asset metadata by ID (without downloading)
  app.get("/api/asset-registry/:id/info", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.getAssetRegistry();
      const asset = assets.find(a => a.id === req.params.id || a.uuid === req.params.id);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error: any) {
      console.error("Error fetching asset info:", error);
      res.status(500).json({ error: "Failed to fetch asset info", details: error.message });
    }
  });

  // ============================================
  // Viewport Asset Routes
  // ============================================

  app.get("/api/viewport-assets", async (req, res) => {
    try {
      const { type, category, search } = req.query;
      
      let assets;
      if (search && typeof search === "string") {
        assets = await storage.searchViewportAssets(search);
      } else if (type && typeof type === "string") {
        assets = await storage.getViewportAssetsByType(type);
      } else if (category && typeof category === "string") {
        assets = await storage.getViewportAssetsByCategory(category);
      } else {
        assets = await storage.getAllViewportAssets();
      }
      
      res.json(assets);
    } catch (error) {
      console.error("Error fetching viewport assets:", error);
      res.status(500).json({ error: "Failed to fetch viewport assets" });
    }
  });

  app.get("/api/viewport-assets/:id", async (req, res) => {
    try {
      const asset = await storage.getViewportAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.get("/api/viewport-assets/slug/:slug", async (req, res) => {
    try {
      const asset = await storage.getViewportAssetBySlug(req.params.slug);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/viewport-assets/seed", async (req, res) => {
    try {
      await storage.seedViewportAssets();
      const assets = await storage.getAllViewportAssets();
      res.json({ message: "Viewport assets seeded successfully", count: assets.length });
    } catch (error) {
      console.error("Error seeding viewport assets:", error);
      res.status(500).json({ error: "Failed to seed viewport assets" });
    }
  });

  app.post("/api/viewport-assets/sync-from-storage", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const storageFiles = await objectStorageService.listFiles('public/');
      
      const glbFiles = storageFiles.filter((f: { name: string; size?: number }) => f.name.toLowerCase().endsWith('.glb'));
      
      const results = {
        added: 0,
        skipped: 0,
        errors: [] as { file: string; error: string }[],
      };
      
      for (const file of glbFiles) {
        try {
          const fileName = file.name.split('/').pop() || '';
          const pathParts = file.name.split('/');
          
          let category = 'misc';
          let subcategory: string | undefined;
          const tags: string[] = [];
          
          if (file.name.includes('/animations/')) {
            category = 'animation';
            tags.push('animation');
          } else if (file.name.includes('/characters/') || file.name.includes('/Characters/')) {
            category = 'unit';
            subcategory = 'character';
            tags.push('character');
          } else if (file.name.includes('/weapons/') || file.name.includes('/Weapons/')) {
            category = 'weapon';
            tags.push('weapon');
          } else if (file.name.includes('/buildings/') || file.name.includes('/Buildings/')) {
            category = 'building';
            tags.push('building');
          } else if (file.name.includes('/props/')) {
            category = 'prop';
            if (file.name.includes('/nature/')) {
              subcategory = 'nature';
              tags.push('nature');
            } else if (file.name.includes('/items/')) {
              subcategory = 'item';
              tags.push('item');
            }
          } else if (file.name.includes('/Vehicles/') || file.name.includes('/vehicles/')) {
            category = 'vehicle';
            tags.push('vehicle');
          } else if (file.name.includes('/effects/')) {
            category = 'effect';
            tags.push('effect', 'vfx');
          } else if (file.name.includes('/Worlds/')) {
            category = 'environment';
            tags.push('world', 'environment');
          }
          
          const baseName = fileName
            .replace(/\.glb$/i, '')
            .replace(/^[a-f0-9]{8}_/, '')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const slug = baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          
          const existing = await storage.getViewportAssetBySlug(slug);
          if (existing) {
            results.skipped++;
            continue;
          }
          
          const storagePath = `/public-objects/${file.name}`;
          
          await storage.createViewportAsset({
            name: baseName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            slug,
            sourceType: 'object-storage',
            assetType: 'glb',
            category,
            subcategory,
            filePath: storagePath,
            tags,
            isAnimated: category === 'animation' || file.name.includes('animation'),
            fileSize: file.size || undefined,
            metadata: { storageKey: file.name },
            viewportConfig: { cameraPosition: { x: 3, y: 2, z: 5 }, autoRotate: true },
          });
          
          results.added++;
        } catch (error) {
          results.errors.push({ file: file.name, error: String(error) });
        }
      }
      
      res.json({
        message: `Synced ${results.added} GLB files from Object Storage`,
        added: results.added,
        skipped: results.skipped,
        total: glbFiles.length,
        errors: results.errors,
      });
    } catch (error) {
      console.error("Error syncing from storage:", error);
      res.status(500).json({ error: "Failed to sync from Object Storage" });
    }
  });

  app.delete("/api/viewport-assets/:id", async (req, res) => {
    try {
      await storage.deleteViewportAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // ============================================
  // Unified Asset Catalog - Aggregates ALL assets
  // ============================================

  app.get("/api/asset-catalog", async (req, res) => {
    try {
      const { source, type, search } = req.query;
      
      // Fetch from all sources in parallel
      const [gdevelopAssets, rtsAssets, viewportAssets] = await Promise.all([
        storage.getAllAssets(),
        storage.getAllRtsAssets(),
        storage.getAllViewportAssets(),
      ]);

      // Fetch object storage assets
      let storageAssets: any[] = [];
      try {
        const objectStorageService = new ObjectStorageService();
        storageAssets = await objectStorageService.getAssetRegistry();
      } catch (e) {
        console.log("Object storage not available for catalog");
      }

      // Normalize all assets to unified format
      const catalog = [
        ...gdevelopAssets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          category: a.category,
          source: 'gdevelop',
          previewUrl: a.previewUrl || a.modelUrl,
          downloadUrl: a.modelUrl || a.sourceUrl,
          tags: a.tags || [],
          description: a.description,
        })),
        ...rtsAssets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          category: a.category,
          source: 'rts',
          previewUrl: a.previewUrl || a.fileUrl,
          downloadUrl: a.fileUrl,
          tags: a.tags || [],
          description: null,
          createdAt: a.createdAt,
        })),
        ...viewportAssets.map(a => ({
          id: a.id,
          name: a.name,
          type: a.assetType,
          category: a.category,
          subcategory: a.subcategory,
          source: 'viewport',
          previewUrl: a.previewImageUrl || a.filePath,
          downloadUrl: a.filePath,
          tags: a.tags || [],
          description: null,
          isAnimated: a.isAnimated,
          fileSize: a.fileSize,
        })),
        ...storageAssets.map(a => ({
          id: a.id || a.uuid,
          name: a.filename,
          type: a.type,
          category: a.folder || 'storage',
          source: 'object-storage',
          previewUrl: a.url,
          downloadUrl: a.url,
          tags: [],
          description: null,
          fileSize: a.size,
        })),
      ];

      // Apply filters
      let filtered = catalog;
      
      if (source && typeof source === 'string') {
        filtered = filtered.filter(a => a.source === source);
      }
      
      if (type && typeof type === 'string') {
        filtered = filtered.filter(a => a.type?.toLowerCase().includes(type.toLowerCase()));
      }
      
      if (search && typeof search === 'string') {
        const term = search.toLowerCase();
        filtered = filtered.filter(a => 
          a.name?.toLowerCase().includes(term) ||
          a.category?.toLowerCase().includes(term) ||
          a.tags?.some((t: string) => t.toLowerCase().includes(term))
        );
      }

      res.json({
        total: catalog.length,
        filtered: filtered.length,
        sources: {
          gdevelop: gdevelopAssets.length,
          rts: rtsAssets.length,
          viewport: viewportAssets.length,
          objectStorage: storageAssets.length,
        },
        assets: filtered,
      });
    } catch (error: any) {
      console.error("Error fetching asset catalog:", error);
      res.status(500).json({ error: "Failed to fetch asset catalog", details: error.message });
    }
  });

  // Saved characters API (MMO-style character creation)
  app.get("/api/saved-characters", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const userId = claims?.sub;
      const characters = await storage.getSavedCharacters(userId);
      res.json(characters);
    } catch (error) {
      console.error("Error fetching saved characters:", error);
      res.status(500).json({ error: "Failed to fetch saved characters" });
    }
  });

  app.post("/api/saved-characters", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const userId = claims?.sub;
      const { name, presetId, customization, colors } = req.body;
      
      if (!name || !presetId) {
        return res.status(400).json({ error: "Name and preset are required" });
      }
      
      const character = await storage.createSavedCharacter({
        userId,
        name,
        presetId,
        customization: customization || {},
        colors: colors || {},
        isActive: false
      });
      
      res.status(201).json(character);
    } catch (error) {
      console.error("Error saving character:", error);
      res.status(500).json({ error: "Failed to save character" });
    }
  });

  app.patch("/api/saved-characters/:id/activate", async (req, res) => {
    try {
      const claims = (req.user as any)?.claims;
      const userId = claims?.sub;
      const characterId = req.params.id;
      
      await storage.setActiveCharacter(userId, characterId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating character:", error);
      res.status(500).json({ error: "Failed to activate character" });
    }
  });

  app.delete("/api/saved-characters/:id", async (req, res) => {
    try {
      await storage.deleteSavedCharacter(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete character" });
    }
  });

  // Register user profile and protected routes
  registerUserRoutes(app);

  const httpServer = createServer(app);
  
  // Initialize Socket.io for multiplayer lobby
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Initialize lobby manager with socket.io
  lobbyManager.initialize(io);
  console.log('[Server] Multiplayer lobby initialized');
  
  // Lobby stats endpoint
  app.get("/api/lobby/stats", (req, res) => {
    res.json({
      rooms: lobbyManager.getRoomCount(),
      players: lobbyManager.getPlayerCount()
    });
  });
  
  // ========== Meshy API Integration for Character Editor ==========
  
  // Create texture generation task
  app.post("/api/meshy/retexture", async (req, res) => {
    try {
      const { modelUrl, texturePrompt, enablePbr = true } = req.body;
      
      if (!modelUrl || !texturePrompt) {
        return res.status(400).json({ error: "Model URL and texture prompt are required" });
      }
      
      const meshyApiKey = process.env.MESHY_API_KEY;
      if (!meshyApiKey) {
        // Return mock response for development without API key
        return res.json({
          taskId: `mock-task-${Date.now()}`,
          status: "PENDING",
          message: "Meshy API key not configured. Using mock response.",
          mock: true
        });
      }
      
      const response = await fetch("https://api.meshy.ai/openapi/v2/retexture", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${meshyApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model_url: modelUrl,
          texture_prompt: texturePrompt,
          enable_pbr: enablePbr,
          ai_model: "latest"
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: `Meshy API error: ${error}` });
      }
      
      const result = await response.json();
      res.json({
        taskId: result.result,
        status: "PENDING"
      });
    } catch (error) {
      console.error("Meshy retexture error:", error);
      res.status(500).json({ error: "Failed to create texture generation task" });
    }
  });
  
  // Check texture generation task status
  app.get("/api/meshy/retexture/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      
      // Handle mock tasks
      if (taskId.startsWith("mock-task-")) {
        return res.json({
          taskId,
          status: "SUCCEEDED",
          progress: 100,
          modelUrls: {
            glb: null,
            fbx: null,
            usdz: null
          },
          textureUrls: [],
          thumbnailUrl: null,
          mock: true
        });
      }
      
      const meshyApiKey = process.env.MESHY_API_KEY;
      if (!meshyApiKey) {
        return res.status(400).json({ error: "Meshy API key not configured" });
      }
      
      const response = await fetch(`https://api.meshy.ai/openapi/v2/retexture/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${meshyApiKey}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: `Meshy API error: ${error}` });
      }
      
      const result = await response.json();
      res.json({
        taskId,
        status: result.status,
        progress: result.progress,
        modelUrls: result.model_urls,
        textureUrls: result.texture_urls,
        thumbnailUrl: result.thumbnail_url
      });
    } catch (error) {
      console.error("Meshy status check error:", error);
      res.status(500).json({ error: "Failed to check task status" });
    }
  });
  
  // ============================================
  // Admin Storage Management API Routes
  // ============================================
  
  // List storage contents
  app.get("/api/admin/storage", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (publicSearchPaths.length === 0) {
        return res.json({ items: [], folders: [], currentPath: "", breadcrumbs: [] });
      }
      
      const basePath = publicSearchPaths[0];
      const requestedPath = (req.query.path as string) || "";
      const { bucketName, objectName } = parseObjectPath(basePath);
      
      const bucket = objectStorageClient.bucket(bucketName);
      const prefix = requestedPath ? `${objectName}/${requestedPath}/` : `${objectName}/`;
      
      const [files] = await bucket.getFiles({ 
        prefix: prefix,
        delimiter: "/"
      });
      
      const [, , apiResponse] = await bucket.getFiles({ 
        prefix: prefix,
        delimiter: "/",
        autoPaginate: false
      });
      
      const prefixes = (apiResponse as any)?.prefixes || [];
      
      const items: any[] = [];
      const foldersSet = new Set<string>();
      
      // Add folders from prefixes
      for (const folderPrefix of prefixes) {
        const folderName = folderPrefix.replace(prefix, "").replace(/\/$/, "");
        if (folderName) {
          foldersSet.add(folderName);
          items.push({
            name: folderName,
            path: requestedPath ? `${requestedPath}/${folderName}` : folderName,
            fullPath: `/${bucketName}/${folderPrefix}`,
            type: "folder"
          });
        }
      }
      
      // Add files
      for (const file of files) {
        const fileName = file.name.replace(prefix, "");
        if (fileName && !fileName.includes("/")) {
          const [metadata] = await file.getMetadata();
          const ext = fileName.split(".").pop() || "";
          items.push({
            name: fileName,
            path: requestedPath ? `${requestedPath}/${fileName}` : fileName,
            fullPath: `/${bucketName}/${file.name}`,
            type: "file",
            size: metadata.size ? parseInt(String(metadata.size)) : undefined,
            contentType: metadata.contentType,
            createdAt: metadata.timeCreated,
            extension: ext
          });
        }
      }
      
      // Build breadcrumbs
      const breadcrumbs: { name: string; path: string }[] = [];
      if (requestedPath) {
        const parts = requestedPath.split("/");
        let currentBreadcrumbPath = "";
        for (const part of parts) {
          currentBreadcrumbPath = currentBreadcrumbPath ? `${currentBreadcrumbPath}/${part}` : part;
          breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
        }
      }
      
      res.json({
        items: items.sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
        folders: Array.from(foldersSet),
        currentPath: requestedPath,
        breadcrumbs
      });
    } catch (error) {
      console.error("Storage list error:", error);
      res.status(500).json({ error: "Failed to list storage" });
    }
  });
  
  // Rename file/folder
  app.post("/api/admin/storage/rename", async (req, res) => {
    try {
      const { oldPath, newName } = req.body;
      if (!oldPath || !newName) {
        return res.status(400).json({ error: "oldPath and newName are required" });
      }
      
      const { bucketName, objectName } = parseObjectPath(oldPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const pathParts = objectName.split("/");
      pathParts[pathParts.length - 1] = newName;
      const newObjectName = pathParts.join("/");
      
      await file.copy(bucket.file(newObjectName));
      await file.delete();
      
      res.json({ success: true, newPath: `/${bucketName}/${newObjectName}` });
    } catch (error) {
      console.error("Rename error:", error);
      res.status(500).json({ error: "Failed to rename" });
    }
  });
  
  // Move file/folder
  app.post("/api/admin/storage/move", async (req, res) => {
    try {
      const { sourcePath, targetFolder } = req.body;
      if (!sourcePath) {
        return res.status(400).json({ error: "sourcePath is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const basePath = publicSearchPaths[0];
      const { bucketName: baseBucketName, objectName: baseObjectName } = parseObjectPath(basePath);
      
      const { bucketName, objectName } = parseObjectPath(sourcePath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const fileName = objectName.split("/").pop();
      const targetObjectName = targetFolder 
        ? `${baseObjectName}/${targetFolder}/${fileName}`
        : `${baseObjectName}/${fileName}`;
      
      await file.copy(bucket.file(targetObjectName));
      await file.delete();
      
      res.json({ success: true, newPath: `/${bucketName}/${targetObjectName}` });
    } catch (error) {
      console.error("Move error:", error);
      res.status(500).json({ error: "Failed to move" });
    }
  });
  
  // Delete file/folder
  app.post("/api/admin/storage/delete", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: "path is required" });
      }
      
      const { bucketName, objectName } = parseObjectPath(filePath);
      const bucket = objectStorageClient.bucket(bucketName);
      
      // Check if it's a folder (ends with /) or if we need to delete by prefix
      if (filePath.endsWith("/")) {
        const [files] = await bucket.getFiles({ prefix: objectName });
        await Promise.all(files.map(f => f.delete()));
      } else {
        const file = bucket.file(objectName);
        await file.delete();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete" });
    }
  });
  
  // Create folder (by creating a placeholder file)
  app.post("/api/admin/storage/create-folder", async (req, res) => {
    try {
      const { parentPath, folderName } = req.body;
      if (!folderName) {
        return res.status(400).json({ error: "folderName is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const basePath = publicSearchPaths[0];
      const { bucketName, objectName: baseObjectName } = parseObjectPath(basePath);
      
      const bucket = objectStorageClient.bucket(bucketName);
      const folderPath = parentPath 
        ? `${baseObjectName}/${parentPath}/${folderName}/.keep`
        : `${baseObjectName}/${folderName}/.keep`;
      
      const file = bucket.file(folderPath);
      await file.save("", { contentType: "text/plain" });
      
      res.json({ success: true, path: folderPath });
    } catch (error) {
      console.error("Create folder error:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });
  
  // Download file
  app.get("/api/admin/storage/download", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "path is required" });
      }
      
      const { bucketName, objectName } = parseObjectPath(filePath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${objectName.split("/").pop()}"`,
      });
      
      file.createReadStream().pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download" });
    }
  });
  
  // Parse 3D model metadata
  app.get("/api/admin/storage/parse-model", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "path is required" });
      }
      
      const { bucketName, objectName } = parseObjectPath(filePath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const [metadata] = await file.getMetadata();
      const fileName = objectName.split("/").pop() || "";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      
      // For now, return basic metadata. Full parsing would require loading the model server-side
      const result = {
        id: null,
        storagePath: filePath,
        filename: fileName,
        fileType: ext,
        fileSize: metadata.size ? parseInt(String(metadata.size)) : undefined,
        meshes: [],
        materials: [],
        animations: [],
        textures: [],
        boundingBox: null,
        sceneInfo: null,
        folder: objectName.split("/").slice(0, -1).join("/"),
        tags: []
      };
      
      res.json(result);
    } catch (error) {
      console.error("Parse model error:", error);
      res.status(500).json({ error: "Failed to parse model" });
    }
  });
  
  // Text to 3D generation (for creating new armor parts)
  app.post("/api/meshy/text-to-3d", async (req, res) => {
    try {
      const { prompt, artStyle = "realistic", negativePrompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      const meshyApiKey = process.env.MESHY_API_KEY;
      if (!meshyApiKey) {
        return res.json({
          taskId: `mock-t2m-${Date.now()}`,
          status: "PENDING",
          message: "Meshy API key not configured. Using mock response.",
          mock: true
        });
      }
      
      const response = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${meshyApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "preview",
          prompt,
          art_style: artStyle,
          negative_prompt: negativePrompt,
          ai_model: "meshy-4"
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: `Meshy API error: ${error}` });
      }
      
      const result = await response.json();
      res.json({
        taskId: result.result,
        status: "PENDING"
      });
    } catch (error) {
      console.error("Meshy text-to-3d error:", error);
      res.status(500).json({ error: "Failed to create 3D generation task" });
    }
  });
  
  // Check text-to-3D task status
  app.get("/api/meshy/text-to-3d/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      
      if (taskId.startsWith("mock-t2m-")) {
        return res.json({
          taskId,
          status: "SUCCEEDED",
          progress: 100,
          modelUrls: { glb: null },
          thumbnailUrl: null,
          mock: true
        });
      }
      
      const meshyApiKey = process.env.MESHY_API_KEY;
      if (!meshyApiKey) {
        return res.status(400).json({ error: "Meshy API key not configured" });
      }
      
      const response = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${meshyApiKey}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: `Meshy API error: ${error}` });
      }
      
      const result = await response.json();
      res.json({
        taskId,
        status: result.status,
        progress: result.progress,
        modelUrls: result.model_urls,
        thumbnailUrl: result.thumbnail_url
      });
    } catch (error) {
      console.error("Meshy text-to-3d status error:", error);
      res.status(500).json({ error: "Failed to check task status" });
    }
  });
  
  // ============= Skill Tree Routes =============
  
  // Get all skill trees
  app.get("/api/skill-trees", async (req, res) => {
    try {
      const trees = await db.select().from(skillTrees);
      res.json(trees);
    } catch (error) {
      console.error("Error fetching skill trees:", error);
      res.status(500).json({ error: "Failed to fetch skill trees" });
    }
  });
  
  // Get single skill tree
  app.get("/api/skill-trees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [tree] = await db.select().from(skillTrees).where(eq(skillTrees.id, id));
      if (!tree) {
        return res.status(404).json({ error: "Skill tree not found" });
      }
      res.json(tree);
    } catch (error) {
      console.error("Error fetching skill tree:", error);
      res.status(500).json({ error: "Failed to fetch skill tree" });
    }
  });
  
  // Create skill tree
  app.post("/api/skill-trees", async (req, res) => {
    try {
      const data = insertSkillTreeSchema.parse(req.body);
      const newId = randomUUID();
      await db.insert(skillTrees).values({ ...data, id: newId });
      const [tree] = await db.select().from(skillTrees).where(eq(skillTrees.id, newId)).limit(1);
      res.status(201).json(tree);
    } catch (error) {
      console.error("Error creating skill tree:", error);
      res.status(500).json({ error: "Failed to create skill tree" });
    }
  });
  
  // Update skill tree
  app.patch("/api/skill-trees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(skillTrees)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(skillTrees.id, id));
      const [tree] = await db.select().from(skillTrees).where(eq(skillTrees.id, id)).limit(1);
      if (!tree) {
        return res.status(404).json({ error: "Skill tree not found" });
      }
      res.json(tree);
    } catch (error) {
      console.error("Error updating skill tree:", error);
      res.status(500).json({ error: "Failed to update skill tree" });
    }
  });
  
  // Delete skill tree
  app.delete("/api/skill-trees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [tree] = await db.select().from(skillTrees).where(eq(skillTrees.id, id)).limit(1);
      if (!tree) {
        return res.status(404).json({ error: "Skill tree not found" });
      }
      await db.delete(skillTrees).where(eq(skillTrees.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting skill tree:", error);
      res.status(500).json({ error: "Failed to delete skill tree" });
    }
  });

  // ============= MMO World System Routes =============

  // Store active players in memory for real-time sync
  const mmoActivePlayers = new Map<string, { 
    socketId: string; 
    characterId: string; 
    worldId: string;
    x: number;
    y: number;
    direction: number;
    lastUpdate: number;
  }>();

  // Get all MMO worlds
  app.get("/api/mmo/worlds", async (req, res) => {
    try {
      const worlds = await db.select().from(mmoWorlds);
      res.json(worlds);
    } catch (error) {
      console.error("Error fetching MMO worlds:", error);
      res.status(500).json({ error: "Failed to fetch worlds" });
    }
  });

  // Get single MMO world with NPCs
  app.get("/api/mmo/worlds/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [world] = await db.select().from(mmoWorlds).where(eq(mmoWorlds.id, id));
      if (!world) {
        return res.status(404).json({ error: "World not found" });
      }
      const npcs = await db.select().from(mmoNpcs).where(eq(mmoNpcs.worldId, id));
      res.json({ ...world, npcs });
    } catch (error) {
      console.error("Error fetching MMO world:", error);
      res.status(500).json({ error: "Failed to fetch world" });
    }
  });

  // Get or create character for a user in a world
  app.post("/api/mmo/characters", async (req, res) => {
    try {
      const data = insertMmoCharacterSchema.parse(req.body);
      
      // Check if character already exists for this user in this world
      const [existing] = await db.select().from(mmoCharacters)
        .where(eq(mmoCharacters.userId, data.userId));
      
      if (existing && existing.worldId === data.worldId) {
        // Update last online
        await db.update(mmoCharacters)
          .set({ lastOnline: new Date() })
          .where(eq(mmoCharacters.id, existing.id));
        const [updated] = await db.select().from(mmoCharacters).where(eq(mmoCharacters.id, existing.id)).limit(1);
        return res.json(updated);
      }

      // Create new character
      const newCharId = randomUUID();
      await db.insert(mmoCharacters).values({ ...data, id: newCharId });
      const [character] = await db.select().from(mmoCharacters).where(eq(mmoCharacters.id, newCharId)).limit(1);
      res.status(201).json(character);
    } catch (error) {
      console.error("Error creating MMO character:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });

  // Get character by ID
  app.get("/api/mmo/characters/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [character] = await db.select().from(mmoCharacters).where(eq(mmoCharacters.id, id));
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      console.error("Error fetching MMO character:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  // Get characters for a user
  app.get("/api/mmo/users/:userId/characters", async (req, res) => {
    try {
      const { userId } = req.params;
      const characters = await db.select().from(mmoCharacters)
        .where(eq(mmoCharacters.userId, userId));
      res.json(characters);
    } catch (error) {
      console.error("Error fetching user characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // Update character position (REST fallback, Socket.io preferred)
  app.patch("/api/mmo/characters/:id/position", async (req, res) => {
    try {
      const { id } = req.params;
      const { posX, posY } = req.body;
      await db.update(mmoCharacters)
        .set({ posX, posY, lastOnline: new Date() })
        .where(eq(mmoCharacters.id, id));
      const [character] = await db.select().from(mmoCharacters).where(eq(mmoCharacters.id, id)).limit(1);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      console.error("Error updating character position:", error);
      res.status(500).json({ error: "Failed to update position" });
    }
  });

  // Get active players in world (from memory)
  app.get("/api/mmo/worlds/:worldId/players", async (req, res) => {
    try {
      const { worldId } = req.params;
      const players: Array<{ 
        characterId: string; 
        x: number; 
        y: number; 
        direction: number;
      }> = [];
      
      mmoActivePlayers.forEach((player) => {
        if (player.worldId === worldId) {
          players.push({
            characterId: player.characterId,
            x: player.x,
            y: player.y,
            direction: player.direction,
          });
        }
      });
      
      res.json(players);
    } catch (error) {
      console.error("Error fetching active players:", error);
      res.status(500).json({ error: "Failed to fetch active players" });
    }
  });

  // Get chat messages
  app.get("/api/mmo/worlds/:worldId/chat", async (req, res) => {
    try {
      const { worldId } = req.params;
      const messages = await db.select().from(mmoChatMessages)
        .where(eq(mmoChatMessages.worldId, worldId));
      res.json(messages.slice(-50)); // Last 50 messages
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat" });
    }
  });

  // ============================================
  // OVERDRIVE RACING GAME ROUTES
  // ============================================

  // Get all available race tracks
  app.get("/api/overdrive/tracks", async (req, res) => {
    try {
      const tracks = overdriveEngine.getTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      res.status(500).json({ error: "Failed to fetch tracks" });
    }
  });

  // Get specific track details
  app.get("/api/overdrive/tracks/:trackId", async (req, res) => {
    try {
      const track = overdriveEngine.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }
      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ error: "Failed to fetch track" });
    }
  });

  // Create a new race
  app.post("/api/overdrive/races", async (req, res) => {
    try {
      const { trackId, maxPlayers = 4 } = req.body;
      if (!trackId) {
        return res.status(400).json({ error: "trackId is required" });
      }
      const race = overdriveEngine.createRace(trackId, maxPlayers);
      res.status(201).json(race);
    } catch (error: any) {
      console.error("Error creating race:", error);
      res.status(400).json({ error: error.message || "Failed to create race" });
    }
  });

  // Join a race
  app.post("/api/overdrive/races/:raceId/join", async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "playerId is required" });
      }
      const vehicle = overdriveEngine.addVehicleToRace(req.params.raceId, playerId);
      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("Error joining race:", error);
      res.status(400).json({ error: error.message || "Failed to join race" });
    }
  });

  // Get race state
  app.get("/api/overdrive/races/:raceId", async (req, res) => {
    try {
      const race = overdriveEngine.getRaceState(req.params.raceId);
      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }
      // Convert Map objects to arrays for JSON serialization
      res.json({
        ...race,
        vehicles: Array.from(race.vehicles.values()),
        playerTimes: Object.fromEntries(race.playerTimes),
      });
    } catch (error) {
      console.error("Error fetching race:", error);
      res.status(500).json({ error: "Failed to fetch race" });
    }
  });

  // Update race vehicle physics (poll-based or periodic updates)
  app.patch("/api/overdrive/races/:raceId/update", async (req, res) => {
    try {
      const { vehicles, inputs } = req.body;
      if (!vehicles || !inputs) {
        return res.status(400).json({ error: "vehicles and inputs are required" });
      }
      overdriveEngine.updateRace(req.params.raceId, vehicles, inputs);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating race:", error);
      res.status(500).json({ error: "Failed to update race" });
    }
  });

  // Finish race and get results
  app.post("/api/overdrive/races/:raceId/finish", async (req, res) => {
    try {
      const results = overdriveEngine.finishRace(req.params.raceId);
      const resultsArray = Array.from(results.entries()).map(([playerId, time]) => ({
        playerId,
        time,
      }));
      res.json(resultsArray);
    } catch (error) {
      console.error("Error finishing race:", error);
      res.status(500).json({ error: "Failed to finish race" });
    }
  });

  // Get leaderboard
  app.get("/api/overdrive/leaderboard", async (req, res) => {
    try {
      const { trackId, limit = 10 } = req.query;
      const leaderboard = overdriveEngine.getLeaderboard(
        typeof trackId === "string" ? trackId : undefined,
        Math.min(Number(limit) || 10, 100)
      );
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Add leaderboard entry
  app.post("/api/overdrive/leaderboard", async (req, res) => {
    try {
      const { playerId, playerName, trackId, time, difficulty } = req.body;
      if (!playerId || !playerName || !trackId || !time) {
        return res.status(400).json({ error: "playerId, playerName, trackId, and time are required" });
      }
      overdriveEngine.addLeaderboardEntry({
        playerId,
        playerName,
        trackId,
        time,
        date: new Date(),
        difficulty: difficulty || 1,
      });
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error adding leaderboard entry:", error);
      res.status(500).json({ error: "Failed to add leaderboard entry" });
    }
  });

  // ============================================
  // MMO WORLD SPRITE & ANIMATION ROUTES
  // ============================================

  // Get sprite animations for MMO character
  app.get("/api/mmo/sprites/animations/:characterType", async (req, res) => {
    try {
      const { characterType } = req.params;
      // Return animation states: idle, walk, run, attack, cast, die, etc.
      const animations = {
        idle: { frames: 4, duration: 800, loop: true },
        walk: { frames: 8, duration: 600, loop: true },
        run: { frames: 8, duration: 400, loop: true },
        attack: { frames: 6, duration: 300, loop: false },
        cast: { frames: 8, duration: 800, loop: false },
        die: { frames: 10, duration: 1000, loop: false },
      };
      res.json({ characterType, animations });
    } catch (error) {
      console.error("Error fetching animations:", error);
      res.status(500).json({ error: "Failed to fetch animations" });
    }
  });

  // Get sprite sheet for MMO character
  app.get("/api/mmo/sprites/:characterType", async (req, res) => {
    try {
      const { characterType } = req.params;
      // Return sprite sheet metadata
      const spriteSheets: Record<string, any> = {
        warrior: { url: "/public-objects/sprites/warrior_spritesheet.png", frameWidth: 64, frameHeight: 64, columns: 8 },
        mage: { url: "/public-objects/sprites/mage_spritesheet.png", frameWidth: 64, frameHeight: 64, columns: 8 },
        archer: { url: "/public-objects/sprites/archer_spritesheet.png", frameWidth: 64, frameHeight: 64, columns: 8 },
      };
      if (!spriteSheets[characterType]) {
        return res.status(404).json({ error: "Character type not found" });
      }
      res.json(spriteSheets[characterType]);
    } catch (error) {
      console.error("Error fetching sprite sheet:", error);
      res.status(500).json({ error: "Failed to fetch sprite sheet" });
    }
  });

  // ============================================
  // SWARM RTS NEW MAPS & SYSTEMS ROUTES
  // ============================================

  // Get all RTS maps
  app.get("/api/rts/maps", async (req, res) => {
    try {
      const maps = [
        {
          id: "grasslands",
          name: "Grasslands",
          width: 3600,
          height: 2100,
          terrain: "grass",
          difficulty: 1,
          description: "Open grasslands with scattered forests. Good for all unit types.",
        },
        {
          id: "mountains",
          name: "Mountain Pass",
          width: 2200,
          height: 2000,
          terrain: "mountain",
          difficulty: 3,
          description: "Treacherous mountain terrain with tight passages. Favors ranged units.",
        },
        {
          id: "islands",
          name: "Island Archipelago",
          width: 4000,
          height: 2400,
          terrain: "water",
          difficulty: 2,
          description: "Multiple islands connected by narrow bridges. Naval units essential.",
        },
        {
          id: "urban",
          name: "Urban Sprawl",
          width: 3200,
          height: 2400,
          terrain: "urban",
          difficulty: 2,
          description: "Dense city with buildings for cover. Stealth units advantageous.",
        },
      ];
      res.json(maps);
    } catch (error) {
      console.error("Error fetching RTS maps:", error);
      res.status(500).json({ error: "Failed to fetch maps" });
    }
  });

  // Get faction play systems
  app.get("/api/rts/factions", async (req, res) => {
    try {
      const factions = [
        {
          id: "fabled",
          name: "Fabled Kingdom",
          playstyle: "Balanced",
          description: "Versatile faction with strong infantry and economy",
          units: ["knight", "archer", "mage", "healer"],
        },
        {
          id: "legion",
          name: "Iron Legion",
          playstyle: "Aggressive",
          description: "Powerful military force focused on heavy units and combat",
          units: ["warrior", "tank", "siege_engine", "berserker"],
        },
        {
          id: "crusade",
          name: "Holy Crusade",
          playstyle: "Defensive",
          description: "Superior defensive structures and support abilities",
          units: ["paladin", "priest", "defender", "guardian"],
        },
      ];
      res.json(factions);
    } catch (error) {
      console.error("Error fetching factions:", error);
      res.status(500).json({ error: "Failed to fetch factions" });
    }
  });

  // Get game play systems
    app.get("/api/rts/gameplay-systems", async (req, res) => {
    try {
      const systems = {
        unitSpawning: {
          name: "Unit Spawning",
          description: "Control spawn rates and unit production from buildings",
          mechanics: ["production queues", "resource costs", "spawn timers"],
        },
        resourceManagement: {
          name: "Resource Management",
          description: "Gather and manage gold, wood, and food for unit production",
          mechanics: ["harvesting", "trading", "storage limits", "income generation"],
        },
        combatSystem: {
          name: "Combat System",
          description: "Unit combat with damage, armor, and special abilities",
          mechanics: ["melee/ranged attacks", "abilities", "friendly fire toggle", "damage numbers"],
        },
        fogOfWar: {
          name: "Fog of War",
          description: "Hide enemy units outside vision range",
          mechanics: ["vision radius", "scout units", "map reveal"],
        },
        cityControl: {
          name: "City Control",
          description: "Capture neutral cities to gain resources and unit production",
          mechanics: ["capture progress", "influence radius", "bonuses"],
        },
      };
      res.json(systems);
    } catch (error) {
      console.error("Error fetching gameplay systems:", error);
      res.status(500).json({ error: "Failed to fetch gameplay systems" });
    }
  });

  // Socket.io namespace for MMO real-time updates
  const mmoNamespace = io.of("/mmo");

  mmoNamespace.on("connection", (socket) => {
    console.log("MMO client connected:", socket.id);
    let currentWorldId: string | null = null;
    let currentCharacterId: string | null = null;

    // Join a world
    socket.on("world:join", async (data: { worldId: string; characterId: string }) => {
      const { worldId, characterId } = data;
      currentWorldId = worldId;
      currentCharacterId = characterId;

      // Leave previous room if any
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });

      // Join new world room
      socket.join(`world:${worldId}`);

      // Get character data
      const [character] = await db.select().from(mmoCharacters)
        .where(eq(mmoCharacters.id, characterId));

      if (character) {
        // Register in active players
        mmoActivePlayers.set(socket.id, {
          socketId: socket.id,
          characterId,
          worldId,
          x: character.posX,
          y: character.posY,
          direction: 0,
          lastUpdate: Date.now(),
        });

        // Notify others in the world
        socket.to(`world:${worldId}`).emit("player:joined", {
          characterId,
          x: character.posX,
          y: character.posY,
          name: character.name,
          characterClass: character.characterClass,
          level: character.level,
        });

        // Send current players to the new player
        const currentPlayers: Array<{
          characterId: string;
          x: number;
          y: number;
          direction: number;
        }> = [];
        mmoActivePlayers.forEach((p) => {
          if (p.worldId === worldId && p.characterId !== characterId) {
            currentPlayers.push({
              characterId: p.characterId,
              x: p.x,
              y: p.y,
              direction: p.direction,
            });
          }
        });
        socket.emit("world:state", { players: currentPlayers });
      }
    });

    // Handle movement
    socket.on("player:move", (data: { x: number; y: number; direction: number }) => {
      const player = mmoActivePlayers.get(socket.id);
      if (player && currentWorldId) {
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        player.lastUpdate = Date.now();

        // Broadcast to other players in the world
        socket.to(`world:${currentWorldId}`).emit("player:moved", {
          characterId: player.characterId,
          x: data.x,
          y: data.y,
          direction: data.direction,
        });
      }
    });

    // Handle chat
    socket.on("chat:send", async (data: { message: string }) => {
      const player = mmoActivePlayers.get(socket.id);
      if (player && currentWorldId && currentCharacterId) {
        // Save to database
        await db.insert(mmoChatMessages).values({
          worldId: currentWorldId,
          characterId: currentCharacterId,
          message: data.message,
          channel: "global",
        });

        // Broadcast to all in world
        mmoNamespace.to(`world:${currentWorldId}`).emit("chat:message", {
          characterId: currentCharacterId,
          message: data.message,
          timestamp: Date.now(),
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const player = mmoActivePlayers.get(socket.id);
      if (player) {
        // Notify others
        mmoNamespace.to(`world:${player.worldId}`).emit("player:left", {
          characterId: player.characterId,
        });
        mmoActivePlayers.delete(socket.id);
      }
      console.log("MMO client disconnected:", socket.id);
    });
  });

  // World tick for NPC updates (every 100ms)
  setInterval(() => {
    // Future: Update NPC positions, AI, etc.
  }, 100);
  
  return httpServer;
}
