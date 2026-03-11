import "../env";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();

  // Check if already seeded
  const { rows } = await client.query("SELECT count(*) as cnt FROM openrts_units");
  if (parseInt(rows[0].cnt) > 0) {
    console.log(`Already seeded (${rows[0].cnt} units). Skipping.`);
    await pool.end();
    return;
  }

  console.log("🌱 Seeding OpenRTS data...");

  // Movers
  await client.query(`
    INSERT INTO openrts_movers (name, pathfinding_mode, heightmap, standing_mode) VALUES
    ('Ground', 'Walk', 'Ground', 'Stand'),
    ('Fly', 'Fly', 'Sky', 'Stand'),
    ('Hover', 'Walk', 'Air', 'Stand'),
    ('Amphibious', 'Walk', 'Ground', 'Stand')
  `);
  console.log("  ✅ 4 movers");

  // Effects
  await client.query(`
    INSERT INTO openrts_effects (name, effect_type, damage, radius, duration, particle_effect) VALUES
    ('SlashDamage', 'damage', 15, NULL, NULL, 'slash_sparks'),
    ('ArrowHit', 'damage', 12, NULL, NULL, 'arrow_impact'),
    ('FireBurst', 'damage', 25, '3', NULL, 'fire_explosion'),
    ('IceShard', 'damage', 18, NULL, NULL, 'ice_shatter'),
    ('HealPulse', 'heal', -20, '4', NULL, 'heal_glow'),
    ('PoisonCloud', 'debuff', 5, '3', '8', 'poison_mist'),
    ('ShieldBuff', 'buff', 0, NULL, '10', 'shield_aura'),
    ('LightningStrike', 'damage', 40, '2', NULL, 'lightning_bolt')
  `);
  console.log("  ✅ 8 effects");

  // Weapons
  await client.query(`
    INSERT INTO openrts_weapons (name, ui_name, range, scan_range, period, damage, damage_type, effect_link) VALUES
    ('Longsword', 'Longsword', '1.5', '5', '1.5', 15, 'physical', 'SlashDamage'),
    ('ShortBow', 'Short Bow', '8', '10', '2.0', 10, 'physical', 'ArrowHit'),
    ('Longbow', 'Long Bow', '12', '14', '2.5', 14, 'physical', 'ArrowHit'),
    ('Fireball', 'Fireball', '9', '11', '4.0', 25, 'fire', 'FireBurst'),
    ('IceBolt', 'Ice Bolt', '8', '10', '3.0', 18, 'ice', 'IceShard'),
    ('HealingStaff', 'Healing Staff', '6', '8', '3.5', 0, 'magic', 'HealPulse'),
    ('Spear', 'Spear', '2.5', '5', '2.0', 18, 'physical', 'SlashDamage'),
    ('WarHammer', 'War Hammer', '1.5', '4', '2.5', 22, 'physical', 'SlashDamage'),
    ('Crossbow', 'Crossbow', '10', '12', '3.5', 20, 'physical', 'ArrowHit'),
    ('LightningWand', 'Lightning Wand', '7', '9', '3.0', 30, 'magic', 'LightningStrike')
  `);
  console.log("  ✅ 10 weapons");

  // Units
  await client.query(`
    INSERT INTO openrts_units (name, ui_name, race, speed, max_health, sight, mover_link, weapon_links, cost, build_time, radius, separation_radius, mass) VALUES
    ('Footman', 'Footman', 'human', '2.5', 120, '6', 'Ground', ARRAY['Longsword'], '{"gold":100}', 12, '0.25', '0.25', '1.0'),
    ('Archer', 'Archer', 'human', '2.8', 80, '9', 'Ground', ARRAY['ShortBow'], '{"gold":120}', 14, '0.25', '0.25', '1.0'),
    ('Knight', 'Knight', 'human', '3.5', 200, '7', 'Ground', ARRAY['Longsword'], '{"gold":250}', 25, '0.25', '0.25', '1.0'),
    ('Priest', 'Priest', 'human', '2.2', 60, '8', 'Ground', ARRAY['HealingStaff'], '{"gold":180}', 20, '0.25', '0.25', '1.0'),
    ('Crossbowman', 'Crossbowman', 'human', '2.3', 90, '10', 'Ground', ARRAY['Crossbow'], '{"gold":150}', 16, '0.25', '0.25', '1.0'),
    ('Grunt', 'Grunt', 'alien', '2.3', 150, '5', 'Ground', ARRAY['WarHammer'], '{"gold":110}', 10, '0.25', '0.25', '1.0'),
    ('Shaman', 'Shaman', 'alien', '2.0', 70, '8', 'Ground', ARRAY['LightningWand'], '{"gold":200}', 22, '0.25', '0.25', '1.0'),
    ('Raider', 'Raider', 'alien', '4.0', 100, '7', 'Ground', ARRAY['Spear'], '{"gold":160}', 18, '0.25', '0.25', '1.0'),
    ('Wyvern', 'Wyvern Rider', 'alien', '5.0', 180, '10', 'Fly', ARRAY['Spear'], '{"gold":300}', 30, '0.25', '0.25', '1.0'),
    ('Skeleton', 'Skeleton Warrior', 'undead', '2.0', 80, '5', 'Ground', ARRAY['Longsword'], '{"gold":60}', 8, '0.25', '0.25', '1.0'),
    ('SkeletonArcher', 'Skeleton Archer', 'undead', '2.2', 55, '9', 'Ground', ARRAY['ShortBow'], '{"gold":75}', 10, '0.25', '0.25', '1.0'),
    ('Necromancer', 'Necromancer', 'undead', '1.8', 90, '8', 'Ground', ARRAY['Fireball'], '{"gold":220}', 24, '0.25', '0.25', '1.0'),
    ('Ghost', 'Wraith', 'undead', '3.5', 60, '8', 'Fly', ARRAY['IceBolt'], '{"gold":180}', 20, '0.25', '0.25', '1.0'),
    ('SiegeTank', 'Siege Tank', 'mechanical', '1.5', 400, '10', 'Ground', ARRAY['Fireball'], '{"gold":350}', 35, '0.5', '0.5', '3.0'),
    ('ScoutDrone', 'Scout Drone', 'mechanical', '6.0', 40, '14', 'Fly', ARRAY[]::text[], '{"gold":80}', 8, '0.25', '0.25', '1.0'),
    ('Treant', 'Treant', 'nature', '1.2', 350, '6', 'Ground', ARRAY['WarHammer'], '{"gold":280}', 28, '0.6', '0.6', '2.5'),
    ('Fairy', 'Fairy Healer', 'nature', '3.5', 45, '9', 'Fly', ARRAY['HealingStaff'], '{"gold":150}', 16, '0.25', '0.25', '1.0'),
    ('Wolf', 'Dire Wolf', 'nature', '5.5', 90, '8', 'Ground', ARRAY['Spear'], '{"gold":120}', 12, '0.25', '0.25', '1.0')
  `);
  console.log("  ✅ 18 units");

  client.release();
  await pool.end();
  console.log("\n✅ OpenRTS seed complete!");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
