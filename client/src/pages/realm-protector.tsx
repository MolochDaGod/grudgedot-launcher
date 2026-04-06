import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Sword, Heart, Coins } from "lucide-react";
import { Link } from "wouter";

interface Unit {
  id: number;
  x: number;
  y: number;
  type: "paladin" | "ranger" | "scout" | "wizard" | "goblin" | "skeleton" | "ogre" | "wall";
  team: "player" | "enemy";
  health: number;
  maxHealth: number;
  attack: number;
  range: number;
  speed: number;
  targetX: number;
  targetY: number;
  attackCooldown: number;
  color: string;
  size: number;
  isWall?: boolean;
}

const UNIT_STATS = {
  paladin: { health: 150, attack: 20, range: 40, speed: 1.5, color: "#ffd700", size: 16 },
  ranger: { health: 80, attack: 25, range: 150, speed: 2, color: "#228b22", size: 14 },
  scout: { health: 60, attack: 35, range: 35, speed: 3, color: "#4b0082", size: 12 },
  wizard: { health: 50, attack: 40, range: 120, speed: 1, color: "#9932cc", size: 14 },
  goblin: { health: 40, attack: 10, range: 30, speed: 2.5, color: "#32cd32", size: 10 },
  skeleton: { health: 50, attack: 15, range: 35, speed: 2, color: "#f5f5dc", size: 12 },
  ogre: { health: 200, attack: 30, range: 45, speed: 0.8, color: "#8b4513", size: 22 },
  wall: { health: 300, attack: 0, range: 0, speed: 0, color: "#6b7280", size: 20 },
};

export default function RealmProtectorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gold, setGold] = useState(100);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<keyof typeof UNIT_STATS | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [castleHealth, setCastleHealth] = useState(100);
  const unitsRef = useRef<Unit[]>([]);
  const nextIdRef = useRef(1);
  const waveTimerRef = useRef(0);
  const projectilesRef = useRef<{x: number, y: number, tx: number, ty: number, color: string}[]>([]);

  const spawnUnit = useCallback((type: keyof typeof UNIT_STATS, team: "player" | "enemy", x: number, y: number) => {
    const stats = UNIT_STATS[type];
    const unit: Unit = {
      id: nextIdRef.current++,
      x,
      y,
      type,
      team,
      health: stats.health,
      maxHealth: stats.health,
      attack: stats.attack,
      range: stats.range,
      speed: stats.speed,
      targetX: x,
      targetY: y,
      attackCooldown: 0,
      color: stats.color,
      size: stats.size,
      isWall: type === "wall",
    };
    unitsRef.current.push(unit);
    return unit;
  }, []);

  const spawnWave = useCallback((waveNum: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const enemyTypes: (keyof typeof UNIT_STATS)[] = ["goblin", "skeleton", "ogre"];
    const numEnemies = 3 + waveNum * 2;
    
    for (let i = 0; i < numEnemies; i++) {
      const type = enemyTypes[Math.floor(Math.random() * Math.min(enemyTypes.length, 1 + Math.floor(waveNum / 2)))];
      const side = Math.floor(Math.random() * 3);
      let x, y;
      
      if (side === 0) {
        x = Math.random() * canvas.width;
        y = -20;
      } else if (side === 1) {
        x = canvas.width + 20;
        y = Math.random() * canvas.height;
      } else {
        x = -20;
        y = Math.random() * canvas.height;
      }
      
      setTimeout(() => {
        spawnUnit(type, "enemy", x, y);
      }, i * 500);
    }
  }, [spawnUnit]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedUnit || gameOver) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cost = selectedUnit === "paladin" ? 50 : selectedUnit === "ranger" ? 40 : selectedUnit === "scout" ? 35 : selectedUnit === "wall" ? 30 : 60;
    
    if (gold >= cost) {
      spawnUnit(selectedUnit, "player", x, y);
      setGold(g => g - cost);
    }
  }, [selectedUnit, gold, gameOver, spawnUnit]);

  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    unitsRef.current = [];
    projectilesRef.current = [];
    nextIdRef.current = 1;
    waveTimerRef.current = 0;
    setWave(1);
    setScore(0);
    setGold(100);
    setCastleHealth(100);
    setGameOver(false);

    spawnUnit("paladin", "player", canvas.width / 2, canvas.height / 2);
    spawnWave(1);

    const castleX = canvas.width / 2;
    const castleY = canvas.height / 2;
    const castleRadius = 40;

    let animationId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#2a2a4e";
      for (let x = 0; x < canvas.width; x += 40) {
        for (let y = 0; y < canvas.height; y += 40) {
          if ((x / 40 + y / 40) % 2 === 0) {
            ctx.fillRect(x, y, 40, 40);
          }
        }
      }

      ctx.beginPath();
      ctx.arc(castleX, castleY, castleRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#4a4a6a";
      ctx.fill();
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CASTLE", castleX, castleY + 4);

      const units = unitsRef.current;
      
      for (const unit of units) {
        if (unit.isWall) {
          continue;
        }
        
        if (unit.team === "enemy") {
          let nearestWall: Unit | null = null;
          let nearestWallDist = Infinity;
          
          for (const other of units) {
            if (other.team === "player" && other.isWall && other.health > 0) {
              const dx = other.x - unit.x;
              const dy = other.y - unit.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const pathToCastleX = castleX - unit.x;
              const pathToCastleY = castleY - unit.y;
              const wallInPath = (dx * pathToCastleX + dy * pathToCastleY) > 0;
              
              if (wallInPath && dist < nearestWallDist && dist < 150) {
                nearestWallDist = dist;
                nearestWall = other;
              }
            }
          }
          
          if (nearestWall) {
            unit.targetX = nearestWall.x;
            unit.targetY = nearestWall.y;
          } else {
            unit.targetX = castleX;
            unit.targetY = castleY;
          }
        } else {
          let nearestEnemy: Unit | null = null;
          let nearestDist = Infinity;
          
          for (const other of units) {
            if (other.team !== unit.team && other.health > 0) {
              const dx = other.x - unit.x;
              const dy = other.y - unit.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = other;
              }
            }
          }
          
          if (nearestEnemy) {
            unit.targetX = nearestEnemy.x;
            unit.targetY = nearestEnemy.y;
          }
        }

        const dx = unit.targetX - unit.x;
        const dy = unit.targetY - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const distToCastle = Math.sqrt((unit.x - castleX) ** 2 + (unit.y - castleY) ** 2);
        if (unit.team === "enemy" && distToCastle < castleRadius + unit.size) {
          setCastleHealth(h => {
            const newHealth = h - unit.attack * deltaTime * 0.5;
            if (newHealth <= 0) {
              setGameOver(true);
            }
            return Math.max(0, newHealth);
          });
        }

        let canAttack = false;
        for (const other of units) {
          if (other.team !== unit.team && other.health > 0) {
            const odx = other.x - unit.x;
            const ody = other.y - unit.y;
            const odist = Math.sqrt(odx * odx + ody * ody);
            
            if (odist <= unit.range) {
              canAttack = true;
              
              if (unit.attackCooldown <= 0) {
                other.health -= unit.attack;
                unit.attackCooldown = 1;
                
                projectilesRef.current.push({
                  x: unit.x,
                  y: unit.y,
                  tx: other.x,
                  ty: other.y,
                  color: unit.color
                });
                
                if (other.health <= 0 && unit.team === "player") {
                  setScore(s => s + (other.type === "ogre" ? 50 : other.type === "skeleton" ? 20 : 10));
                  setGold(g => g + (other.type === "ogre" ? 25 : other.type === "skeleton" ? 10 : 5));
                }
              }
              break;
            }
          }
        }

        if (!canAttack && dist > 5) {
          unit.x += (dx / dist) * unit.speed * deltaTime * 60;
          unit.y += (dy / dist) * unit.speed * deltaTime * 60;
        }

        unit.attackCooldown = Math.max(0, unit.attackCooldown - deltaTime);
      }

      unitsRef.current = units.filter(u => u.health > 0);

      for (const unit of unitsRef.current) {
        if (unit.isWall) {
          ctx.fillStyle = unit.color;
          ctx.fillRect(unit.x - unit.size, unit.y - unit.size / 2, unit.size * 2, unit.size);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.strokeRect(unit.x - unit.size, unit.y - unit.size / 2, unit.size * 2, unit.size);
        } else {
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.size, 0, Math.PI * 2);
          ctx.fillStyle = unit.color;
          ctx.fill();
          
          if (unit.team === "player") {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        const healthPercent = unit.health / unit.maxHealth;
        ctx.fillStyle = "#333";
        ctx.fillRect(unit.x - 15, unit.y - unit.size - 8, 30, 4);
        ctx.fillStyle = healthPercent > 0.5 ? "#22c55e" : healthPercent > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(unit.x - 15, unit.y - unit.size - 8, 30 * healthPercent, 4);
      }

      projectilesRef.current = projectilesRef.current.filter(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.tx, p.ty);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        return false;
      });

      const enemyCount = unitsRef.current.filter(u => u.team === "enemy").length;
      if (enemyCount === 0) {
        waveTimerRef.current += deltaTime;
        if (waveTimerRef.current > 3) {
          waveTimerRef.current = 0;
          setWave(w => {
            const newWave = w + 1;
            spawnWave(newWave);
            setGold(g => g + 50);
            return newWave;
          });
        }
      }

      if (!gameOver) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isPlaying, spawnUnit, spawnWave]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 bg-[#171312]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Protector of the Realm
              </h1>
              <p className="text-sm text-muted-foreground">
                Defend your castle against waves of monsters
              </p>
            </div>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="game-hud">
                <Shield className="h-3 w-3 mr-1" />
                Wave {wave}
              </Badge>
              <Badge variant="outline" className="game-hud">
                <Sword className="h-3 w-3 mr-1" />
                Score: {score}
              </Badge>
              <Badge variant="outline" className="game-hud">
                <Coins className="h-3 w-3 mr-1" />
                {gold}
              </Badge>
              <Badge variant="outline" className="game-hud">
                <Heart className="h-3 w-3 mr-1" />
                {Math.round(castleHealth)}%
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {!isPlaying ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]">
            <Card className="p-8 text-center max-w-lg bg-background/90 backdrop-blur">
              <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Protector of the Realm</h2>
              <p className="text-muted-foreground mb-6">
                Defend your castle against waves of goblins, skeletons, and ogres! 
                Summon heroes to protect the realm.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left mb-6 text-sm">
                <div>
                  <p className="font-semibold text-yellow-500">Paladin (50g)</p>
                  <p className="text-muted-foreground">Tanky melee fighter</p>
                </div>
                <div>
                  <p className="font-semibold text-green-500">Ranger (40g)</p>
                  <p className="text-muted-foreground">Long range archer</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-500">Scout (35g)</p>
                  <p className="text-muted-foreground">Fast skirmisher</p>
                </div>
                <div>
                  <p className="font-semibold text-pink-500">Wizard (60g)</p>
                  <p className="text-muted-foreground">Powerful mage</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-400">Wall (30g)</p>
                  <p className="text-muted-foreground">Blocks enemies</p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => setIsPlaying(true)}
                data-testid="button-start-realm"
              >
                Defend the Realm
              </Button>
            </Card>
          </div>
        ) : gameOver ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <Card className="p-8 text-center">
              <h2 className="text-3xl font-bold text-red-500 mb-4">Castle Destroyed!</h2>
              <p className="text-xl mb-2">Final Score: {score}</p>
              <p className="text-muted-foreground mb-6">You survived {wave} waves</p>
              <Button onClick={() => setIsPlaying(false)}>
                Try Again
              </Button>
            </Card>
          </div>
        ) : null}
        
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
          data-testid="canvas-realm"
        />
        
        {isPlaying && !gameOver && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Card className="p-3 bg-background/90 backdrop-blur">
              <div className="flex gap-2">
                <Button
                  variant={selectedUnit === "paladin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit("paladin")}
                  disabled={gold < 50}
                  className="gap-1"
                  data-testid="button-paladin"
                >
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Paladin (50g)
                </Button>
                <Button
                  variant={selectedUnit === "ranger" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit("ranger")}
                  disabled={gold < 40}
                  className="gap-1"
                  data-testid="button-ranger"
                >
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  Ranger (40g)
                </Button>
                <Button
                  variant={selectedUnit === "scout" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit("scout")}
                  disabled={gold < 35}
                  className="gap-1"
                  data-testid="button-scout"
                >
                  <div className="w-3 h-3 rounded-full bg-purple-800" />
                  Scout (35g)
                </Button>
                <Button
                  variant={selectedUnit === "wizard" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit("wizard")}
                  disabled={gold < 60}
                  className="gap-1"
                  data-testid="button-wizard"
                >
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  Wizard (60g)
                </Button>
                <Button
                  variant={selectedUnit === "wall" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit("wall")}
                  disabled={gold < 30}
                  className="gap-1"
                  data-testid="button-wall"
                >
                  <div className="w-4 h-2 bg-gray-500 rounded-sm" />
                  Wall (30g)
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
