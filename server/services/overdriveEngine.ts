/**
 * OVERDRIVE RACING ENGINE
 * High-performance racing game with physics-based driving dynamics
 * Features: Vehicle physics, track collision, obstacle courses, multiplayer support
 */

import { randomUUID } from 'crypto';
const uuidv4 = randomUUID;

export interface Vehicle {
  id: string;
  playerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  acceleration: number;
  braking: boolean;
  drifting: boolean;
  wheelBase: number;
  width: number;
  health: number;
  maxHealth: number;
  boost: number;
  maxBoost: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  length: number;
  width: number;
  height: number;
  checkpoints: Array<{ x: number; y: number; radius: number }>;
  obstacles: Array<{ x: number; y: number; radius: number; type: string }>;
  startLine: { x: number; y: number; rotation: number };
  finishLine: { x: number; y: number };
  difficulty: number;
  terrain: 'asphalt' | 'dirt' | 'ice' | 'grass';
  bestTime?: number;
}

export interface RaceState {
  id: string;
  trackId: string;
  vehicles: Map<string, Vehicle>;
  startTime: number;
  elapsedTime: number;
  status: 'starting' | 'racing' | 'finished' | 'paused';
  playerTimes: Map<string, { time: number; checkpoint: number; finished: boolean }>;
  maxPlayers: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  trackId: string;
  time: number;
  date: Date;
  difficulty: number;
}

const PHYSICS_TIMESTEP = 1 / 60;
const MAX_SPEED = 400;
const ACCELERATION = 600;
const FRICTION = 0.85;
const DRIFT_FACTOR = 1.2;
const BOOST_SPEED = 500;

export class OverdriveEngine {
  private races: Map<string, RaceState> = new Map();
  private tracks: Map<string, Track> = new Map();
  private leaderboard: LeaderboardEntry[] = [];

  constructor() {
    this.initializeTracks();
  }

  private initializeTracks() {
    // Urban Circuit - tight turns and obstacles
    this.tracks.set('urban_circuit', {
      id: 'urban_circuit',
      name: 'Urban Circuit',
      description: 'Tight city streets with sharp turns and traffic cones — master the urban grid.',
      length: 800,
      width: 2000,
      height: 1600,
      terrain: 'asphalt',
      difficulty: 2,
      startLine: { x: 100, y: 800, rotation: 0 },
      finishLine: { x: 100, y: 800 },
      checkpoints: [
        { x: 500, y: 800, radius: 150 },
        { x: 1000, y: 400, radius: 150 },
        { x: 1500, y: 600, radius: 150 },
        { x: 1800, y: 1200, radius: 150 },
        { x: 1200, y: 1400, radius: 150 },
      ],
      obstacles: [
        { x: 800, y: 700, radius: 40, type: 'cone' },
        { x: 1200, y: 500, radius: 40, type: 'cone' },
        { x: 1600, y: 900, radius: 60, type: 'barrier' },
        { x: 1000, y: 1100, radius: 50, type: 'rock' },
      ],
    });

    // Desert Speedway - long straights, sand drifts
    this.tracks.set('desert_speedway', {
      id: 'desert_speedway',
      name: 'Desert Speedway',
      description: 'Wide-open desert straightaway with sand drifts — pure top-speed drag racing.',
      length: 1200,
      width: 3000,
      height: 1200,
      terrain: 'dirt',
      difficulty: 1,
      startLine: { x: 100, y: 600, rotation: 0 },
      finishLine: { x: 2900, y: 600 },
      checkpoints: [
        { x: 800, y: 600, radius: 150 },
        { x: 1500, y: 400, radius: 150 },
        { x: 2200, y: 800, radius: 150 },
        { x: 2800, y: 600, radius: 150 },
      ],
      obstacles: [
        { x: 1200, y: 300, radius: 60, type: 'sand_dune' },
        { x: 1800, y: 900, radius: 50, type: 'rock' },
        { x: 2400, y: 500, radius: 40, type: 'cone' },
      ],
    });

    // Mountain Course - elevation and tight turns
    this.tracks.set('mountain_course', {
      id: 'mountain_course',
      name: 'Mountain Course',
      description: 'Winding mountain switchbacks with elevation changes — precision driving required.',
      length: 1500,
      width: 2200,
      height: 2000,
      terrain: 'asphalt',
      difficulty: 3,
      startLine: { x: 1100, y: 100, rotation: 90 },
      finishLine: { x: 1100, y: 1900 },
      checkpoints: [
        { x: 1100, y: 400, radius: 150 },
        { x: 800, y: 700, radius: 150 },
        { x: 600, y: 1100, radius: 150 },
        { x: 1000, y: 1400, radius: 150 },
        { x: 1400, y: 1100, radius: 150 },
      ],
      obstacles: [
        { x: 900, y: 600, radius: 40, type: 'cone' },
        { x: 700, y: 900, radius: 60, type: 'barrier' },
        { x: 1200, y: 1200, radius: 50, type: 'rock' },
        { x: 1300, y: 1600, radius: 40, type: 'cone' },
      ],
    });
  }

  createRace(trackId: string, maxPlayers: number = 4): RaceState {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);

    const raceId = uuidv4();
    const race: RaceState = {
      id: raceId,
      trackId,
      vehicles: new Map(),
      startTime: Date.now(),
      elapsedTime: 0,
      status: 'starting',
      playerTimes: new Map(),
      maxPlayers,
    };

    this.races.set(raceId, race);
    return race;
  }

  addVehicleToRace(raceId: string, playerId: string): Vehicle {
    const race = this.races.get(raceId);
    if (!race) throw new Error(`Race ${raceId} not found`);

    const track = this.tracks.get(race.trackId)!;
    const startLine = track.startLine;

    const vehicle: Vehicle = {
      id: uuidv4(),
      playerId,
      x: startLine.x + Math.random() * 100 - 50,
      y: startLine.y + Math.random() * 100 - 50,
      vx: 0,
      vy: 0,
      rotation: startLine.rotation,
      acceleration: 0,
      braking: false,
      drifting: false,
      wheelBase: 30,
      width: 50,
      health: 100,
      maxHealth: 100,
      boost: 0,
      maxBoost: 100,
    };

    race.vehicles.set(vehicle.id, vehicle);
    race.playerTimes.set(playerId, {
      time: 0,
      checkpoint: 0,
      finished: false,
    });

    return vehicle;
  }

  updateVehiclePhysics(vehicle: Vehicle, inputs: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    drift: boolean;
    boost: boolean;
  }, deltaTime: number = PHYSICS_TIMESTEP): void {
    // Handle acceleration
    if (inputs.forward) {
      vehicle.acceleration = Math.min(vehicle.acceleration + ACCELERATION * deltaTime, MAX_SPEED);
    } else if (inputs.backward) {
      vehicle.acceleration = Math.max(vehicle.acceleration - ACCELERATION * 0.5 * deltaTime, -MAX_SPEED * 0.5);
    } else {
      vehicle.acceleration *= FRICTION;
    }

    // Handle rotation
    const maxRotation = 0.15;
    let targetRotation = vehicle.rotation;
    if (inputs.left) {
      targetRotation -= maxRotation;
    }
    if (inputs.right) {
      targetRotation += maxRotation;
    }
    vehicle.rotation = vehicle.rotation * 0.8 + targetRotation * 0.2;

    // Handle drift
    if (inputs.drift && Math.abs(vehicle.acceleration) > MAX_SPEED * 0.3) {
      vehicle.drifting = true;
      vehicle.acceleration *= DRIFT_FACTOR;
    } else {
      vehicle.drifting = false;
    }

    // Handle boost
    if (inputs.boost && vehicle.boost > 0) {
      vehicle.acceleration = Math.min(vehicle.acceleration + BOOST_SPEED * deltaTime, BOOST_SPEED);
      vehicle.boost = Math.max(0, vehicle.boost - 30 * deltaTime);
    } else {
      vehicle.boost = Math.min(vehicle.boost + 10 * deltaTime, vehicle.maxBoost);
    }

    // Update velocity
    vehicle.vx = Math.cos(vehicle.rotation) * vehicle.acceleration;
    vehicle.vy = Math.sin(vehicle.rotation) * vehicle.acceleration;

    // Update position
    vehicle.x += vehicle.vx * deltaTime;
    vehicle.y += vehicle.vy * deltaTime;
  }

  checkCheckpointCollision(vehicle: Vehicle, track: Track): boolean {
    const playerState = this.races.get(Array.from(this.races.values())[0]?.id || '');
    if (!playerState) return false;

    const state = playerState.playerTimes.get(vehicle.playerId);
    if (!state) return false;

    const nextCheckpoint = track.checkpoints[state.checkpoint];
    if (!nextCheckpoint) return false;

    const dx = vehicle.x - nextCheckpoint.x;
    const dy = vehicle.y - nextCheckpoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < nextCheckpoint.radius) {
      state.checkpoint += 1;
      if (state.checkpoint >= track.checkpoints.length) {
        state.finished = true;
        state.time = Date.now() - (this.races.values().next().value?.startTime || Date.now());
      }
      return true;
    }

    return false;
  }

  checkObstacleCollision(vehicle: Vehicle, track: Track): boolean {
    for (const obstacle of track.obstacles) {
      const dx = vehicle.x - obstacle.x;
      const dy = vehicle.y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < obstacle.radius + vehicle.width / 2) {
        vehicle.health -= 10;
        vehicle.acceleration *= 0.5;
        return true;
      }
    }
    return false;
  }

  updateRace(raceId: string, vehicles: Vehicle[], inputs: Record<string, any>): void {
    const race = this.races.get(raceId);
    if (!race) return;

    const track = this.tracks.get(race.trackId);
    if (!track) return;

    race.elapsedTime = Date.now() - race.startTime;

    if (race.elapsedTime > 3000 && race.status === 'starting') {
      race.status = 'racing';
    }

    for (const vehicle of vehicles) {
      if (vehicle.health <= 0) continue;

      const vehicleInputs = inputs[vehicle.playerId] || {};
      this.updateVehiclePhysics(vehicle, vehicleInputs);
      this.checkCheckpointCollision(vehicle, track);
      this.checkObstacleCollision(vehicle, track);
    }
  }

  getRaceState(raceId: string): RaceState | undefined {
    return this.races.get(raceId);
  }

  addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'rank'>): void {
    this.leaderboard.push({ ...entry, rank: 0 });
    this.leaderboard.sort((a, b) => a.time - b.time);
    this.leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    if (this.leaderboard.length > 100) {
      this.leaderboard = this.leaderboard.slice(0, 100);
    }
  }

  getLeaderboard(trackId?: string, limit: number = 10): LeaderboardEntry[] {
    const filtered = trackId
      ? this.leaderboard.filter(e => e.trackId === trackId)
      : this.leaderboard;
    return filtered.slice(0, limit);
  }

  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getTrack(trackId: string): Track | undefined {
    return this.tracks.get(trackId);
  }

  finishRace(raceId: string): Map<string, number> {
    const race = this.races.get(raceId);
    if (!race) return new Map();

    race.status = 'finished';
    const results = new Map<string, number>();

    race.playerTimes.forEach((state, playerId) => {
      results.set(playerId, state.time);
    });

    return results;
  }
}

export const overdriveEngine = new OverdriveEngine();
