/**
 * GAME STATE PERSISTENCE SERVICE
 * Handles database operations for Overdrive Racing, MMO World, and Swarm RTS
 */

import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";

// ============================================
// OVERDRIVE RACING PERSISTENCE
// ============================================

export async function saveOverdriveRace(raceData: any) {
  try {
    const result = await sql`
      INSERT INTO overdrive_races (track_id, max_players, status)
      VALUES (${raceData.trackId}, ${raceData.maxPlayers}, 'starting')
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error saving overdrive race:", error);
    throw error;
  }
}

export async function saveOverdriveVehicle(vehicleData: any) {
  try {
    const result = await sql`
      INSERT INTO overdrive_vehicles (
        race_id, player_id, x, y, vx, vy, rotation, 
        acceleration, health, boost, checkpoint
      ) VALUES (
        ${vehicleData.raceId}, ${vehicleData.playerId}, 
        ${vehicleData.x}, ${vehicleData.y}, 
        ${vehicleData.vx}, ${vehicleData.vy}, 
        ${vehicleData.rotation}, ${vehicleData.acceleration}, 
        ${vehicleData.health}, ${vehicleData.boost}, 
        ${vehicleData.checkpoint}
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error saving overdrive vehicle:", error);
    throw error;
  }
}

export async function updateOverdriveVehicleState(vehicleId: string, state: any) {
  try {
    const result = await sql`
      UPDATE overdrive_vehicles
      SET 
        x = COALESCE(${state.x}, x),
        y = COALESCE(${state.y}, y),
        vx = COALESCE(${state.vx}, vx),
        vy = COALESCE(${state.vy}, vy),
        rotation = COALESCE(${state.rotation}, rotation),
        acceleration = COALESCE(${state.acceleration}, acceleration),
        health = COALESCE(${state.health}, health),
        boost = COALESCE(${state.boost}, boost),
        checkpoint = COALESCE(${state.checkpoint}, checkpoint),
        drifting = COALESCE(${state.drifting}, drifting),
        finished = COALESCE(${state.finished}, finished),
        finish_time = COALESCE(${state.finishTime}, finish_time),
        updated_at = NOW()
      WHERE id = ${vehicleId}
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error updating overdrive vehicle state:", error);
    throw error;
  }
}

export async function finishOverdriveRace(raceId: string, winner: { playerId: string; time: number }) {
  try {
    // Mark race as finished
    await sql`
      UPDATE overdrive_races
      SET status = 'finished', finished_at = NOW(), updated_at = NOW()
      WHERE id = ${raceId}
    `;

    // Get all vehicles from this race for leaderboard
    const vehicles = await sql`
      SELECT * FROM overdrive_vehicles 
      WHERE race_id = ${raceId} AND finished = true 
      ORDER BY finish_time ASC
    `;

    return vehicles as any;
  } catch (error) {
    console.error("Error finishing overdrive race:", error);
    throw error;
  }
}

export async function addToOverdriveLeaderboard(entry: any) {
  try {
    // Get current rank
    const existing = await sql`
      SELECT COUNT(*) as count FROM overdrive_leaderboard 
      WHERE track_id = ${entry.trackId} AND time < ${entry.time}
    `;
    const rank = ((existing as any)[0]?.count || 0) + 1;

    const result = await sql`
      INSERT INTO overdrive_leaderboard (
        player_id, player_name, track_id, time, difficulty, rank
      ) VALUES (
        ${entry.playerId}, ${entry.playerName}, 
        ${entry.trackId}, ${entry.time}, 
        ${entry.difficulty}, ${rank}
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error adding to leaderboard:", error);
    throw error;
  }
}

// ============================================
// MMO WORLD PERSISTENCE
// ============================================

export async function createMMOSession(sessionData: any) {
  try {
    const result = await sql`
      INSERT INTO mmo_game_sessions (
        player_id, character_id, world_id
      ) VALUES (
        ${sessionData.playerId}, 
        ${sessionData.characterId}, 
        ${sessionData.worldId}
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error creating MMO session:", error);
    throw error;
  }
}

export async function saveMMOCharacterState(charState: any) {
  try {
    const result = await sql`
      INSERT INTO mmo_character_state (
        character_id, player_id, world_id, pos_x, pos_y, 
        direction, animation_state, health, mana, level, experience
      ) VALUES (
        ${charState.characterId}, ${charState.playerId}, 
        ${charState.worldId}, ${charState.posX}, ${charState.posY},
        ${charState.direction}, ${charState.animationState},
        ${charState.health}, ${charState.mana},
        ${charState.level}, ${charState.experience}
      )
      ON CONFLICT (character_id) DO UPDATE SET
        pos_x = EXCLUDED.pos_x,
        pos_y = EXCLUDED.pos_y,
        direction = EXCLUDED.direction,
        animation_state = EXCLUDED.animation_state,
        health = EXCLUDED.health,
        mana = EXCLUDED.mana,
        level = EXCLUDED.level,
        experience = EXCLUDED.experience,
        last_saved_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error saving MMO character state:", error);
    throw error;
  }
}

export async function addMMOInventoryItem(itemData: any) {
  try {
    const result = await sql`
      INSERT INTO mmo_inventory_items (
        character_id, item_name, item_type, quantity
      ) VALUES (
        ${itemData.characterId}, ${itemData.itemName},
        ${itemData.itemType}, ${itemData.quantity}
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error adding MMO inventory item:", error);
    throw error;
  }
}

export async function endMMOSession(sessionId: string, playtimeSeconds: number) {
  try {
    const result = await sql`
      UPDATE mmo_game_sessions
      SET session_ended_at = NOW(), playtime_seconds = ${playtimeSeconds}
      WHERE id = ${sessionId}
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error ending MMO session:", error);
    throw error;
  }
}

// ============================================
// SWARM RTS PERSISTENCE
// ============================================

export async function createRTSMatchSession(sessionData: any) {
  try {
    const result = await sql`
      INSERT INTO rts_match_sessions (
        map_id, game_mode, max_players, status
      ) VALUES (
        ${sessionData.mapId}, 
        ${sessionData.gameMode}, 
        ${sessionData.maxPlayers}, 
        'waiting'
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error creating RTS match session:", error);
    throw error;
  }
}

export async function addRTSPlayerState(playerData: any) {
  try {
    const result = await sql`
      INSERT INTO rts_player_state (
        match_id, player_id, faction_id, gold, wood, food
      ) VALUES (
        ${playerData.matchId}, ${playerData.playerId},
        ${playerData.factionId}, 500, 300, 300
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error adding RTS player state:", error);
    throw error;
  }
}

export async function spawnRTSUnit(unitData: any) {
  try {
    const result = await sql`
      INSERT INTO rts_unit_instances (
        match_id, player_id, unit_def_id, faction_id, x, y, 
        health, max_health, status
      ) VALUES (
        ${unitData.matchId}, ${unitData.playerId},
        ${unitData.unitDefId}, ${unitData.factionId},
        ${unitData.x}, ${unitData.y},
        ${unitData.health}, ${unitData.maxHealth}, 'active'
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error spawning RTS unit:", error);
    throw error;
  }
}

export async function updateRTSUnitState(unitId: string, state: any) {
  try {
    const result = await sql`
      UPDATE rts_unit_instances
      SET 
        x = COALESCE(${state.x}, x),
        y = COALESCE(${state.y}, y),
        health = COALESCE(${state.health}, health),
        status = COALESCE(${state.status}, status),
        updated_at = NOW()
      WHERE id = ${unitId}
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error updating RTS unit state:", error);
    throw error;
  }
}

export async function logRTSMatchEvent(eventData: any) {
  try {
    const result = await sql`
      INSERT INTO rts_match_events (
        match_id, event_type, player_id, faction_id, details
      ) VALUES (
        ${eventData.matchId}, ${eventData.eventType},
        ${eventData.playerId}, ${eventData.factionId},
        ${JSON.stringify(eventData.details)}::jsonb
      )
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error logging RTS match event:", error);
    throw error;
  }
}

export async function finishRTSMatch(matchId: string, winnerFaction: string) {
  try {
    const result = await sql`
      UPDATE rts_match_sessions
      SET status = 'finished', end_time = NOW(), winner_faction = ${winnerFaction}
      WHERE id = ${matchId}
      RETURNING *
    `;
    return (result as any)[0];
  } catch (error) {
    console.error("Error finishing RTS match:", error);
    throw error;
  }
}
