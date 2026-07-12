import {
  GameState, Unit, Building, Resource, Projectile, FloatingText, VfxEffect, GroundEffect,
  Vec2, Faction, UnitType, BuildingType, AIState, Island, CreepCamp, ItemInstance,
  PlayerResources, TechTier, HERO_XP_TABLE,
} from './types';
import {
  UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS,
  WATER_SPEED_MULT, WATER_DAMAGE_RATE, CYCLE_LENGTH, DAY_DURATION,
  UPKEEP_NONE_MAX, UPKEEP_LOW_MAX, UPKEEP_NONE_RATE, UPKEEP_LOW_RATE, UPKEEP_HIGH_RATE,
  PRIEST_HEAL_RANGE, PRIEST_HEAL_AMOUNT, PRIEST_HEAL_PULSE,
} from './constants';
import { MapDef } from './maps';
import { computePathWaypoints, isOnIsland } from './pathfinding';
import { HIT_VFX, randomRetroCrit } from './vfx';

let _nextId = 1;
function uid(): string { return String(_nextId++); }
function dist(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(v: Vec2): Vec2 { const d = Math.hypot(v.x, v.y); return d < 0.001 ? { x: 0, y: 0 } : { x: v.x / d, y: v.y / d }; }

// ── Unit factory ───────────────────────────────────────────────────────────────
function makeUnit(faction: Faction, type: UnitType, pos: Vec2, isHero = false): Unit {
  const cfg = UNIT_CONFIGS[type];
  const heroCfg = isHero ? HERO_CONFIGS.find(h => h.type === type) : null;
  const hp = heroCfg?.hp ?? cfg?.hp ?? 50;
  const mana = heroCfg?.mana ?? cfg?.mana ?? 0;

  return {
    id: uid(), faction, type,
    role: isHero ? 'hero' : (cfg?.role ?? 'melee'),
    pos: { ...pos }, target: null, waypoints: [],
    attackTargetId: null, harvestTargetId: null, returnToId: null,
    hp, maxHp: hp, mana, maxMana: mana, armor: heroCfg?.armor ?? cfg?.armor ?? 0,
    state: 'idle',
    anim: { action: 'idle', frame: 0, elapsed: 0, flipX: false },
    carryType: null, carryAmount: 0, attackCooldown: 0,
    selected: false, inWater: false,
    slowTimer: 0, healTimer: 0, stunTimer: 0, aoeTimer: 0,
    buildTargetId: null,
    isHero,
    heroLevel: isHero ? 1 : 0,
    heroXp: 0,
    heroXpToNext: isHero ? HERO_XP_TABLE[1] : 0,
    abilityPoints: isHero ? 1 : 0,
    abilities: heroCfg ? heroCfg.abilities.map(id => ({ abilityId: id, rank: 0, cooldownRemaining: 0 })) : [],
    inventory: isHero ? [null, null, null, null, null, null] : [],
    controlGroup: 0,
    foodCost: isHero ? 5 : (cfg?.foodCost ?? 1),
    kills: 0,
  };
}

function makeBuilding(faction: Faction, type: BuildingType, pos: Vec2, underConstruction = false): Building {
  const cfg = BUILDING_CONFIGS[type];
  return {
    id: uid(), faction, type, pos: { ...pos },
    hp: cfg.hp, maxHp: cfg.hp,
    trainingQueue: [], trainingProgress: 0, rallyPoint: null,
    underConstruction, constructionProgress: underConstruction ? 0 : 1,
    attackCooldown: 0, techTier: cfg.techTier as TechTier,
    upgrading: false, upgradeProgress: 0, upgradeTarget: null,
  };
}

function makeResource(type: 'tree' | 'goldmine', pos: Vec2, amount?: number): Resource {
  const defaultAmount = type === 'tree' ? 220 : 12500;
  const amt = amount ?? defaultAmount;
  return {
    id: uid(), type, pos: { ...pos },
    amount: amt, maxAmount: amt,
    frame: 0, frameElapsed: 0, harvesting: false,
    workerSlots: type === 'goldmine' ? 5 : undefined,
    activeWorkers: 0,
  };
}

// ── Upkeep calculation ─────────────────────────────────────────────────────────
function calcUpkeep(food: number): { level: 'none' | 'low' | 'high'; rate: number } {
  if (food <= UPKEEP_NONE_MAX) return { level: 'none', rate: UPKEEP_NONE_RATE };
  if (food <= UPKEEP_LOW_MAX) return { level: 'low', rate: UPKEEP_LOW_RATE };
  return { level: 'high', rate: UPKEEP_HIGH_RATE };
}

// ── Food count ─────────────────────────────────────────────────────────────────
function countFood(state: GameState, faction: Faction): number {
  let food = 0;
  for (const [, u] of state.units) {
    if (u.faction === faction && u.state !== 'dead') food += u.foodCost;
  }
  return food;
}

function calcMaxFood(state: GameState, faction: Faction): number {
  let max = 0;
  for (const [, b] of state.buildings) {
    if (b.faction === faction && !b.underConstruction) {
      const cfg = BUILDING_CONFIGS[b.type as keyof typeof BUILDING_CONFIGS];
      if (cfg) max += cfg.foodProvided;
    }
  }
  return Math.min(max, 100); // WC3 cap
}

// ── Hero XP & Leveling ────────────────────────────────────────────────────────
function grantXp(unit: Unit, xp: number, state: GameState): void {
  if (!unit.isHero || unit.heroLevel >= 10) return;
  unit.heroXp += xp;
  while (unit.heroLevel < 10 && unit.heroXp >= unit.heroXpToNext) {
    unit.heroLevel++;
    unit.abilityPoints++;
    const heroCfg = HERO_CONFIGS.find(h => h.type === unit.type);
    if (heroCfg) {
      unit.maxHp += heroCfg.hpPerLevel;
      unit.hp = Math.min(unit.hp + heroCfg.hpPerLevel, unit.maxHp);
      unit.maxMana += heroCfg.manaPerLevel;
      unit.mana = Math.min(unit.mana + heroCfg.manaPerLevel, unit.maxMana);
      unit.armor += heroCfg.armorPerLevel;
    }
    unit.heroXpToNext = unit.heroLevel < 10 ? HERO_XP_TABLE[unit.heroLevel] : Infinity;
    // Level up VFX
    state.vfxEffects.set(uid(), { id: uid(), pos: { ...unit.pos }, type: 'level_up', age: 0, duration: 1.2 });
    state.floatingTexts.push({ id: uid(), pos: { ...unit.pos }, text: `Level ${unit.heroLevel}!`, color: '#ffd700', age: 0, maxAge: 2 });
  }
}

// ── Damage with armor reduction (WC3 formula) ─────────────────────────────────
function calcDamage(baseDmg: number, armor: number): number {
  // WC3: each point of armor reduces damage by ~6%
  const reduction = (0.06 * armor) / (1 + 0.06 * armor);
  return Math.max(1, Math.round(baseDmg * (1 - reduction)));
}

// ── Item drop from creep camp ──────────────────────────────────────────────────
function rollItemDrop(camp: CreepCamp): string | null {
  for (const drop of camp.dropTable) {
    if (Math.random() < drop.chance) return drop.itemId;
  }
  return null;
}

function giveItemToHero(hero: Unit, itemId: string): ItemInstance | null {
  const slot = hero.inventory.findIndex(s => s === null);
  if (slot === -1) return null; // inventory full
  const instance: ItemInstance = { id: uid(), defId: itemId };
  hero.inventory[slot] = instance;
  // Apply permanent stat bonuses
  const def = ITEM_DEFS[itemId];
  if (def) {
    if (def.bonusHp) { hero.maxHp += def.bonusHp; hero.hp += def.bonusHp; }
    if (def.bonusDamage) { /* tracked in combat */ }
    if (def.bonusArmor) hero.armor += def.bonusArmor;
    if (def.bonusMana) { hero.maxMana += def.bonusMana; hero.mana += def.bonusMana; }
  }
  return instance;
}

// ── Create initial state ───────────────────────────────────────────────────────
export function createInitialState(mapDef: MapDef, playerFaction: 'kingdom' | 'legion' = 'kingdom'): GameState {
  const islands: Island[] = mapDef.islands.map(d => ({ ...d }));
  const state: GameState = {
    tick: 0, timeElapsed: 0,
    units: new Map(), buildings: new Map(), resources: new Map(),
    projectiles: new Map(), vfxEffects: new Map(), groundEffects: new Map(),
    floatingTexts: [], creepCamps: [], islands,
    camera: { x: mapDef.blueCastle.x - 400, y: mapDef.blueCastle.y - 250 },
    zoom: 1,
    playerResources: { gold: mapDef.startingResources.gold, wood: mapDef.startingResources.wood, food: 0, maxFood: 12 },
    enemyResources:  { gold: mapDef.startingResources.gold, wood: mapDef.startingResources.wood, food: 0, maxFood: 12 },
    selected: new Set(), dragStart: null, dragEnd: null, buildMode: null,
    winner: null,
    aiState: { phase: 'early', phaseTimer: 0, attackTimer: 0, lastAction: '', heroLevel: 0, techTier: 1 },
    dayNightCycle: 0, timeOfDay: 'day',
    upkeepLevel: 'none', techTier: 1,
    controlGroups: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set(), 7: new Set(), 8: new Set(), 9: new Set() },
    completedUpgrades: new Set(),
    deadHeroes: [],
    playerFaction, popCap: 12, mapId: mapDef.id,
    gameStatus: 'playing',
  };

  // Castles (pre-built)
  const bc = makeBuilding('blue', 'castle', mapDef.blueCastle);
  const rc = makeBuilding('red',  'castle', mapDef.redCastle);
  state.buildings.set(bc.id, bc);
  state.buildings.set(rc.id, rc);

  // Starting units
  const isLegion = playerFaction === 'legion';
  mapDef.startingUnits.forEach(u => {
    let type: UnitType = u.type;
    if (isLegion && u.faction === 'blue' && u.type === 'pawn') type = 'orcPawn';
    const unit = makeUnit(u.faction, type, u.pos);
    state.units.set(unit.id, unit);
  });

  // Resources
  mapDef.resources.forEach(r => {
    const res = makeResource(r.type, r.pos, r.amount);
    state.resources.set(res.id, res);
  });

  // Creep camps → spawn neutral units
  mapDef.creepCamps.forEach((camp, i) => {
    const campObj: CreepCamp = { id: `camp_${i}`, ...camp };
    state.creepCamps.push(campObj);
    camp.creeps.forEach((c, j) => {
      const offset = { x: camp.pos.x + (j - 1) * 40, y: camp.pos.y + (j % 2) * 30 };
      const creepUnit = makeUnit('neutral', c.type, offset);
      // Scale creep stats by level
      creepUnit.hp = Math.round(creepUnit.hp * (1 + c.level * 0.3));
      creepUnit.maxHp = creepUnit.hp;
      state.units.set(creepUnit.id, creepUnit);
    });
  });

  // Recalc food
  state.playerResources.food = countFood(state, 'blue');
  state.playerResources.maxFood = calcMaxFood(state, 'blue');
  state.enemyResources.food = countFood(state, 'red');
  state.enemyResources.maxFood = calcMaxFood(state, 'red');

  return state;
}

// ── Spawn a unit (checks food cap) ─────────────────────────────────────────────
export function spawnUnit(state: GameState, faction: Faction, type: UnitType, pos: Vec2, isHero = false): Unit | null {
  const res = faction === 'blue' ? state.playerResources : state.enemyResources;
  const cfg = UNIT_CONFIGS[type];
  const foodCost = isHero ? 5 : (cfg?.foodCost ?? 1);
  if (res.food + foodCost > res.maxFood && !isHero) return null;
  const unit = makeUnit(faction, type, pos, isHero);
  state.units.set(unit.id, unit);
  res.food += unit.foodCost;
  return unit;
}

// ── Main game tick ─────────────────────────────────────────────────────────────
export function updateGame(state: GameState, dt: number): void {
  if (state.gameStatus !== 'playing') return;

  state.tick++;
  state.timeElapsed += dt;

  // Day/Night cycle
  state.dayNightCycle = (state.dayNightCycle + dt) % CYCLE_LENGTH;
  state.timeOfDay = state.dayNightCycle < DAY_DURATION ? 'day' : 'night';

  // Upkeep
  const upkeep = calcUpkeep(state.playerResources.food);
  state.upkeepLevel = upkeep.level;

  // Food recalc
  state.playerResources.food = countFood(state, 'blue');
  state.playerResources.maxFood = calcMaxFood(state, 'blue');
  state.enemyResources.food = countFood(state, 'red');
  state.enemyResources.maxFood = calcMaxFood(state, 'red');
  state.popCap = state.playerResources.maxFood;

  // Mana regen for heroes
  for (const [, u] of state.units) {
    if (u.isHero && u.state !== 'dead' && u.mana < u.maxMana) {
      u.mana = Math.min(u.maxMana, u.mana + 0.6 * dt);
    }
  }

  // Update units
  for (const [, unit] of state.units) {
    if (unit.state === 'dead') continue;

    // Water damage
    unit.inWater = !isOnIsland(unit.pos, state.islands);
    if (unit.inWater) {
      unit.hp -= WATER_DAMAGE_RATE * dt;
      if (unit.hp <= 0) { killUnit(state, unit, null); continue; }
    }

    // Stun timer
    if (unit.stunTimer > 0) {
      unit.stunTimer -= dt;
      unit.state = 'stunned';
      continue;
    }

    // Ability cooldowns
    for (const ab of unit.abilities) {
      if (ab.cooldownRemaining > 0) ab.cooldownRemaining = Math.max(0, ab.cooldownRemaining - dt);
    }

    // Attack cooldown
    if (unit.attackCooldown > 0) unit.attackCooldown -= dt;

    // Movement
    if (unit.state === 'moving' && unit.target) {
      const cfg = UNIT_CONFIGS[unit.type];
      const speed = (cfg?.speed ?? 80) * (unit.inWater ? WATER_SPEED_MULT : 1) * dt;
      const dx = unit.target.x - unit.pos.x;
      const dy = unit.target.y - unit.pos.y;
      const d = Math.hypot(dx, dy);

      if (d < speed) {
        unit.pos = { ...unit.target };
        if (unit.waypoints.length > 0) {
          unit.target = unit.waypoints.shift()!;
        } else {
          unit.target = null;
          unit.state = 'idle';
        }
      } else {
        const n = norm({ x: dx, y: dy });
        unit.pos.x += n.x * speed;
        unit.pos.y += n.y * speed;
        unit.anim.flipX = n.x < 0;
      }
      unit.anim.action = 'run';
    }

    // Combat
    if (unit.attackTargetId && unit.state !== 'moving') {
      const target = state.units.get(unit.attackTargetId);
      if (!target || target.state === 'dead') {
        unit.attackTargetId = null;
        unit.state = 'idle';
        continue;
      }
      const cfg = UNIT_CONFIGS[unit.type];
      const heroCfg = unit.isHero ? HERO_CONFIGS.find(h => h.type === unit.type) : null;
      const range = heroCfg?.range ?? cfg?.range ?? 50;
      const d = dist(unit.pos, target.pos);

      if (d <= range + 10) {
        unit.state = 'attacking';
        unit.anim.action = 'attack';
        if (unit.attackCooldown <= 0) {
          const baseDmg = heroCfg?.damage ?? cfg?.damage ?? 10;
          // Add item damage bonuses
          let bonusDmg = 0;
          for (const slot of unit.inventory) {
            if (slot) {
              const def = ITEM_DEFS[slot.defId];
              if (def?.bonusDamage) bonusDmg += def.bonusDamage;
            }
          }
          // Hero level scaling
          const levelDmg = unit.isHero && heroCfg ? heroCfg.damagePerLevel * (unit.heroLevel - 1) : 0;
          const totalDmg = calcDamage(baseDmg + bonusDmg + levelDmg, target.armor);

          if (range > 80) {
            // Ranged → fire projectile
            const dir = norm({ x: target.pos.x - unit.pos.x, y: target.pos.y - unit.pos.y });
            const proj: Projectile = {
              id: uid(), pos: { ...unit.pos },
              vel: { x: dir.x * 400, y: dir.y * 400 },
              targetId: target.id, damage: totalDmg, faction: unit.faction,
              attackerType: unit.type,
            };
            state.projectiles.set(proj.id, proj);
          } else {
            // Melee → instant damage
            target.hp -= totalDmg;
            state.floatingTexts.push({
              id: uid(), pos: { ...target.pos },
              text: `-${totalDmg}`, color: unit.faction === 'blue' ? '#ff4444' : '#ff8800',
              age: 0, maxAge: 1,
            });
            // Hit VFX
            const vfxType = HIT_VFX[unit.type] ?? randomRetroCrit();
            state.vfxEffects.set(uid(), { id: uid(), pos: { ...target.pos }, type: vfxType, age: 0, duration: 0.3 });

            if (target.hp <= 0) killUnit(state, target, unit);
          }
          unit.attackCooldown = heroCfg?.attackSpeed ?? cfg?.attackSpeed ?? 1.0;
        }
      } else {
        // Move toward target
        unit.target = { ...target.pos };
        unit.waypoints = computePathWaypoints(state.islands, unit.pos, target.pos);
        if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
        unit.state = 'moving';
      }
    }

    // Harvesting
    if (unit.role === 'worker' && unit.harvestTargetId) {
      const res = state.resources.get(unit.harvestTargetId);
      if (!res || res.amount <= 0) {
        unit.harvestTargetId = null;
        unit.state = 'idle';
        continue;
      }
      const d = dist(unit.pos, res.pos);
      if (d < 60) {
        unit.state = 'harvesting';
        unit.anim.action = 'interact';
        const cfg = UNIT_CONFIGS[unit.type];
        const harvestAmt = (cfg?.harvestSpeed ?? 10) * dt;
        const gathered = Math.min(harvestAmt, res.amount, (cfg?.carryCapacity ?? 30) - unit.carryAmount);
        res.amount -= gathered;
        unit.carryAmount += gathered;
        unit.carryType = res.type === 'tree' ? 'wood' : 'gold';
        if (unit.carryAmount >= (cfg?.carryCapacity ?? 30) || res.amount <= 0) {
          // Return to nearest castle/keep/fortress
          unit.harvestTargetId = null;
          const returnBuilding = findNearestTownHall(state, unit.faction, unit.pos);
          if (returnBuilding) {
            unit.returnToId = returnBuilding.id;
            unit.target = { ...returnBuilding.pos };
            unit.waypoints = computePathWaypoints(state.islands, unit.pos, returnBuilding.pos);
            if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
            unit.state = 'moving';
          }
        }
      } else {
        unit.target = { ...res.pos };
        unit.waypoints = computePathWaypoints(state.islands, unit.pos, res.pos);
        if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
        unit.state = 'moving';
      }
    }

    // Returning resources
    if (unit.returnToId && unit.carryAmount > 0) {
      const bld = state.buildings.get(unit.returnToId);
      if (bld && dist(unit.pos, bld.pos) < 80) {
        const res = unit.faction === 'blue' ? state.playerResources : state.enemyResources;
        if (unit.carryType === 'wood') res.wood += unit.carryAmount;
        else res.gold += Math.round(unit.carryAmount * calcUpkeep(res.food).rate);
        unit.carryAmount = 0;
        unit.carryType = null;
        unit.returnToId = null;
        unit.state = 'idle';
      }
    }

    // Building construction
    if (unit.buildTargetId) {
      const bld = state.buildings.get(unit.buildTargetId);
      if (bld && bld.underConstruction) {
        const d = dist(unit.pos, bld.pos);
        if (d < 80) {
          unit.state = 'building';
          unit.anim.action = 'interact';
          const cfg = BUILDING_CONFIGS[bld.type];
          bld.constructionProgress += dt / cfg.buildTime;
          if (bld.constructionProgress >= 1) {
            bld.constructionProgress = 1;
            bld.underConstruction = false;
            unit.buildTargetId = null;
            unit.state = 'idle';
          }
        } else {
          unit.target = { ...bld.pos };
          unit.state = 'moving';
        }
      } else {
        unit.buildTargetId = null;
        unit.state = 'idle';
      }
    }
  }

  // Update projectiles
  for (const [pid, proj] of state.projectiles) {
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    const target = state.units.get(proj.targetId);
    if (!target || target.state === 'dead') { state.projectiles.delete(pid); continue; }
    if (dist(proj.pos, target.pos) < 20) {
      target.hp -= proj.damage;
      state.floatingTexts.push({
        id: uid(), pos: { ...target.pos },
        text: `-${proj.damage}`, color: '#ff4444', age: 0, maxAge: 1,
      });
      const vfxType = HIT_VFX[proj.attackerType ?? ''] ?? randomRetroCrit();
      state.vfxEffects.set(uid(), { id: uid(), pos: { ...target.pos }, type: vfxType, age: 0, duration: 0.3 });
      if (target.hp <= 0) {
        const attacker = findUnitByProjectile(state, proj);
        killUnit(state, target, attacker);
      }
      state.projectiles.delete(pid);
    }
  }

  // Building training
  for (const [, bld] of state.buildings) {
    if (bld.underConstruction || bld.trainingQueue.length === 0) continue;
    const unitType = bld.trainingQueue[0];
    const cfg = UNIT_CONFIGS[unitType];
    if (!cfg) continue;
    bld.trainingProgress += dt / cfg.trainTime;
    if (bld.trainingProgress >= 1) {
      bld.trainingProgress = 0;
      bld.trainingQueue.shift();
      const rally = bld.rallyPoint ?? { x: bld.pos.x + 60, y: bld.pos.y + 80 };
      spawnUnit(state, bld.faction, unitType, rally);
    }
  }

  // Tower auto-attack
  for (const [, bld] of state.buildings) {
    if (!BUILDING_CONFIGS[bld.type].canAttack || bld.underConstruction) continue;
    if (bld.attackCooldown > 0) { bld.attackCooldown -= dt; continue; }
    const range = BUILDING_CONFIGS[bld.type].attackRange ?? 220;
    let closest: Unit | null = null;
    let closestDist = Infinity;
    for (const [, u] of state.units) {
      if (u.faction === bld.faction || u.state === 'dead') continue;
      const d = dist(bld.pos, u.pos);
      if (d < range && d < closestDist) { closest = u; closestDist = d; }
    }
    if (closest) {
      const dmg = BUILDING_CONFIGS[bld.type].attackDamage ?? 30;
      const dir = norm({ x: closest.pos.x - bld.pos.x, y: closest.pos.y - bld.pos.y });
      const proj: Projectile = {
        id: uid(), pos: { ...bld.pos },
        vel: { x: dir.x * 350, y: dir.y * 350 },
        targetId: closest.id, damage: calcDamage(dmg, closest.armor), faction: bld.faction,
      };
      state.projectiles.set(proj.id, proj);
      bld.attackCooldown = 2.0;
    }
  }

  // VFX aging
  for (const [vid, vfx] of state.vfxEffects) {
    vfx.age += dt;
    if (vfx.age >= vfx.duration) state.vfxEffects.delete(vid);
  }

  // Ground effects aging + DOT
  for (const [gid, ge] of state.groundEffects) {
    ge.age += dt;
    ge.dotTimer += dt;
    if (ge.age >= ge.duration) { state.groundEffects.delete(gid); continue; }
    if (ge.dotTimer >= ge.dotInterval) {
      ge.dotTimer = 0;
      for (const [, u] of state.units) {
        if (u.faction === ge.casterFaction || u.state === 'dead') continue;
        if (dist(u.pos, ge.pos) < ge.radius) {
          u.hp -= ge.dotDamage;
          if (u.hp <= 0) killUnit(state, u, null);
        }
      }
    }
  }

  // Floating texts aging
  state.floatingTexts = state.floatingTexts.filter(ft => {
    ft.age += dt;
    ft.pos.y -= 30 * dt;
    return ft.age < ft.maxAge;
  });

  // Dead hero revival timer
  for (const dh of state.deadHeroes) {
    dh.reviveTimer -= dt;
  }
  state.deadHeroes = state.deadHeroes.filter(dh => dh.reviveTimer > 0);

  // AI
  updateAI(state, dt);

  // Win condition
  checkWinCondition(state);
}

// ── Kill unit ──────────────────────────────────────────────────────────────────
function killUnit(state: GameState, unit: Unit, killer: Unit | null): void {
  unit.state = 'dead';
  unit.hp = 0;

  if (killer) {
    killer.kills++;
    // XP grant
    const cfg = UNIT_CONFIGS[unit.type];
    const xpValue = unit.isHero ? 200 : Math.round((cfg?.hp ?? 50) * 0.5);
    // Grant XP to all nearby friendly heroes
    for (const [, u] of state.units) {
      if (u.faction === killer.faction && u.isHero && u.state !== 'dead' && dist(u.pos, unit.pos) < 300) {
        grantXp(u, xpValue, state);
      }
    }
  }

  // Hero death → add to revival queue
  if (unit.isHero) {
    const heroCfg = HERO_CONFIGS.find(h => h.type === unit.type);
    state.deadHeroes.push({
      unitId: unit.id,
      reviveTimer: heroCfg?.reviveTime ?? 55,
      reviveCost: heroCfg?.reviveCost ?? 425,
    });
  }

  // Check if this was part of a creep camp
  if (unit.faction === 'neutral') {
    for (const camp of state.creepCamps) {
      if (!camp.cleared && dist(unit.pos, camp.pos) < 120) {
        const campCreepsAlive = [...state.units.values()].some(
          u => u.faction === 'neutral' && u.state !== 'dead' && dist(u.pos, camp.pos) < 120
        );
        if (!campCreepsAlive) {
          camp.cleared = true;
          // Drop item
          const itemId = rollItemDrop(camp);
          if (itemId && killer?.isHero) {
            giveItemToHero(killer, itemId);
            state.floatingTexts.push({ id: uid(), pos: { ...camp.pos }, text: `Found: ${ITEM_DEFS[itemId]?.name}!`, color: '#ffd700', age: 0, maxAge: 3 });
            state.vfxEffects.set(uid(), { id: uid(), pos: { ...camp.pos }, type: 'item_drop', age: 0, duration: 0.5 });
          }
          // Grant camp XP bonus
          if (killer?.isHero) grantXp(killer, camp.xpReward, state);
        }
      }
    }
  }

  // Clean up selection
  state.selected.delete(unit.id);

  // Recalc food
  const res = unit.faction === 'blue' ? state.playerResources : state.enemyResources;
  res.food = countFood(state, unit.faction);
}

// ── AI (simple WC3-style: build → creep → expand → push) ──────────────────────
function updateAI(state: GameState, dt: number): void {
  const ai = state.aiState;
  ai.phaseTimer += dt;
  ai.attackTimer += dt;

  // Count AI units and buildings
  let workerCount = 0, armyCount = 0, hasBarracks = false, hasAltar = false;
  for (const [, u] of state.units) {
    if (u.faction !== 'red' || u.state === 'dead') continue;
    if (u.role === 'worker') workerCount++;
    else armyCount++;
  }
  for (const [, b] of state.buildings) {
    if (b.faction !== 'red' || b.underConstruction) continue;
    if (b.type === 'barracks') hasBarracks = true;
    if (b.type === 'altar') hasAltar = true;
  }

  // Simple AI: train workers, build barracks, train army, attack
  const castle = [...state.buildings.values()].find(b => b.faction === 'red' && (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress'));
  if (!castle) return;

  // Train workers
  if (workerCount < 5 && castle.trainingQueue.length === 0 && state.enemyResources.gold >= 75) {
    castle.trainingQueue.push('pawn');
    state.enemyResources.gold -= 75;
  }

  // Build barracks
  if (!hasBarracks && state.enemyResources.wood >= 200 && ai.phaseTimer > 15) {
    const pos = { x: castle.pos.x + 150, y: castle.pos.y + 100 };
    const bld = makeBuilding('red', 'barracks', pos, true);
    state.buildings.set(bld.id, bld);
    state.enemyResources.wood -= 200;
    // Assign a worker to build
    const worker = [...state.units.values()].find(u => u.faction === 'red' && u.role === 'worker' && u.state === 'idle');
    if (worker) worker.buildTargetId = bld.id;
  }

  // Train army from barracks
  const barracks = [...state.buildings.values()].find(b => b.faction === 'red' && b.type === 'barracks' && !b.underConstruction);
  if (barracks && barracks.trainingQueue.length < 3 && state.enemyResources.gold >= 135) {
    barracks.trainingQueue.push('swordsman');
    state.enemyResources.gold -= 135;
  }

  // Attack periodically
  if (ai.attackTimer > 60 + Math.random() * 30 && armyCount >= 4) {
    ai.attackTimer = 0;
    const blueCastle = [...state.buildings.values()].find(b => b.faction === 'blue' && (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress'));
    if (blueCastle) {
      for (const [, u] of state.units) {
        if (u.faction === 'red' && u.role !== 'worker' && u.state !== 'dead') {
          u.attackTargetId = null; // Clear current target, find nearest blue unit
          let nearestEnemy: Unit | null = null;
          let nearestDist = Infinity;
          for (const [, e] of state.units) {
            if (e.faction === 'blue' && e.state !== 'dead') {
              const d = dist(u.pos, e.pos);
              if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
            }
          }
          if (nearestEnemy) {
            u.attackTargetId = nearestEnemy.id;
          } else {
            u.target = { ...blueCastle.pos };
            u.waypoints = computePathWaypoints(state.islands, u.pos, blueCastle.pos);
            if (u.waypoints.length > 0) u.target = u.waypoints.shift()!;
            u.state = 'moving';
          }
        }
      }
    }
  }

  // Auto-harvest: idle workers seek resources
  for (const [, u] of state.units) {
    if (u.faction !== 'red' || u.role !== 'worker' || u.state !== 'idle' || u.buildTargetId) continue;
    let nearestRes: Resource | null = null;
    let nearestDist = Infinity;
    for (const [, r] of state.resources) {
      if (r.amount <= 0) continue;
      const d = dist(u.pos, r.pos);
      if (d < nearestDist) { nearestDist = d; nearestRes = r; }
    }
    if (nearestRes) {
      u.harvestTargetId = nearestRes.id;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function findNearestTownHall(state: GameState, faction: Faction, pos: Vec2): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const [, b] of state.buildings) {
    if (b.faction !== faction || b.underConstruction) continue;
    if (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress') {
      const d = dist(pos, b.pos);
      if (d < bestD) { bestD = d; best = b; }
    }
  }
  return best;
}

function findUnitByProjectile(state: GameState, proj: Projectile): Unit | null {
  for (const [, u] of state.units) {
    if (u.faction === proj.faction && u.state !== 'dead' && dist(u.pos, proj.pos) < 200) return u;
  }
  return null;
}

function checkWinCondition(state: GameState): void {
  let blueHasCastle = false, redHasCastle = false;
  for (const [, b] of state.buildings) {
    if (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress') {
      if (b.faction === 'blue') blueHasCastle = true;
      if (b.faction === 'red') redHasCastle = true;
    }
  }
  if (!blueHasCastle) { state.winner = 'red'; state.gameStatus = 'lost'; }
  if (!redHasCastle)  { state.winner = 'blue'; state.gameStatus = 'won'; }
}

// ── Player commands ────────────────────────────────────────────────────────────
export function commandMove(state: GameState, targetPos: Vec2): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.attackTargetId = null;
    unit.harvestTargetId = null;
    unit.waypoints = computePathWaypoints(state.islands, unit.pos, targetPos);
    unit.target = unit.waypoints.length > 0 ? unit.waypoints.shift()! : { ...targetPos };
    unit.state = 'moving';
  }
}

export function commandAttack(state: GameState, targetId: string): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.attackTargetId = targetId;
    unit.harvestTargetId = null;
  }
}

export function commandHarvest(state: GameState, resourceId: string): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead' || unit.role !== 'worker') continue;
    unit.harvestTargetId = resourceId;
    unit.attackTargetId = null;
  }
}

export function commandBuild(state: GameState, type: BuildingType, pos: Vec2): boolean {
  const cfg = BUILDING_CONFIGS[type];
  const res = state.playerResources;

  // Check prerequisites
  if (cfg.requiredTier > state.techTier) return false;
  for (const prereq of cfg.prerequisites) {
    const hasPrereq = [...state.buildings.values()].some(
      b => b.faction === 'blue' && b.type === prereq && !b.underConstruction
    );
    if (!hasPrereq) return false;
  }

  // Check cost
  if (res.gold < cfg.cost.gold || res.wood < cfg.cost.wood) return false;

  res.gold -= cfg.cost.gold;
  res.wood -= cfg.cost.wood;

  const bld = makeBuilding('blue', type, pos, true);
  state.buildings.set(bld.id, bld);

  // Assign selected worker to build
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (unit && unit.role === 'worker' && unit.state !== 'dead') {
      unit.buildTargetId = bld.id;
      unit.target = { ...pos };
      unit.waypoints = computePathWaypoints(state.islands, unit.pos, pos);
      if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
      unit.state = 'moving';
      break;
    }
  }
  return true;
}

export function commandTrain(state: GameState, buildingId: string, unitType: UnitType): boolean {
  const bld = state.buildings.get(buildingId);
  if (!bld || bld.underConstruction || bld.faction !== 'blue') return false;

  const cfg = UNIT_CONFIGS[unitType];
  if (!cfg) return false;

  const res = state.playerResources;
  if (res.gold < cfg.trainCost.gold || res.wood < cfg.trainCost.wood) return false;
  if (res.food + cfg.foodCost > res.maxFood) return false;

  res.gold -= cfg.trainCost.gold;
  res.wood -= cfg.trainCost.wood;
  bld.trainingQueue.push(unitType);
  return true;
}

export function commandSummonHero(state: GameState, heroType: UnitType): boolean {
  const heroCfg = HERO_CONFIGS.find(h => h.type === heroType);
  if (!heroCfg) return false;

  // Check if altar exists
  const altar = [...state.buildings.values()].find(
    b => b.faction === 'blue' && b.type === 'altar' && !b.underConstruction
  );
  if (!altar) return false;

  // Check if this hero already alive
  const existing = [...state.units.values()].find(
    u => u.faction === 'blue' && u.type === heroType && u.state !== 'dead'
  );
  if (existing) return false;

  // Max 3 heroes
  const heroCount = [...state.units.values()].filter(
    u => u.faction === 'blue' && u.isHero && u.state !== 'dead'
  ).length;
  if (heroCount >= 3) return false;

  const pos = { x: altar.pos.x + 60, y: altar.pos.y + 60 };
  spawnUnit(state, 'blue', heroType, pos, true);
  return true;
}

export function commandUpgradeTownHall(state: GameState): boolean {
  const th = [...state.buildings.values()].find(
    b => b.faction === 'blue' && (b.type === 'castle' || b.type === 'keep') && !b.underConstruction
  );
  if (!th) return false;

  const nextType: BuildingType = th.type === 'castle' ? 'keep' : 'fortress';
  const cfg = BUILDING_CONFIGS[nextType];
  const res = state.playerResources;
  if (res.gold < cfg.cost.gold || res.wood < cfg.cost.wood) return false;

  res.gold -= cfg.cost.gold;
  res.wood -= cfg.cost.wood;
  th.type = nextType;
  th.maxHp = cfg.hp;
  th.hp = cfg.hp;
  th.techTier = cfg.techTier as TechTier;
  state.techTier = th.techTier;
  return true;
}
