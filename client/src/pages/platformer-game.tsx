import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
import {
  Play,
  Pause,
  Home,
  RotateCcw,
  Trophy,
  Heart,
  Coins,
  ArrowUp,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'moving' | 'crumbling';
  moveDirection?: number;
  moveRange?: number;
  startX?: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: number;
  speed: number;
  startX: number;
  range: number;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  facing: number;
  jumping: boolean;
  dead: boolean;
}

export default function PlatformerGame() {
  return (
    <GrudgeGameWrapper gameSlug="platformer" gameName="Pixel Warrior" xpPerThousand={10} goldPerGame={5}>
      {(session) => <PlatformerGameInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function PlatformerGameInner({ session }: { session: GrudgeGameSession }) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gameDataRef = useRef<{
    player: Player;
    platforms: Platform[];
    coins: Coin[];
    enemies: Enemy[];
    camera: { x: number; y: number };
    levelWidth: number;
    levelHeight: number;
    keys: Set<string>;
  } | null>(null);
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('platformer-highscore');
    return saved ? parseInt(saved) : 0;
  });

  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const MOVE_SPEED = 5;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;

  const generateLevel = useCallback((levelNum: number) => {
    const platforms: Platform[] = [];
    const coins: Coin[] = [];
    const enemies: Enemy[] = [];
    const levelWidth = 2000 + levelNum * 500;
    const levelHeight = CANVAS_HEIGHT;

    platforms.push({ x: 0, y: levelHeight - 40, width: 300, height: 40, type: 'normal' });

    let lastX = 250;
    let lastY = levelHeight - 40;

    for (let i = 0; i < 15 + levelNum * 3; i++) {
      const gap = 100 + Math.random() * 100;
      const heightChange = Math.random() > 0.5 ? -50 - Math.random() * 50 : 50 + Math.random() * 30;
      let newY = lastY + heightChange;
      newY = Math.max(150, Math.min(levelHeight - 80, newY));
      
      const width = 80 + Math.random() * 120;
      const type: Platform['type'] = Math.random() < 0.2 ? 'moving' : 'normal';
      
      platforms.push({
        x: lastX + gap,
        y: newY,
        width,
        height: 20,
        type,
        moveDirection: type === 'moving' ? 1 : undefined,
        moveRange: type === 'moving' ? 50 + Math.random() * 50 : undefined,
        startX: type === 'moving' ? lastX + gap : undefined,
      });

      if (Math.random() > 0.3) {
        coins.push({
          x: lastX + gap + width / 2,
          y: newY - 50,
          collected: false,
          bobOffset: Math.random() * Math.PI * 2,
        });
      }

      if (Math.random() < 0.15 * levelNum && width > 100) {
        enemies.push({
          x: lastX + gap + 20,
          y: newY - 30,
          width: 30,
          height: 30,
          direction: 1,
          speed: 1 + levelNum * 0.3,
          startX: lastX + gap + 20,
          range: width - 60,
        });
      }

      lastX = lastX + gap + width;
      lastY = newY;
    }

    platforms.push({ x: lastX + 100, y: levelHeight - 40, width: 200, height: 40, type: 'normal' });
    
    coins.push({
      x: lastX + 200,
      y: levelHeight - 100,
      collected: false,
      bobOffset: 0,
    });

    return { platforms, coins, enemies, levelWidth, levelHeight };
  }, []);

  const startGame = useCallback(() => {
    const levelData = generateLevel(level);
    
    gameDataRef.current = {
      player: {
        x: 50,
        y: CANVAS_HEIGHT - 100,
        vx: 0,
        vy: 0,
        width: 30,
        height: 40,
        grounded: false,
        facing: 1,
        jumping: false,
        dead: false,
      },
      platforms: levelData.platforms,
      coins: levelData.coins,
      enemies: levelData.enemies,
      camera: { x: 0, y: 0 },
      levelWidth: levelData.levelWidth,
      levelHeight: levelData.levelHeight,
      keys: new Set(),
    };

    setScore(0);
    setLives(3);
    setGameState('playing');
  }, [level, generateLevel]);

  const respawnPlayer = useCallback(() => {
    if (!gameDataRef.current) return;
    
    gameDataRef.current.player = {
      x: 50,
      y: CANVAS_HEIGHT - 100,
      vx: 0,
      vy: 0,
      width: 30,
      height: 40,
      grounded: false,
      facing: 1,
      jumping: false,
      dead: false,
    };
    gameDataRef.current.camera = { x: 0, y: 0 };
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameDataRef.current) return;
      gameDataRef.current.keys.add(e.key.toLowerCase());
      
      if ((e.key === 'w' || e.key === 'ArrowUp' || e.key === ' ') && gameDataRef.current.player.grounded) {
        gameDataRef.current.player.vy = JUMP_FORCE;
        gameDataRef.current.player.grounded = false;
        gameDataRef.current.player.jumping = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameDataRef.current) return;
      gameDataRef.current.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      if (gameState !== 'playing' || !gameDataRef.current) return;
      
      const data = gameDataRef.current;
      const player = data.player;

      if (data.keys.has('a') || data.keys.has('arrowleft')) {
        player.vx = -MOVE_SPEED;
        player.facing = -1;
      } else if (data.keys.has('d') || data.keys.has('arrowright')) {
        player.vx = MOVE_SPEED;
        player.facing = 1;
      } else {
        player.vx *= 0.8;
      }

      player.vy += GRAVITY;
      player.vy = Math.min(player.vy, 15);

      player.x += player.vx;
      player.y += player.vy;

      player.grounded = false;

      for (const platform of data.platforms) {
        if (platform.type === 'moving' && platform.startX !== undefined && platform.moveRange !== undefined) {
          platform.x += (platform.moveDirection || 1) * 1.5;
          if (platform.x > platform.startX + platform.moveRange || platform.x < platform.startX) {
            platform.moveDirection = -(platform.moveDirection || 1);
          }
        }

        if (
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width &&
          player.y + player.height > platform.y &&
          player.y + player.height < platform.y + platform.height + 20 &&
          player.vy >= 0
        ) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.grounded = true;
          player.jumping = false;

          if (platform.type === 'moving') {
            player.x += (platform.moveDirection || 1) * 1.5;
          }
        }
      }

      for (const coin of data.coins) {
        if (coin.collected) continue;
        coin.bobOffset += 0.1;
        
        const coinY = coin.y + Math.sin(coin.bobOffset) * 5;
        if (
          player.x + player.width > coin.x - 15 &&
          player.x < coin.x + 15 &&
          player.y + player.height > coinY - 15 &&
          player.y < coinY + 15
        ) {
          coin.collected = true;
          setScore(prev => {
            const newScore = prev + 100;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('platformer-highscore', newScore.toString());
            }
            return newScore;
          });
        }
      }

      for (const enemy of data.enemies) {
        enemy.x += enemy.direction * enemy.speed;
        if (enemy.x > enemy.startX + enemy.range || enemy.x < enemy.startX) {
          enemy.direction *= -1;
        }

        if (
          player.x + player.width > enemy.x &&
          player.x < enemy.x + enemy.width &&
          player.y + player.height > enemy.y &&
          player.y < enemy.y + enemy.height
        ) {
          if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2) {
            const idx = data.enemies.indexOf(enemy);
            data.enemies.splice(idx, 1);
            player.vy = JUMP_FORCE * 0.6;
            setScore(prev => prev + 200);
          } else {
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameState('gameover');
              } else {
                respawnPlayer();
              }
              return newLives;
            });
            return;
          }
        }
      }

      if (player.y > data.levelHeight + 100) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameover');
          } else {
            respawnPlayer();
          }
          return newLives;
        });
        return;
      }

      if (player.x > data.levelWidth - 100) {
        if (level < 3) {
          setLevel(prev => prev + 1);
          setScore(prev => prev + 500);
          setGameState('victory');
        } else {
          setGameState('victory');
        }
        return;
      }

      data.camera.x = Math.max(0, Math.min(player.x - CANVAS_WIDTH / 3, data.levelWidth - CANVAS_WIDTH));

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#16213e';
      for (let i = 0; i < 5; i++) {
        const parallax = 0.1 + i * 0.1;
        const x = (i * 200 - data.camera.x * parallax) % (CANVAS_WIDTH + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x, CANVAS_HEIGHT);
        ctx.lineTo(x + 60, CANVAS_HEIGHT - 80 - i * 30);
        ctx.lineTo(x + 120, CANVAS_HEIGHT);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(-data.camera.x, 0);

      for (const platform of data.platforms) {
        const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
        if (platform.type === 'moving') {
          gradient.addColorStop(0, '#9b59b6');
          gradient.addColorStop(1, '#8e44ad');
        } else {
          gradient.addColorStop(0, '#27ae60');
          gradient.addColorStop(1, '#1e8449');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < platform.width; i += 15) {
          ctx.beginPath();
          ctx.moveTo(platform.x + i + 5, platform.y);
          ctx.lineTo(platform.x + i + 7, platform.y - 8);
          ctx.lineTo(platform.x + i + 9, platform.y);
          ctx.fill();
        }
      }

      for (const coin of data.coins) {
        if (coin.collected) continue;
        const bobY = coin.y + Math.sin(coin.bobOffset) * 5;
        
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(coin.x, bobY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(coin.x, bobY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', coin.x, bobY + 4);
      }

      for (const enemy of data.enemies) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, 8, 8);
        ctx.fillRect(enemy.x + enemy.width - 13, enemy.y + 5, 8, 8);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(enemy.x + 7, enemy.y + 7, 3, 3);
        ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 7, 3, 3);
      }

      ctx.fillStyle = '#3498db';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(player.x + 5, player.y + 5, 8, 8);
      ctx.fillRect(player.x + player.width - 13, player.y + 5, 8, 8);
      
      ctx.fillStyle = '#fff';
      const eyeOffset = player.facing > 0 ? 2 : -2;
      ctx.fillRect(player.x + 7 + eyeOffset, player.y + 7, 3, 3);
      ctx.fillRect(player.x + player.width - 10 + eyeOffset, player.y + 7, 3, 3);
      
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(player.x + 8, player.y + player.height - 10, 6, 10);
      ctx.fillRect(player.x + player.width - 14, player.y + player.height - 10, 6, 10);

      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(data.levelWidth - 50, CANVAS_HEIGHT - 150, 50, 110);
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.moveTo(data.levelWidth - 75, CANVAS_HEIGHT - 150);
      ctx.lineTo(data.levelWidth - 25, CANVAS_HEIGHT - 200);
      ctx.lineTo(data.levelWidth + 25, CANVAS_HEIGHT - 150);
      ctx.fill();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, level, highScore, respawnPlayer]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {gameState === 'menu' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Pixel Platformer
            </CardTitle>
            <p className="text-muted-foreground">Jump, collect coins, avoid enemies!</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                High Score: {highScore}
              </Badge>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Controls:</p>
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <ArrowRight className="h-4 w-4" />
                <span>A/D or Arrow Keys - Move</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                <span>W, Space, or Up Arrow - Jump</span>
              </div>
            </div>
            
            <Button 
              onClick={startGame} 
              className="w-full" 
              size="lg"
              data-testid="button-start-platformer"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
              data-testid="button-back-home"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'playing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-yellow-500" />
                {score}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                {lives}
              </Badge>
              <Badge variant="outline">Level {level}</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGameState('paused')}
              data-testid="button-pause-platformer"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>
          
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-border rounded-lg shadow-lg"
            data-testid="canvas-platformer"
          />
        </div>
      )}

      {gameState === 'paused' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Game Paused</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setGameState('playing')} 
              className="w-full"
              data-testid="button-resume-platformer"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button 
              variant="outline" 
              onClick={startGame} 
              className="w-full"
              data-testid="button-restart-platformer"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart Level
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setGameState('menu');
                setLevel(1);
              }} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'gameover' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-500">Game Over!</CardTitle>
            <p className="text-muted-foreground">Final Score: {score}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {score >= highScore && score > 0 && (
              <div className="text-center">
                <Badge className="bg-yellow-500 text-yellow-900">New High Score!</Badge>
              </div>
            )}
            <Button 
              onClick={() => {
                setLevel(1);
                startGame();
              }} 
              className="w-full"
              data-testid="button-try-again"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setGameState('menu');
                setLevel(1);
              }} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'victory' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-500 flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6" />
              {level >= 3 ? 'You Win!' : 'Level Complete!'}
            </CardTitle>
            <p className="text-muted-foreground">Score: {score}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {level < 3 ? (
              <Button 
                onClick={() => {
                  setLevel(prev => prev + 1);
                  startGame();
                }} 
                className="w-full"
                data-testid="button-next-level"
              >
                <Play className="h-5 w-5 mr-2" />
                Next Level ({level + 1}/3)
              </Button>
            ) : (
              <div className="text-center space-y-2">
                <Badge className="bg-yellow-500 text-yellow-900">All Levels Complete!</Badge>
                <p className="text-sm text-muted-foreground">Total Score: {score}</p>
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                setGameState('menu');
                setLevel(1);
              }} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
