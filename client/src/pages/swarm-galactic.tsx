import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Rocket, Ship, Home, Target, Crosshair } from "lucide-react";
import { Link } from "wouter";
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

const GALAXY_WIDTH = 1200;
const GALAXY_HEIGHT = 800;
const PLANET_RADIUS = 30;
const SURFACE_WIDTH = 1600;
const SURFACE_HEIGHT = 900;

interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  faction: number;
  captureProgress: number;
  maxCaptureProgress: number;
  towns: Town[];
  resources: number;
  biome: "desert" | "forest" | "ice" | "volcanic" | "ocean" | "urban";
}

interface Town {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  faction: number;
  captureProgress: number;
  maxCaptureProgress: number;
  spawnRate: number;
}

interface Ship {
  id: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  type: "starship" | "fleet";
  capacity: number;
  units: number;
  faction: number;
  speed: number;
  isSelected: boolean;
  targetPlanetId: string | null;
}

interface GroundUnit {
  id: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  faction: number;
  health: number;
  maxHealth: number;
  attack: number;
  range: number;
  speed: number;
  isSelected: boolean;
  attackCooldown: number;
  target: GroundUnit | null;
}

type GameView = "galaxy" | "planet";

interface GameState {
  view: GameView;
  currentPlanetId: string | null;
  planets: Planet[];
  ships: Ship[];
  groundUnits: GroundUnit[];
  selectedShips: Set<string>;
  selectedUnits: Set<string>;
  playerFaction: number;
  credits: number;
  time: number;
  gameStatus: "playing" | "won" | "lost";
  transitionAlpha: number;
  isTransitioning: boolean;
}

const PLANETS_DATA: Omit<Planet, "faction" | "captureProgress" | "maxCaptureProgress" | "towns" | "resources">[] = [
  { id: "corellia", name: "Corellia", x: 200, y: 400, radius: 35, color: "#4a9c3f", biome: "urban" },
  { id: "dantooine", name: "Dantooine", x: 350, y: 200, radius: 28, color: "#6b8e23", biome: "forest" },
  { id: "dathomir", name: "Dathomir", x: 500, y: 550, radius: 30, color: "#8b4513", biome: "volcanic" },
  { id: "endor", name: "Endor", x: 650, y: 300, radius: 26, color: "#228b22", biome: "forest" },
  { id: "lok", name: "Lok", x: 800, y: 480, radius: 24, color: "#cd853f", biome: "desert" },
  { id: "naboo", name: "Naboo", x: 400, y: 380, radius: 32, color: "#5f9ea0", biome: "ocean" },
  { id: "rori", name: "Rori", x: 420, y: 440, radius: 20, color: "#6b8e23", biome: "forest" },
  { id: "talus", name: "Talus", x: 180, y: 450, radius: 22, color: "#708090", biome: "urban" },
  { id: "tatooine", name: "Tatooine", x: 950, y: 350, radius: 34, color: "#daa520", biome: "desert" },
  { id: "yavin4", name: "Yavin 4", x: 700, y: 150, radius: 28, color: "#556b2f", biome: "forest" },
  { id: "mustafar", name: "Mustafar", x: 1050, y: 500, radius: 26, color: "#ff4500", biome: "volcanic" },
  { id: "kashyyyk", name: "Kashyyyk", x: 550, y: 120, radius: 30, color: "#2e8b57", biome: "forest" },
  { id: "bespin", name: "Bespin", x: 850, y: 200, radius: 36, color: "#87ceeb", biome: "ocean" },
];

function generateTowns(planetId: string, biome: string): Town[] {
  const townNames: Record<string, string[]> = {
    corellia: ["Coronet", "Tyrena", "Kor Vella", "Doaba Guerfel"],
    dantooine: ["Mining Outpost", "Jedi Enclave", "Agro Outpost"],
    dathomir: ["Witch Village", "Science Outpost", "Trade Outpost"],
    endor: ["Ewok Village", "Research Station", "Smuggler Outpost"],
    lok: ["Nym's Stronghold", "Mining Town"],
    naboo: ["Theed", "Keren", "Moenia", "Kaadara"],
    rori: ["Narmle", "Restuss"],
    talus: ["Dearic", "Nashal"],
    tatooine: ["Mos Eisley", "Anchorhead", "Bestine", "Mos Entha", "Mos Espa"],
    yavin4: ["Labor Outpost", "Mining Outpost", "Massassi Temple"],
    mustafar: ["Mining Complex", "Research Station"],
    kashyyyk: ["Kachirho", "Trade Federation Camp"],
    bespin: ["Cloud City", "Mining Platform"],
  };

  const names = townNames[planetId] || ["Outpost Alpha", "Outpost Beta"];
  return names.map((name, i) => ({
    id: `${planetId}-town-${i}`,
    name,
    x: 200 + (i % 3) * 500 + Math.random() * 200,
    y: 150 + Math.floor(i / 3) * 300 + Math.random() * 150,
    radius: 60 + Math.random() * 20,
    faction: 0,
    captureProgress: 0,
    maxCaptureProgress: 100,
    spawnRate: 0.5,
  }));
}

function initializePlanets(): Planet[] {
  return PLANETS_DATA.map((p, index) => ({
    ...p,
    faction: index === 0 ? 1 : index === PLANETS_DATA.length - 1 ? 2 : 0,
    captureProgress: index === 0 || index === PLANETS_DATA.length - 1 ? 100 : 0,
    maxCaptureProgress: 100,
    towns: generateTowns(p.id, p.biome),
    resources: 100,
  }));
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export default function SwarmGalactic() {
  return (
    <GrudgeGameWrapper gameSlug="swarm-galactic" gameName="Galactic Conquest" xpPerThousand={15} goldPerGame={10}>
      {(session) => <SwarmGalacticInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function SwarmGalacticInner({ session }: { session: GrudgeGameSession }) {
  const galaxyCanvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    view: "galaxy",
    currentPlanetId: null,
    planets: initializePlanets(),
    ships: [],
    groundUnits: [],
    selectedShips: new Set(),
    selectedUnits: new Set(),
    playerFaction: 1,
    credits: 500,
    time: 0,
    gameStatus: "playing",
    transitionAlpha: 0,
    isTransitioning: false,
  });

  const [displayState, setDisplayState] = useState({
    view: "galaxy" as GameView,
    currentPlanetId: null as string | null,
    credits: 500,
    gameStatus: "playing" as "playing" | "won" | "lost",
    selectedShipCount: 0,
    selectedUnitCount: 0,
    planetInfo: null as Planet | null,
  });

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef(performance.now());
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const selectionRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const spawnShip = useCallback((type: "starship" | "fleet", planetId: string) => {
    const state = gameStateRef.current;
    const planet = state.planets.find(p => p.id === planetId);
    if (!planet || planet.faction !== state.playerFaction) return;

    const cost = type === "starship" ? 50 : 100;
    if (state.credits < cost) return;

    state.credits -= cost;
    const ship: Ship = {
      id: `ship-${Date.now()}-${Math.random()}`,
      x: planet.x + (Math.random() - 0.5) * 50,
      y: planet.y + (Math.random() - 0.5) * 50,
      destX: planet.x,
      destY: planet.y,
      type,
      capacity: type === "starship" ? 5 : 10,
      units: type === "starship" ? 5 : 10,
      faction: state.playerFaction,
      speed: type === "starship" ? 100 : 60,
      isSelected: false,
      targetPlanetId: null,
    };
    state.ships.push(ship);
  }, []);

  const enterPlanet = useCallback((planetId: string) => {
    const state = gameStateRef.current;
    if (state.isTransitioning) return;
    
    const planet = state.planets.find(p => p.id === planetId);
    if (!planet) return;

    const playerShipsAtPlanet = state.ships.filter(
      s => s.faction === state.playerFaction && 
      distance(s.x, s.y, planet.x, planet.y) < planet.radius + 30
    );

    if (playerShipsAtPlanet.length === 0 && planet.faction !== state.playerFaction) return;

    state.isTransitioning = true;
    state.transitionAlpha = 0;

    const doTransition = () => {
      state.transitionAlpha += 0.05;
      if (state.transitionAlpha >= 1) {
        state.view = "planet";
        state.currentPlanetId = planetId;
        state.groundUnits = [];
        state.selectedUnits.clear();

        let spawnX = SURFACE_WIDTH / 2;
        let spawnY = SURFACE_HEIGHT - 100;
        playerShipsAtPlanet.forEach(ship => {
          for (let i = 0; i < ship.units; i++) {
            const unit: GroundUnit = {
              id: `unit-${Date.now()}-${Math.random()}`,
              x: spawnX + (Math.random() - 0.5) * 100,
              y: spawnY + (Math.random() - 0.5) * 50,
              destX: spawnX,
              destY: spawnY,
              faction: state.playerFaction,
              health: 100,
              maxHealth: 100,
              attack: 10,
              range: 50,
              speed: 80,
              isSelected: false,
              attackCooldown: 0,
              target: null,
            };
            state.groundUnits.push(unit);
          }
          spawnX += 50;
        });

        planet.towns.forEach(town => {
          if (town.faction === 2 || town.faction === 0) {
            const enemyCount = town.faction === 2 ? 5 : 2;
            for (let i = 0; i < enemyCount; i++) {
              const unit: GroundUnit = {
                id: `enemy-${Date.now()}-${Math.random()}`,
                x: town.x + (Math.random() - 0.5) * town.radius,
                y: town.y + (Math.random() - 0.5) * town.radius,
                destX: town.x,
                destY: town.y,
                faction: 2,
                health: 80,
                maxHealth: 80,
                attack: 8,
                range: 45,
                speed: 60,
                isSelected: false,
                attackCooldown: 0,
                target: null,
              };
              state.groundUnits.push(unit);
            }
          }
        });

        const fadeIn = () => {
          state.transitionAlpha -= 0.05;
          if (state.transitionAlpha <= 0) {
            state.transitionAlpha = 0;
            state.isTransitioning = false;
          } else {
            requestAnimationFrame(fadeIn);
          }
        };
        requestAnimationFrame(fadeIn);
      } else {
        requestAnimationFrame(doTransition);
      }
    };
    requestAnimationFrame(doTransition);
  }, []);

  const exitToGalaxy = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isTransitioning || state.view !== "planet") return;

    state.isTransitioning = true;
    state.transitionAlpha = 0;

    const planet = state.planets.find(p => p.id === state.currentPlanetId);
    if (planet) {
      const allTownsControlled = planet.towns.every(t => t.faction === state.playerFaction);
      if (allTownsControlled) {
        planet.faction = state.playerFaction;
        planet.captureProgress = planet.maxCaptureProgress;
      }
    }

    const doTransition = () => {
      state.transitionAlpha += 0.05;
      if (state.transitionAlpha >= 1) {
        state.view = "galaxy";
        state.currentPlanetId = null;
        state.groundUnits = [];
        state.selectedUnits.clear();

        const fadeIn = () => {
          state.transitionAlpha -= 0.05;
          if (state.transitionAlpha <= 0) {
            state.transitionAlpha = 0;
            state.isTransitioning = false;
          } else {
            requestAnimationFrame(fadeIn);
          }
        };
        requestAnimationFrame(fadeIn);
      } else {
        requestAnimationFrame(doTransition);
      }
    };
    requestAnimationFrame(doTransition);
  }, []);

  const updateGalaxy = useCallback((delta: number) => {
    const state = gameStateRef.current;
    state.time += delta;

    state.ships.forEach(ship => {
      if (ship.x !== ship.destX || ship.y !== ship.destY) {
        const dist = distance(ship.x, ship.y, ship.destX, ship.destY);
        if (dist > 5) {
          const moveAmount = Math.min(ship.speed * delta, dist);
          const ratio = moveAmount / dist;
          ship.x += (ship.destX - ship.x) * ratio;
          ship.y += (ship.destY - ship.y) * ratio;
        }
      }

      if (ship.targetPlanetId) {
        const targetPlanet = state.planets.find(p => p.id === ship.targetPlanetId);
        if (targetPlanet) {
          const dist = distance(ship.x, ship.y, targetPlanet.x, targetPlanet.y);
          if (dist < targetPlanet.radius + 20) {
            ship.targetPlanetId = null;
          }
        }
      }
    });

    state.planets.forEach(planet => {
      const shipsAtPlanet = state.ships.filter(
        s => distance(s.x, s.y, planet.x, planet.y) < planet.radius + 30
      );

      const faction1Ships = shipsAtPlanet.filter(s => s.faction === 1).length;
      const faction2Ships = shipsAtPlanet.filter(s => s.faction === 2).length;

      if (faction1Ships > 0 && faction2Ships === 0 && planet.faction !== 1) {
        planet.captureProgress += delta * 10 * faction1Ships;
        if (planet.captureProgress >= planet.maxCaptureProgress) {
          planet.faction = 1;
        }
      } else if (faction2Ships > 0 && faction1Ships === 0 && planet.faction !== 2) {
        planet.captureProgress += delta * 10 * faction2Ships;
        if (planet.captureProgress >= planet.maxCaptureProgress) {
          planet.faction = 2;
        }
      }

      if (planet.faction === state.playerFaction) {
        state.credits += delta * 2;
      }
    });

    const playerPlanets = state.planets.filter(p => p.faction === state.playerFaction).length;
    const enemyPlanets = state.planets.filter(p => p.faction === 2).length;

    if (playerPlanets === state.planets.length) {
      state.gameStatus = "won";
    } else if (enemyPlanets === state.planets.length) {
      state.gameStatus = "lost";
    }
  }, []);

  const updateSurface = useCallback((delta: number) => {
    const state = gameStateRef.current;
    const planet = state.planets.find(p => p.id === state.currentPlanetId);
    if (!planet) return;

    state.groundUnits.forEach(unit => {
      if (unit.health <= 0) return;

      if (unit.x !== unit.destX || unit.y !== unit.destY) {
        const dist = distance(unit.x, unit.y, unit.destX, unit.destY);
        if (dist > 3) {
          const moveAmount = Math.min(unit.speed * delta, dist);
          const ratio = moveAmount / dist;
          unit.x += (unit.destX - unit.x) * ratio;
          unit.y += (unit.destY - unit.y) * ratio;
        }
      }

      unit.attackCooldown = Math.max(0, unit.attackCooldown - delta);

      if (unit.attackCooldown <= 0) {
        let nearestEnemy: GroundUnit | null = null;
        let nearestDist = Infinity;

        state.groundUnits.forEach(other => {
          if (other.health <= 0 || other.faction === unit.faction) return;
          const d = distance(unit.x, unit.y, other.x, other.y);
          if (d < nearestDist && d < unit.range * 2) {
            nearestDist = d;
            nearestEnemy = other;
          }
        });

        if (nearestEnemy !== null && nearestDist <= unit.range) {
          const enemy = nearestEnemy as GroundUnit;
          enemy.health -= unit.attack;
          unit.attackCooldown = 1;
          unit.target = enemy;
        } else if (nearestEnemy !== null && nearestDist > unit.range) {
          const enemy = nearestEnemy as GroundUnit;
          unit.destX = enemy.x;
          unit.destY = enemy.y;
        }
      }
    });

    state.groundUnits = state.groundUnits.filter(u => u.health > 0);

    planet.towns.forEach(town => {
      const unitsInTown: Record<number, number> = { 1: 0, 2: 0 };
      
      state.groundUnits.forEach(unit => {
        if (unit.health > 0 && distance(unit.x, unit.y, town.x, town.y) < town.radius) {
          unitsInTown[unit.faction] = (unitsInTown[unit.faction] || 0) + 1;
        }
      });

      const dominant = unitsInTown[1] > unitsInTown[2] ? 1 : unitsInTown[2] > unitsInTown[1] ? 2 : 0;
      const netCount = Math.abs(unitsInTown[1] - unitsInTown[2]);

      if (dominant !== 0 && netCount > 0) {
        if (town.faction === dominant) {
          town.captureProgress = Math.min(town.maxCaptureProgress, town.captureProgress + netCount * delta * 20);
        } else if (town.faction === 0) {
          town.faction = dominant;
          town.captureProgress = netCount * delta * 20;
        } else {
          town.captureProgress -= netCount * delta * 30;
          if (town.captureProgress <= 0) {
            town.faction = 0;
            town.captureProgress = 0;
          }
        }
      }
    });
  }, []);

  const renderGalaxy = useCallback(() => {
    const canvas = galaxyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameStateRef.current;

    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, GALAXY_WIDTH, GALAXY_HEIGHT);

    for (let i = 0; i < 200; i++) {
      const x = (Math.sin(i * 0.3) * 0.5 + 0.5) * GALAXY_WIDTH;
      const y = (Math.cos(i * 0.5) * 0.5 + 0.5) * GALAXY_HEIGHT;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`;
      ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }

    state.planets.forEach(planet => {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = planet.faction === 1 ? "#00ff00" : planet.faction === 2 ? "#ff4444" : "#666";
      ctx.lineWidth = 3;
      ctx.stroke();

      const gradient = ctx.createRadialGradient(
        planet.x - planet.radius * 0.3,
        planet.y - planet.radius * 0.3,
        0,
        planet.x,
        planet.y,
        planet.radius
      );
      gradient.addColorStop(0, planet.color);
      gradient.addColorStop(1, `${planet.color}88`);

      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(planet.name, planet.x, planet.y + planet.radius + 18);

      if (planet.captureProgress > 0 && planet.captureProgress < planet.maxCaptureProgress) {
        ctx.fillStyle = "#333";
        ctx.fillRect(planet.x - 25, planet.y + planet.radius + 22, 50, 6);
        ctx.fillStyle = planet.faction === 1 ? "#0f0" : "#f44";
        ctx.fillRect(planet.x - 25, planet.y + planet.radius + 22, 50 * (planet.captureProgress / planet.maxCaptureProgress), 6);
      }
    });

    state.ships.forEach(ship => {
      ctx.save();
      ctx.translate(ship.x, ship.y);

      const angle = Math.atan2(ship.destY - ship.y, ship.destX - ship.x);
      ctx.rotate(angle + Math.PI / 2);

      ctx.fillStyle = ship.faction === 1 ? "#00ff88" : "#ff6644";
      
      if (ship.type === "starship") {
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-6, 8);
        ctx.lineTo(6, 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-5, 10);
        ctx.lineTo(-5, 15);
        ctx.lineTo(5, 15);
        ctx.lineTo(5, 10);
        ctx.lineTo(10, 10);
        ctx.closePath();
        ctx.fill();
      }

      if (ship.isSelected || state.selectedShips.has(ship.id)) {
        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ship.type === "starship" ? 14 : 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    if (selectionRef.current && isDraggingRef.current) {
      const sel = selectionRef.current;
      ctx.strokeStyle = "#0f0";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      ctx.fillRect(sel.x1, sel.y1, sel.x2 - sel.x1, sel.y2 - sel.y1);
      ctx.strokeRect(sel.x1, sel.y1, sel.x2 - sel.x1, sel.y2 - sel.y1);
    }

    if (state.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${state.transitionAlpha})`;
      ctx.fillRect(0, 0, GALAXY_WIDTH, GALAXY_HEIGHT);
    }
  }, []);

  const renderSurface = useCallback(() => {
    const canvas = surfaceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameStateRef.current;
    const planet = state.planets.find(p => p.id === state.currentPlanetId);
    if (!planet) return;

    const biomeColors: Record<string, { bg: string; ground: string }> = {
      desert: { bg: "#1a1510", ground: "#8b7355" },
      forest: { bg: "#0a1a0a", ground: "#2d4a2d" },
      ice: { bg: "#101520", ground: "#a0c0d0" },
      volcanic: { bg: "#1a0a0a", ground: "#4a2020" },
      ocean: { bg: "#0a1520", ground: "#2a4a5a" },
      urban: { bg: "#101215", ground: "#3a3a40" },
    };

    const colors = biomeColors[planet.biome] || biomeColors.forest;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, SURFACE_WIDTH, SURFACE_HEIGHT);

    for (let x = 0; x < SURFACE_WIDTH; x += 40) {
      for (let y = 0; y < SURFACE_HEIGHT; y += 40) {
        const noise = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 20;
        ctx.fillStyle = `${colors.ground}${Math.floor(40 + noise).toString(16)}`;
        ctx.fillRect(x, y, 40, 40);
      }
    }

    planet.towns.forEach(town => {
      ctx.beginPath();
      ctx.arc(town.x, town.y, town.radius, 0, Math.PI * 2);
      ctx.fillStyle = town.faction === 1 ? "rgba(0, 255, 0, 0.1)" : town.faction === 2 ? "rgba(255, 0, 0, 0.1)" : "rgba(128, 128, 128, 0.1)";
      ctx.fill();
      ctx.strokeStyle = town.faction === 1 ? "#0f0" : town.faction === 2 ? "#f44" : "#666";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(town.name, town.x, town.y - town.radius - 10);

      const progressWidth = 60;
      ctx.fillStyle = "#333";
      ctx.fillRect(town.x - progressWidth / 2, town.y + town.radius + 5, progressWidth, 8);
      ctx.fillStyle = town.faction === 1 ? "#0f0" : town.faction === 2 ? "#f44" : "#888";
      ctx.fillRect(town.x - progressWidth / 2, town.y + town.radius + 5, progressWidth * (town.captureProgress / town.maxCaptureProgress), 8);

      for (let i = 0; i < 4; i++) {
        const bx = town.x + Math.cos(i * Math.PI / 2) * (town.radius * 0.5);
        const by = town.y + Math.sin(i * Math.PI / 2) * (town.radius * 0.5);
        ctx.fillStyle = "#555";
        ctx.fillRect(bx - 10, by - 15, 20, 20);
        ctx.fillStyle = "#777";
        ctx.fillRect(bx - 8, by - 10, 6, 8);
        ctx.fillRect(bx + 2, by - 10, 6, 8);
      }
    });

    state.groundUnits.forEach(unit => {
      if (unit.health <= 0) return;

      ctx.fillStyle = unit.faction === 1 ? "#00cc66" : "#cc4444";
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, 8, 0, Math.PI * 2);
      ctx.fill();

      if (unit.isSelected || state.selectedUnits.has(unit.id)) {
        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      const healthPercent = unit.health / unit.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(unit.x - 10, unit.y - 15, 20, 4);
      ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
      ctx.fillRect(unit.x - 10, unit.y - 15, 20 * healthPercent, 4);

      if (unit.target && unit.target.health > 0 && unit.attackCooldown > 0.8) {
        ctx.strokeStyle = unit.faction === 1 ? "#0f0" : "#f44";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(unit.target.x, unit.target.y);
        ctx.stroke();
      }
    });

    if (selectionRef.current && isDraggingRef.current) {
      const sel = selectionRef.current;
      ctx.strokeStyle = "#0f0";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      ctx.fillRect(sel.x1, sel.y1, sel.x2 - sel.x1, sel.y2 - sel.y1);
      ctx.strokeRect(sel.x1, sel.y1, sel.x2 - sel.x1, sel.y2 - sel.y1);
    }

    if (state.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${state.transitionAlpha})`;
      ctx.fillRect(0, 0, SURFACE_WIDTH, SURFACE_HEIGHT);
    }
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const delta = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
    lastTimeRef.current = timestamp;

    const state = gameStateRef.current;

    if (state.view === "galaxy") {
      updateGalaxy(delta);
      renderGalaxy();
    } else {
      updateSurface(delta);
      renderSurface();
    }

    setDisplayState(prev => ({
      ...prev,
      view: state.view,
      currentPlanetId: state.currentPlanetId,
      credits: Math.floor(state.credits),
      gameStatus: state.gameStatus,
      selectedShipCount: state.selectedShips.size,
      selectedUnitCount: state.selectedUnits.size,
      planetInfo: state.currentPlanetId ? state.planets.find(p => p.id === state.currentPlanetId) || null : null,
    }));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updateGalaxy, updateSurface, renderGalaxy, renderSurface]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameLoop]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDraggingRef.current = true;
    dragStartRef.current = { x, y };
    selectionRef.current = { x1: x, y1: y, x2: x, y2: y };

    const state = gameStateRef.current;
    if (state.view === "galaxy") {
      state.selectedShips.clear();
    } else {
      state.selectedUnits.clear();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectionRef.current = {
      x1: Math.min(dragStartRef.current.x, x),
      y1: Math.min(dragStartRef.current.y, y),
      x2: Math.max(dragStartRef.current.x, x),
      y2: Math.max(dragStartRef.current.y, y),
    };
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const state = gameStateRef.current;
    const sel = selectionRef.current;

    if (sel) {
      if (state.view === "galaxy") {
        state.ships.forEach(ship => {
          if (ship.faction === state.playerFaction &&
              ship.x >= sel.x1 && ship.x <= sel.x2 &&
              ship.y >= sel.y1 && ship.y <= sel.y2) {
            state.selectedShips.add(ship.id);
          }
        });
      } else {
        state.groundUnits.forEach(unit => {
          if (unit.faction === state.playerFaction &&
              unit.x >= sel.x1 && unit.x <= sel.x2 &&
              unit.y >= sel.y1 && unit.y <= sel.y2) {
            state.selectedUnits.add(unit.id);
          }
        });
      }
    }

    selectionRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = gameStateRef.current;

    if (state.view === "galaxy") {
      if (state.selectedShips.size > 0) {
        const selectedShipsList = state.ships.filter(s => state.selectedShips.has(s.id));
        selectedShipsList.forEach(ship => {
          ship.destX = x + (Math.random() - 0.5) * 30;
          ship.destY = y + (Math.random() - 0.5) * 30;
        });
      }
    } else {
      if (state.selectedUnits.size > 0) {
        const selectedUnitsList = state.groundUnits.filter(u => state.selectedUnits.has(u.id));
        const centerX = selectedUnitsList.reduce((sum, u) => sum + u.x, 0) / selectedUnitsList.length;
        const centerY = selectedUnitsList.reduce((sum, u) => sum + u.y, 0) / selectedUnitsList.length;

        selectedUnitsList.forEach(unit => {
          const offsetX = (unit.x - centerX) * 0.5;
          const offsetY = (unit.y - centerY) * 0.5;
          unit.destX = Math.max(10, Math.min(SURFACE_WIDTH - 10, x + offsetX));
          unit.destY = Math.max(10, Math.min(SURFACE_HEIGHT - 10, y + offsetY));
        });
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = gameStateRef.current;
    if (state.view !== "galaxy") return;

    const clickedPlanet = state.planets.find(p => distance(x, y, p.x, p.y) < p.radius + 10);
    if (clickedPlanet) {
      enterPlanet(clickedPlanet.id);
    }
  };

  const getCurrentPlanet = () => {
    return gameStateRef.current.planets.find(p => p.id === displayState.currentPlanetId);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-[1700px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/games">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Galactic Conquest</h1>
            {displayState.view === "planet" && getCurrentPlanet() && (
              <span className="text-lg text-muted-foreground">- {getCurrentPlanet()?.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-yellow-400 font-bold">{displayState.credits} Credits</div>
            {displayState.view === "galaxy" && (
              <div className="text-sm text-muted-foreground">
                {displayState.selectedShipCount > 0 && `${displayState.selectedShipCount} ships selected`}
              </div>
            )}
            {displayState.view === "planet" && (
              <div className="text-sm text-muted-foreground">
                {displayState.selectedUnitCount > 0 && `${displayState.selectedUnitCount} units selected`}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            {displayState.view === "galaxy" ? (
              <canvas
                ref={galaxyCanvasRef}
                width={GALAXY_WIDTH}
                height={GALAXY_HEIGHT}
                className="border border-border rounded-lg cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
                data-testid="canvas-galaxy"
              />
            ) : (
              <canvas
                ref={surfaceCanvasRef}
                width={SURFACE_WIDTH}
                height={SURFACE_HEIGHT}
                className="border border-border rounded-lg cursor-crosshair max-w-full"
                style={{ maxHeight: "70vh" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                data-testid="canvas-surface"
              />
            )}
          </div>

          <Card className="w-64 shrink-0">
            <CardContent className="p-4 space-y-4">
              {displayState.view === "galaxy" ? (
                <>
                  <h3 className="font-bold text-lg">Fleet Command</h3>
                  <p className="text-sm text-muted-foreground">
                    Double-click a planet to land. Right-click to move selected ships.
                  </p>
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        const playerPlanet = gameStateRef.current.planets.find(p => p.faction === 1);
                        if (playerPlanet) spawnShip("starship", playerPlanet.id);
                      }}
                      disabled={displayState.credits < 50}
                      data-testid="button-spawn-starship"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Starship (5 units) - 50c
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => {
                        const playerPlanet = gameStateRef.current.planets.find(p => p.faction === 1);
                        if (playerPlanet) spawnShip("fleet", playerPlanet.id);
                      }}
                      disabled={displayState.credits < 100}
                      data-testid="button-spawn-fleet"
                    >
                      <Ship className="w-4 h-4 mr-2" />
                      Fleet Ship (10 units) - 100c
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Legend</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Your Territory</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Enemy Territory</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                        <span>Neutral</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-lg">Ground Operations</h3>
                  <p className="text-sm text-muted-foreground">
                    Capture all towns to control the planet. Right-click to move units.
                  </p>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={exitToGalaxy}
                    data-testid="button-exit-planet"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Return to Galaxy
                  </Button>
                  {displayState.planetInfo && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Towns</h4>
                      <div className="space-y-2 text-sm max-h-60 overflow-auto">
                        {displayState.planetInfo.towns.map(town => (
                          <div key={town.id} className="flex items-center justify-between">
                            <span>{town.name}</span>
                            <div className={`w-3 h-3 rounded-full ${
                              town.faction === 1 ? "bg-green-500" : 
                              town.faction === 2 ? "bg-red-500" : "bg-gray-500"
                            }`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {displayState.gameStatus !== "playing" && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <Card className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                {displayState.gameStatus === "won" ? "Victory!" : "Defeat!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {displayState.gameStatus === "won"
                  ? "You have conquered the galaxy!"
                  : "The enemy has taken control."}
              </p>
              <Button onClick={() => window.location.reload()} data-testid="button-restart">
                Play Again
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
