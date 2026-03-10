CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grudge_id" varchar(64) NOT NULL,
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
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "accounts_grudge_id_unique" UNIQUE("grudge_id")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text NOT NULL,
	"icon_url" varchar,
	"category" varchar NOT NULL,
	"requirement" jsonb NOT NULL,
	"reward" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_behaviors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"difficulty" varchar NOT NULL,
	"description" text,
	"aggressiveness" integer DEFAULT 50 NOT NULL,
	"defensiveness" integer DEFAULT 50 NOT NULL,
	"economy_focus" integer DEFAULT 50 NOT NULL,
	"expansion_rate" integer DEFAULT 50 NOT NULL,
	"unit_preferences" jsonb,
	"build_order" jsonb,
	"decision_tree" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_metadata" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer,
	"meshes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"animations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"textures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bounding_box" jsonb,
	"scene_info" jsonb,
	"thumbnail_url" text,
	"folder" text DEFAULT '/' NOT NULL,
	"category" text DEFAULT 'misc' NOT NULL,
	"subcategory" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text,
	"source_url" text,
	"license" text DEFAULT 'unknown' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"content_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_metadata_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"rarity" varchar DEFAULT 'common' NOT NULL,
	"base_stats" jsonb NOT NULL,
	"abilities" jsonb NOT NULL,
	"model_asset_url" varchar,
	"portrait_url" varchar,
	"unlock_level" integer DEFAULT 1 NOT NULL,
	"unlock_cost" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"name" varchar NOT NULL,
	"icon_url" varchar,
	"is_premium" boolean DEFAULT false NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "game_lobbies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"host_id" varchar NOT NULL,
	"game_mode" varchar DEFAULT 'pvp' NOT NULL,
	"max_players" integer DEFAULT 4 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"password" varchar,
	"status" varchar DEFAULT 'waiting' NOT NULL,
	"settings" jsonb NOT NULL,
	"rts_project_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"game_type" text NOT NULL,
	"specifications" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lobby_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"game_state" jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"winner_id" varchar,
	"results" jsonb
);
--> statement-breakpoint
CREATE TABLE "gdevelop_assets" (
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
--> statement-breakpoint
CREATE TABLE "grudge_characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "level_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" integer NOT NULL,
	"xp_required" integer NOT NULL,
	"rewards" jsonb NOT NULL,
	CONSTRAINT "level_requirements_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "lobby_players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lobby_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"character_id" varchar,
	"team" integer DEFAULT 1 NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mmo_characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"world_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"character_class" varchar DEFAULT 'warrior' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"health" integer DEFAULT 100 NOT NULL,
	"max_health" integer DEFAULT 100 NOT NULL,
	"mana" integer DEFAULT 50 NOT NULL,
	"max_mana" integer DEFAULT 50 NOT NULL,
	"pos_x" integer DEFAULT 50 NOT NULL,
	"pos_y" integer DEFAULT 50 NOT NULL,
	"gold" integer DEFAULT 100 NOT NULL,
	"stats" jsonb DEFAULT '{"strength":10,"dexterity":10,"intelligence":10,"vitality":10}'::jsonb,
	"inventory" jsonb DEFAULT '[]'::jsonb,
	"equipment" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_online" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mmo_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" varchar NOT NULL,
	"character_id" varchar NOT NULL,
	"channel" varchar DEFAULT 'global' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mmo_npcs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"npc_type" varchar DEFAULT 'monster' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"health" integer DEFAULT 100 NOT NULL,
	"max_health" integer DEFAULT 100 NOT NULL,
	"pos_x" integer DEFAULT 0 NOT NULL,
	"pos_y" integer DEFAULT 0 NOT NULL,
	"spawn_x" integer DEFAULT 0 NOT NULL,
	"spawn_y" integer DEFAULT 0 NOT NULL,
	"is_hostile" boolean DEFAULT true NOT NULL,
	"respawn_time" integer DEFAULT 30 NOT NULL,
	"loot_table" jsonb DEFAULT '[]'::jsonb,
	"stats" jsonb DEFAULT '{"attack":5,"defense":5}'::jsonb,
	"dialogues" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mmo_worlds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"map_width" integer DEFAULT 100 NOT NULL,
	"map_height" integer DEFAULT 100 NOT NULL,
	"max_players" integer DEFAULT 100 NOT NULL,
	"spawn_x" integer DEFAULT 50 NOT NULL,
	"spawn_y" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_actors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"model_path" text NOT NULL,
	"scale" text DEFAULT '1',
	"animations" jsonb DEFAULT '{}'::jsonb,
	"sounds" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_effects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"ui_name" text,
	"effect_type" text DEFAULT 'damage' NOT NULL,
	"damage" integer DEFAULT 0,
	"radius" text,
	"duration" text,
	"projectile_link" text,
	"particle_effect" text,
	"sound_effect" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_map_styles" (
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
--> statement-breakpoint
CREATE TABLE "openrts_movers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"pathfinding_mode" text DEFAULT 'Walk' NOT NULL,
	"heightmap" text DEFAULT 'Ground' NOT NULL,
	"standing_mode" text DEFAULT 'Stand' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_projectiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"speed" text DEFAULT '10' NOT NULL,
	"model_path" text,
	"trail_effect" text,
	"impact_effect" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_trinkets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"model_path" text NOT NULL,
	"is_blocking" boolean DEFAULT false,
	"is_destructible" boolean DEFAULT false,
	"scale" text DEFAULT '1',
	"category" text DEFAULT 'decoration' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_units" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"ui_name" text NOT NULL,
	"race" text DEFAULT 'human' NOT NULL,
	"radius" text DEFAULT '0.25' NOT NULL,
	"separation_radius" text DEFAULT '0.25' NOT NULL,
	"speed" text DEFAULT '2.5' NOT NULL,
	"mass" text DEFAULT '1.0' NOT NULL,
	"max_health" integer DEFAULT 100 NOT NULL,
	"sight" text DEFAULT '7' NOT NULL,
	"mover_link" text,
	"weapon_links" text[],
	"actor_link" text,
	"model_path" text,
	"cost" jsonb DEFAULT '{"gold":100}'::jsonb,
	"build_time" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrts_weapons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"ui_name" text NOT NULL,
	"effect_link" text,
	"range" text DEFAULT '5' NOT NULL,
	"scan_range" text DEFAULT '7' NOT NULL,
	"period" text DEFAULT '4' NOT NULL,
	"damage" integer DEFAULT 10 NOT NULL,
	"damage_type" text DEFAULT 'physical' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"character_id" varchar NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"equipment" jsonb,
	"customization" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"total_games_played" integer DEFAULT 0 NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "player_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"currency_id" varchar NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rts_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"file_url" text NOT NULL,
	"preview_url" text,
	"metadata" jsonb NOT NULL,
	"tags" text[] NOT NULL,
	"source" text DEFAULT 'user_upload' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rts_building_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"model_asset_id" varchar,
	"stats" jsonb NOT NULL,
	"cost" jsonb NOT NULL,
	"produces" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rts_projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"game_mode" text DEFAULT 'pvp' NOT NULL,
	"map_data" jsonb NOT NULL,
	"game_settings" jsonb NOT NULL,
	"campaign_data" jsonb,
	"gdevelop_tools" jsonb DEFAULT '{"behaviors":[],"extensions":[],"templates":[]}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rts_unit_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"model_asset_id" varchar,
	"stats" jsonb NOT NULL,
	"cost" jsonb NOT NULL,
	"abilities" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"preset_id" varchar NOT NULL,
	"customization" jsonb NOT NULL,
	"colors" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_trees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar DEFAULT 'general' NOT NULL,
	"tree_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"saved_state" jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"operation" varchar NOT NULL,
	"object_key" varchar,
	"target_key" varchar,
	"file_size" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"item_type" varchar NOT NULL,
	"item_id" varchar,
	"price" jsonb NOT NULL,
	"icon_url" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"asset_type" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"storage_path" text NOT NULL,
	"file_url" text NOT NULL,
	"preview_url" text,
	"file_size" integer,
	"content_type" text,
	"content_hash" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'user-upload' NOT NULL,
	"source_url" text,
	"license" text DEFAULT 'unknown' NOT NULL,
	"user_id" varchar,
	"scope" text DEFAULT 'user' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_objects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"object_key" varchar NOT NULL,
	"namespace" varchar DEFAULT 'assets' NOT NULL,
	"filename" varchar NOT NULL,
	"content_type" varchar,
	"file_size" integer DEFAULT 0 NOT NULL,
	"checksum" varchar,
	"tags" text[] DEFAULT '{}'::text[],
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"last_accessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"audio_settings" jsonb,
	"graphics_settings" jsonb,
	"gameplay_settings" jsonb,
	"notification_settings" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_storage_quotas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"max_storage_bytes" integer DEFAULT 1073741824 NOT NULL,
	"used_storage_bytes" integer DEFAULT 0 NOT NULL,
	"object_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_storage_quotas_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"username" text NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "viewport_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"source_type" text DEFAULT 'internal' NOT NULL,
	"asset_type" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"file_path" text NOT NULL,
	"preview_image_url" text,
	"texture_paths" text[],
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"viewport_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_animated" boolean DEFAULT false NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viewport_assets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar NOT NULL,
	"reference_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_animation_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"idle" jsonb DEFAULT '{"name":"idle","speed":1,"loop":true}'::jsonb NOT NULL,
	"walk" jsonb DEFAULT '{"name":"walk","speed":1,"loop":true}'::jsonb NOT NULL,
	"run" jsonb DEFAULT '{"name":"run","speed":1,"loop":true}'::jsonb NOT NULL,
	"attack" jsonb DEFAULT '{"name":"attack","speed":1,"loop":false}'::jsonb NOT NULL,
	"death" jsonb DEFAULT '{"name":"death","speed":1,"loop":false}'::jsonb NOT NULL,
	"custom_animations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_crafting_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"mining_level" integer DEFAULT 0 NOT NULL,
	"harvesting_level" integer DEFAULT 0 NOT NULL,
	"logging_level" integer DEFAULT 0 NOT NULL,
	"fishing_level" integer DEFAULT 0 NOT NULL,
	"smithing_level" integer DEFAULT 0 NOT NULL,
	"tailoring_level" integer DEFAULT 0 NOT NULL,
	"alchemy_level" integer DEFAULT 0 NOT NULL,
	"enchanting_level" integer DEFAULT 0 NOT NULL,
	"cooking_level" integer DEFAULT 0 NOT NULL,
	"known_recipes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_energies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"max_health" integer DEFAULT 100 NOT NULL,
	"health_regen" integer DEFAULT 1 NOT NULL,
	"max_mana" integer DEFAULT 50 NOT NULL,
	"mana_regen" integer DEFAULT 1 NOT NULL,
	"max_stamina" integer DEFAULT 100 NOT NULL,
	"stamina_regen" integer DEFAULT 5 NOT NULL,
	"custom_energies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_entity_prefabs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"entity_type" varchar NOT NULL,
	"scope" varchar DEFAULT 'user' NOT NULL,
	"model_asset_id" varchar,
	"model_url" text,
	"thumbnail_url" text,
	"stat_block_id" varchar,
	"energies_id" varchar,
	"animation_set_id" varchar,
	"crafting_profile_id" varchar,
	"skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_behavior_id" varchar,
	"scale" jsonb DEFAULT '{"x":1,"y":1,"z":1}'::jsonb NOT NULL,
	"collider_type" varchar DEFAULT 'capsule' NOT NULL,
	"collider_size" jsonb DEFAULT '{"radius":0.5,"height":2}'::jsonb NOT NULL,
	"loot_table" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dialogue_tree" jsonb,
	"shop_inventory" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_scene_prefabs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"scene_type" varchar NOT NULL,
	"scope" varchar DEFAULT 'user' NOT NULL,
	"thumbnail_url" text,
	"terrain_config" jsonb DEFAULT '{
    "size": "medium",
    "biome": "grassland",
    "terrainType": "flat"
  }'::jsonb NOT NULL,
	"lighting_config" jsonb DEFAULT '{
    "ambientColor": [0.3, 0.3, 0.3],
    "sunColor": [1, 1, 1],
    "sunIntensity": 1.5
  }'::jsonb NOT NULL,
	"environment_config" jsonb DEFAULT '{
    "fogEnabled": true,
    "skyboxType": "procedural",
    "timeOfDay": 12
  }'::jsonb NOT NULL,
	"placed_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"spawn_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"placed_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nav_mesh_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_shop_prefabs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"shop_type" varchar NOT NULL,
	"scope" varchar DEFAULT 'user' NOT NULL,
	"thumbnail_url" text,
	"inventory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"buy_rate" integer DEFAULT 100 NOT NULL,
	"sell_rate" integer DEFAULT 50 NOT NULL,
	"accepted_currencies" jsonb DEFAULT '["gold"]'::jsonb NOT NULL,
	"level_required" integer DEFAULT 1 NOT NULL,
	"reputation_required" jsonb,
	"restock_interval" integer DEFAULT 3600,
	"restock_on_purchase" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_skills" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"skill_type" varchar DEFAULT 'active' NOT NULL,
	"mana_cost" integer DEFAULT 0 NOT NULL,
	"stamina_cost" integer DEFAULT 0 NOT NULL,
	"health_cost" integer DEFAULT 0 NOT NULL,
	"cooldown" integer DEFAULT 0 NOT NULL,
	"cast_time" integer DEFAULT 0 NOT NULL,
	"damage_type" varchar DEFAULT 'physical',
	"base_damage" integer DEFAULT 0 NOT NULL,
	"damage_scaling" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"effects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"animation_name" varchar,
	"animation_speed" integer DEFAULT 100 NOT NULL,
	"vfx_id" varchar,
	"icon_url" varchar,
	"level_required" integer DEFAULT 1 NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_stat_blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"strength" integer DEFAULT 10 NOT NULL,
	"agility" integer DEFAULT 10 NOT NULL,
	"intelligence" integer DEFAULT 10 NOT NULL,
	"constitution" integer DEFAULT 10 NOT NULL,
	"wisdom" integer DEFAULT 10 NOT NULL,
	"charisma" integer DEFAULT 10 NOT NULL,
	"attack_power" integer DEFAULT 10 NOT NULL,
	"defense" integer DEFAULT 5 NOT NULL,
	"crit_chance" integer DEFAULT 5 NOT NULL,
	"crit_damage" integer DEFAULT 150 NOT NULL,
	"attack_speed" integer DEFAULT 100 NOT NULL,
	"move_speed" integer DEFAULT 100 NOT NULL,
	"physical_resist" integer DEFAULT 0 NOT NULL,
	"magic_resist" integer DEFAULT 0 NOT NULL,
	"fire_resist" integer DEFAULT 0 NOT NULL,
	"ice_resist" integer DEFAULT 0 NOT NULL,
	"growth_curves" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warlord_weapon_prefabs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"weapon_type" varchar NOT NULL,
	"scope" varchar DEFAULT 'user' NOT NULL,
	"model_asset_id" varchar,
	"model_url" text,
	"thumbnail_url" text,
	"base_damage" integer DEFAULT 10 NOT NULL,
	"attack_speed" integer DEFAULT 100 NOT NULL,
	"crit_chance" integer DEFAULT 5 NOT NULL,
	"range" integer DEFAULT 2 NOT NULL,
	"stat_bonuses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level_required" integer DEFAULT 1 NOT NULL,
	"class_restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rarity" varchar DEFAULT 'common' NOT NULL,
	"sell_price" integer DEFAULT 10 NOT NULL,
	"attach_bone" varchar DEFAULT 'RightHand',
	"attach_offset" jsonb DEFAULT '{"x":0,"y":0,"z":0}'::jsonb NOT NULL,
	"attach_rotation" jsonb DEFAULT '{"x":0,"y":0,"z":0}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_project_id_game_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."game_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_lobbies" ADD CONSTRAINT "game_lobbies_host_id_player_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_lobbies" ADD CONSTRAINT "game_lobbies_rts_project_id_rts_projects_id_fk" FOREIGN KEY ("rts_project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_lobby_id_game_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."game_lobbies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_winner_id_player_profiles_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grudge_characters" ADD CONSTRAINT "grudge_characters_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_lobby_id_game_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."game_lobbies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_players" ADD CONSTRAINT "lobby_players_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmo_characters" ADD CONSTRAINT "mmo_characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmo_characters" ADD CONSTRAINT "mmo_characters_world_id_mmo_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."mmo_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmo_chat_messages" ADD CONSTRAINT "mmo_chat_messages_world_id_mmo_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."mmo_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmo_chat_messages" ADD CONSTRAINT "mmo_chat_messages_character_id_mmo_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."mmo_characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmo_npcs" ADD CONSTRAINT "mmo_npcs_world_id_mmo_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."mmo_worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_actors" ADD CONSTRAINT "openrts_actors_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_effects" ADD CONSTRAINT "openrts_effects_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_map_styles" ADD CONSTRAINT "openrts_map_styles_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_movers" ADD CONSTRAINT "openrts_movers_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_projectiles" ADD CONSTRAINT "openrts_projectiles_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_trinkets" ADD CONSTRAINT "openrts_trinkets_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_units" ADD CONSTRAINT "openrts_units_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrts_weapons" ADD CONSTRAINT "openrts_weapons_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_characters" ADD CONSTRAINT "player_characters_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_characters" ADD CONSTRAINT "player_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_wallets" ADD CONSTRAINT "player_wallets_player_id_player_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_wallets" ADD CONSTRAINT "player_wallets_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rts_building_templates" ADD CONSTRAINT "rts_building_templates_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rts_building_templates" ADD CONSTRAINT "rts_building_templates_model_asset_id_rts_assets_id_fk" FOREIGN KEY ("model_asset_id") REFERENCES "public"."rts_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rts_unit_templates" ADD CONSTRAINT "rts_unit_templates_project_id_rts_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."rts_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rts_unit_templates" ADD CONSTRAINT "rts_unit_templates_model_asset_id_rts_assets_id_fk" FOREIGN KEY ("model_asset_id") REFERENCES "public"."rts_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_characters" ADD CONSTRAINT "saved_characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_trees" ADD CONSTRAINT "skill_trees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_audit_logs" ADD CONSTRAINT "storage_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_assets" ADD CONSTRAINT "unified_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_objects" ADD CONSTRAINT "user_objects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_storage_quotas" ADD CONSTRAINT "user_storage_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_player_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."player_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_model_asset_id_viewport_assets_id_fk" FOREIGN KEY ("model_asset_id") REFERENCES "public"."viewport_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_stat_block_id_warlord_stat_blocks_id_fk" FOREIGN KEY ("stat_block_id") REFERENCES "public"."warlord_stat_blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_energies_id_warlord_energies_id_fk" FOREIGN KEY ("energies_id") REFERENCES "public"."warlord_energies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_animation_set_id_warlord_animation_sets_id_fk" FOREIGN KEY ("animation_set_id") REFERENCES "public"."warlord_animation_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_crafting_profile_id_warlord_crafting_profiles_id_fk" FOREIGN KEY ("crafting_profile_id") REFERENCES "public"."warlord_crafting_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_entity_prefabs" ADD CONSTRAINT "warlord_entity_prefabs_ai_behavior_id_ai_behaviors_id_fk" FOREIGN KEY ("ai_behavior_id") REFERENCES "public"."ai_behaviors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_scene_prefabs" ADD CONSTRAINT "warlord_scene_prefabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_shop_prefabs" ADD CONSTRAINT "warlord_shop_prefabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_weapon_prefabs" ADD CONSTRAINT "warlord_weapon_prefabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warlord_weapon_prefabs" ADD CONSTRAINT "warlord_weapon_prefabs_model_asset_id_viewport_assets_id_fk" FOREIGN KEY ("model_asset_id") REFERENCES "public"."viewport_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_grudge_id_idx" ON "accounts" USING btree ("grudge_id");--> statement-breakpoint
CREATE INDEX "accounts_puter_uuid_idx" ON "accounts" USING btree ("puter_uuid");--> statement-breakpoint
CREATE INDEX "accounts_wallet_idx" ON "accounts" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "grudge_chars_account_id_idx" ON "grudge_characters" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "grudge_chars_grudge_id_idx" ON "grudge_characters" USING btree ("grudge_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "storage_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_operation" ON "storage_audit_logs" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "storage_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_objects_user" ON "user_objects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_objects_namespace" ON "user_objects" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "idx_user_objects_key" ON "user_objects" USING btree ("object_key");