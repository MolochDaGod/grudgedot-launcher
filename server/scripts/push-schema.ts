/**
 * Safe schema push — creates missing tables without touching existing ones.
 * Run: npx tsx server/scripts/push-schema.ts
 */
import "../env";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES_SQL = `
-- OpenRTS Movers
CREATE TABLE IF NOT EXISTS "openrts_movers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "pathfinding_mode" text NOT NULL DEFAULT 'Walk',
  "heightmap" text NOT NULL DEFAULT 'Ground',
  "standing_mode" text NOT NULL DEFAULT 'Stand',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Effects
CREATE TABLE IF NOT EXISTS "openrts_effects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "ui_name" text,
  "effect_type" text NOT NULL DEFAULT 'damage',
  "damage" integer DEFAULT 0,
  "radius" text,
  "duration" text,
  "projectile_link" text,
  "particle_effect" text,
  "sound_effect" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Weapons
CREATE TABLE IF NOT EXISTS "openrts_weapons" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "ui_name" text NOT NULL,
  "effect_link" text,
  "range" text NOT NULL DEFAULT '5',
  "scan_range" text NOT NULL DEFAULT '7',
  "period" text NOT NULL DEFAULT '4',
  "damage" integer NOT NULL DEFAULT 10,
  "damage_type" text NOT NULL DEFAULT 'physical',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Units
CREATE TABLE IF NOT EXISTS "openrts_units" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "ui_name" text NOT NULL,
  "race" text NOT NULL DEFAULT 'human',
  "radius" text NOT NULL DEFAULT '0.25',
  "separation_radius" text NOT NULL DEFAULT '0.25',
  "speed" text NOT NULL DEFAULT '2.5',
  "mass" text NOT NULL DEFAULT '1.0',
  "max_health" integer NOT NULL DEFAULT 100,
  "sight" text NOT NULL DEFAULT '7',
  "mover_link" text,
  "weapon_links" text[],
  "actor_link" text,
  "model_path" text,
  "cost" jsonb DEFAULT '{"gold":100}'::jsonb,
  "build_time" integer DEFAULT 10,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Actors
CREATE TABLE IF NOT EXISTS "openrts_actors" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "model_path" text NOT NULL,
  "scale" text DEFAULT '1',
  "animations" jsonb DEFAULT '{}'::jsonb,
  "sounds" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Projectiles
CREATE TABLE IF NOT EXISTS "openrts_projectiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "speed" text NOT NULL DEFAULT '10',
  "model_path" text,
  "trail_effect" text,
  "impact_effect" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Trinkets
CREATE TABLE IF NOT EXISTS "openrts_trinkets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "model_path" text NOT NULL,
  "is_blocking" boolean DEFAULT false,
  "is_destructible" boolean DEFAULT false,
  "scale" text DEFAULT '1',
  "category" text NOT NULL DEFAULT 'decoration',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- OpenRTS Map Styles
CREATE TABLE IF NOT EXISTS "openrts_map_styles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "name" text NOT NULL,
  "ground_texture" text,
  "cliff_texture" text,
  "water_texture" text,
  "ambient_color" text,
  "sun_color" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Accounts (Grudge universal identity)
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "grudge_id" varchar(64) NOT NULL UNIQUE,
  "username" varchar(50) NOT NULL,
  "display_name" varchar(100),
  "email" varchar(255),
  "avatar_url" text,
  "faction" varchar(50),
  "password_hash" varchar(255),
  "wallet_address" varchar(255),
  "wallet_type" varchar(50),
  "crossmint_wallet_id" varchar(255),
  "crossmint_email" varchar(255),
  "puter_uuid" varchar(255),
  "puter_username" varchar(100),
  "discord_id" varchar(255),
  "discord_username" varchar(100),
  "is_premium" boolean DEFAULT false,
  "is_guest" boolean DEFAULT false,
  "gold" integer DEFAULT 0,
  "gbux_balance" integer DEFAULT 0,
  "total_characters" integer DEFAULT 0,
  "total_islands" integer DEFAULT 0,
  "home_island_id" varchar(255),
  "has_completed_tutorial" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_login_at" timestamp,
  "updated_at" timestamp DEFAULT now(),
  "metadata" jsonb DEFAULT '{}'::jsonb
);

-- Grudge Characters (WCS-compatible per-player characters)
CREATE TABLE IF NOT EXISTS "grudge_characters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" varchar NOT NULL REFERENCES "accounts"("id"),
  "grudge_id" varchar(64),
  "name" text NOT NULL,
  "class_id" text,
  "race_id" text,
  "profession" text,
  "faction" text,
  "level" integer DEFAULT 1 NOT NULL,
  "experience" integer DEFAULT 0 NOT NULL,
  "gold" integer DEFAULT 1000 NOT NULL,
  "skill_points" integer DEFAULT 5 NOT NULL,
  "attribute_points" integer DEFAULT 0 NOT NULL,
  "attributes" jsonb DEFAULT '{"Strength":0,"Vitality":0,"Endurance":0,"Intellect":0,"Wisdom":0,"Dexterity":0,"Agility":0,"Tactics":0}'::jsonb,
  "equipment" jsonb DEFAULT '{"head":null,"chest":null,"legs":null,"feet":null,"hands":null,"shoulders":null,"mainHand":null,"offHand":null,"accessory1":null,"accessory2":null}'::jsonb,
  "profession_progression" jsonb DEFAULT '{"Miner":{"level":1,"xp":0,"pointsSpent":0},"Forester":{"level":1,"xp":0,"pointsSpent":0},"Mystic":{"level":1,"xp":0,"pointsSpent":0},"Chef":{"level":1,"xp":0,"pointsSpent":0},"Engineer":{"level":1,"xp":0,"pointsSpent":0}}'::jsonb,
  "inventory" jsonb DEFAULT '[]'::jsonb,
  "abilities" jsonb DEFAULT '[]'::jsonb,
  "skill_tree" jsonb DEFAULT '{}'::jsonb,
  "current_health" integer,
  "current_mana" integer,
  "current_stamina" integer,
  "avatar_url" text,
  "is_nft" boolean DEFAULT false,
  "nft_mint_address" varchar(255),
  "nft_collection" varchar(255),
  "nft_minted_at" timestamp,
  "is_active" boolean DEFAULT true,
  "slot_index" integer DEFAULT 0,
  "is_guest" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

-- Game projects
CREATE TABLE IF NOT EXISTS "game_projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "game_type" text NOT NULL,
  "specifications" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" varchar,
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Chat messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" varchar NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- GDevelop assets
CREATE TABLE IF NOT EXISTS "gdevelop_assets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "category" text NOT NULL,
  "source" text DEFAULT 'internal' NOT NULL,
  "source_url" text,
  "preview_url" text,
  "model_url" text,
  "object_key" text,
  "bucket_id" text,
  "content_type" text,
  "file_size" integer,
  "tags" text[] NOT NULL,
  "description" text,
  "uploaded_at" timestamp
);

-- RTS Projects
CREATE TABLE IF NOT EXISTS "rts_projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "thumbnail_url" text,
  "game_mode" text NOT NULL DEFAULT 'pvp',
  "map_data" jsonb NOT NULL,
  "game_settings" jsonb NOT NULL,
  "campaign_data" jsonb,
  "gdevelop_tools" jsonb DEFAULT '{"behaviors":[],"extensions":[],"templates":[]}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- RTS Assets
CREATE TABLE IF NOT EXISTS "rts_assets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "category" text NOT NULL,
  "file_url" text NOT NULL,
  "preview_url" text,
  "metadata" jsonb NOT NULL,
  "tags" text[] NOT NULL,
  "source" text NOT NULL DEFAULT 'user_upload',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Player profiles
CREATE TABLE IF NOT EXISTS "player_profiles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "display_name" varchar NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "xp" integer DEFAULT 0 NOT NULL,
  "total_games_played" integer DEFAULT 0 NOT NULL,
  "total_wins" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Currencies
CREATE TABLE IF NOT EXISTS "currencies" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar NOT NULL UNIQUE,
  "name" varchar NOT NULL,
  "icon_url" varchar,
  "is_premium" boolean DEFAULT false NOT NULL
);

-- Player wallets
CREATE TABLE IF NOT EXISTS "player_wallets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL,
  "currency_id" varchar NOT NULL,
  "balance" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Characters (template catalog)
CREATE TABLE IF NOT EXISTS "characters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar NOT NULL,
  "type" varchar NOT NULL,
  "rarity" varchar NOT NULL DEFAULT 'common',
  "base_stats" jsonb NOT NULL,
  "abilities" jsonb NOT NULL,
  "model_asset_url" varchar,
  "portrait_url" varchar,
  "unlock_level" integer DEFAULT 1 NOT NULL,
  "unlock_cost" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Player characters
CREATE TABLE IF NOT EXISTS "player_characters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL,
  "character_id" varchar NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "experience" integer DEFAULT 0 NOT NULL,
  "equipped_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "stats" jsonb NOT NULL,
  "acquired_at" timestamp DEFAULT now() NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL
);

-- MMO Worlds
CREATE TABLE IF NOT EXISTS "mmo_worlds" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "max_players" integer DEFAULT 100 NOT NULL,
  "current_players" integer DEFAULT 0 NOT NULL,
  "map_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "world_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "version" text DEFAULT '1.0.0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for accounts
CREATE INDEX IF NOT EXISTS "accounts_grudge_id_idx" ON "accounts" ("grudge_id");
CREATE INDEX IF NOT EXISTS "accounts_puter_uuid_idx" ON "accounts" ("puter_uuid");
CREATE INDEX IF NOT EXISTS "accounts_wallet_idx" ON "accounts" ("wallet_address");

-- Indexes for grudge_characters
CREATE INDEX IF NOT EXISTS "grudge_chars_account_id_idx" ON "grudge_characters" ("account_id");
CREATE INDEX IF NOT EXISTS "grudge_chars_grudge_id_idx" ON "grudge_characters" ("grudge_id");
`;

async function main() {
  console.log("🔄 Pushing schema to database...");
  const client = await pool.connect();
  
  try {
    // Split by semicolons and run each statement
    const statements = TABLES_SQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 10);

    let created = 0;
    let skipped = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt + ";");
        const match = stmt.match(/CREATE (?:TABLE|INDEX) IF NOT EXISTS "?(\w+)"?/);
        if (match) {
          console.log(`  ✅ ${match[1]}`);
          created++;
        }
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          skipped++;
        } else {
          console.error(`  ❌ Error: ${err.message}`);
          console.error(`     Statement: ${stmt.slice(0, 80)}...`);
        }
      }
    }

    console.log(`\n✅ Schema push complete: ${created} created, ${skipped} skipped (already exist)`);

    // Verify key tables
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`\n📋 ${rows.length} tables in database:`);
    console.log(rows.map(r => `  - ${r.table_name}`).join("\n"));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
