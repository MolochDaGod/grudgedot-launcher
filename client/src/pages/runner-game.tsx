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
  Zap,
  ArrowUp
} from "lucide-react";

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cactus' | 'bird' | 'rock';
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  ducking: boolean;
}

export default function RunnerGame() {
  return (
    <GrudgeGameWrapper gameSlug="runner" gameName="Sprint Master" xpPerThousand={8} goldPerGame={5}>
      {(session) => <RunnerGameInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function RunnerGameInner({ session }: { session: GrudgeGameSession }) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gameDataRef = useRef<{
    player: Player;
    obstacles: Obstacle[];
    coins: Coin[];
    groundY: number;
    speed: number;
    distance: number;
    cloudX: number[];
  } | null>(null);
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('runner-highscore');
    return saved ? parseInt(saved) : 0;
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const GRAVITY = 0.8;
  const JUMP_FORCE = -15;
  const GROUND_Y = CANVAS_HEIGHT - 60;

  const startGame = useCallback(() => {
    gameDataRef.current = {
      player: {
        x: 100,
        y: GROUND_Y - 60,
        vy: 0,
        width: 40,
        height: 60,
        grounded: true,
        ducking: false,
      },
      obstacles: [],
      coins: [],
      groundY: GROUND_Y,
      speed: 6,
      distance: 0,
      cloudX: [100, 300, 500, 700],
    };

    setScore(0);
    setDistance(0);
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
      const player = gameDataRef.current.player;
      
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
      }
      
      if (e.key === 'ArrowDown' || e.key === 's') {
        player.ducking = true;
        player.height = 30;
        player.y = GROUND_Y - 30;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameDataRef.current) return;
      const player = gameDataRef.current.player;
      
      if (e.key === 'ArrowDown' || e.key === 's') {
        player.ducking = false;
        player.height = 60;
        if (player.grounded) {
          player.y = GROUND_Y - 60;
        }
      }
    };

    const handleTouch = () => {
      if (!gameDataRef.current) return;
      const player = gameDataRef.current.player;
      
      if (player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('click', handleTouch);
    canvas.addEventListener('touchstart', handleTouch);

    const spawnObstacle = () => {
      if (!gameDataRef.current) return;
      
      const types: Obstacle['type'][] = ['cactus', 'rock', 'bird'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let y = GROUND_Y;
      let width = 30;
      let height = 50;
      
      if (type === 'bird') {
        y = GROUND_Y - 80 - Math.random() * 60;
        width = 40;
        height = 30;
      } else if (type === 'rock') {
        width = 40;
        height = 30;
        y = GROUND_Y - height;
      } else {
        y = GROUND_Y - height;
      }
      
      gameDataRef.current.obstacles.push({
        x: CANVAS_WIDTH + 50,
        y,
        width,
        height,
        type,
        passed: false,
      });
    };

    const spawnCoin = () => {
      if (!gameDataRef.current) return;
      
      const heights = [GROUND_Y - 80, GROUND_Y - 120, GROUND_Y - 160];
      const y = heights[Math.floor(Math.random() * heights.length)];
      
      gameDataRef.current.coins.push({
        x: CANVAS_WIDTH + 50,
        y,
        collected: false,
      });
    };

    let lastObstacleTime = 0;
    let lastCoinTime = 0;

    const gameLoop = (timestamp: number) => {
      if (gameState !== 'playing' || !gameDataRef.current) return;
      
      const data = gameDataRef.current;
      const player = data.player;

      if (!player.grounded) {
        player.vy += GRAVITY;
        player.y += player.vy;
        
        if (player.y >= GROUND_Y - player.height) {
          player.y = GROUND_Y - player.height;
          player.vy = 0;
          player.grounded = true;
        }
      }

      data.distance += data.speed;
      setDistance(Math.floor(data.distance / 10));

      data.speed = Math.min(15, 6 + data.distance / 2000);

      if (timestamp - lastObstacleTime > 1500 - Math.min(800, data.distance / 10)) {
        spawnObstacle();
        lastObstacleTime = timestamp;
      }

      if (timestamp - lastCoinTime > 2000) {
        if (Math.random() > 0.5) spawnCoin();
        lastCoinTime = timestamp;
      }

      for (let i = data.obstacles.length - 1; i >= 0; i--) {
        const obs = data.obstacles[i];
        obs.x -= data.speed;
        
        if (obs.x + obs.width < 0) {
          data.obstacles.splice(i, 1);
          continue;
        }
        
        if (!obs.passed && obs.x + obs.width < player.x) {
          obs.passed = true;
          setScore(prev => prev + 10);
        }
        
        if (
          player.x + player.width > obs.x + 5 &&
          player.x < obs.x + obs.width - 5 &&
          player.y + player.height > obs.y + 5 &&
          player.y < obs.y + obs.height - 5
        ) {
          const finalScore = Math.floor(data.distance / 10) + score;
          if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem('runner-highscore', finalScore.toString());
          }
          setGameState('gameover');
          return;
        }
      }

      for (let i = data.coins.length - 1; i >= 0; i--) {
        const coin = data.coins[i];
        coin.x -= data.speed;
        
        if (coin.x + 20 < 0) {
          data.coins.splice(i, 1);
          continue;
        }
        
        if (
          !coin.collected &&
          player.x + player.width > coin.x - 15 &&
          player.x < coin.x + 15 &&
          player.y + player.height > coin.y - 15 &&
          player.y < coin.y + 15
        ) {
          coin.collected = true;
          setScore(prev => prev + 50);
          data.coins.splice(i, 1);
        }
      }

      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#fff';
      data.cloudX.forEach((cx, i) => {
        const cloudY = 50 + (i % 3) * 30;
        ctx.beginPath();
        ctx.arc(cx, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cx + 25, cloudY - 10, 20, 0, Math.PI * 2);
        ctx.arc(cx + 50, cloudY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        data.cloudX[i] -= data.speed * 0.3;
        if (data.cloudX[i] < -80) data.cloudX[i] = CANVAS_WIDTH + 80;
      });

      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, GROUND_Y - 5, CANVAS_WIDTH, 10);

      for (const obs of data.obstacles) {
        if (obs.type === 'cactus') {
          ctx.fillStyle = '#228B22';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillRect(obs.x - 10, obs.y + 15, 15, 8);
          ctx.fillRect(obs.x + obs.width - 5, obs.y + 25, 15, 8);
        } else if (obs.type === 'rock') {
          ctx.fillStyle = '#696969';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'bird') {
          ctx.fillStyle = '#8B0000';
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#FF6347';
          const wingY = obs.y + Math.sin(timestamp / 50) * 5;
          ctx.beginPath();
          ctx.moveTo(obs.x + 10, obs.y + obs.height / 2);
          ctx.lineTo(obs.x - 10, wingY);
          ctx.lineTo(obs.x + 10, obs.y + obs.height / 2 + 5);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width - 10, obs.y + obs.height / 2);
          ctx.lineTo(obs.x + obs.width + 10, wingY);
          ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height / 2 + 5);
          ctx.fill();
        }
      }

      for (const coin of data.coins) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      ctx.fillStyle = '#FF8E8E';
      ctx.fillRect(player.x + 5, player.y + 5, player.width - 10, player.height / 3);
      
      ctx.fillStyle = '#333';
      const eyeY = player.y + 10;
      ctx.fillRect(player.x + 8, eyeY, 6, 6);
      ctx.fillRect(player.x + player.width - 14, eyeY, 6, 6);
      
      if (!player.grounded) {
        ctx.fillStyle = '#FF8E8E';
        ctx.fillRect(player.x + 5, player.y + player.height - 15, 10, 15);
        ctx.fillRect(player.x + player.width - 15, player.y + player.height - 15, 10, 15);
      }

      ctx.fillStyle = '#333';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Distance: ${Math.floor(data.distance / 10)}m`, 20, 30);
      ctx.fillText(`Speed: ${data.speed.toFixed(1)}x`, 20, 55);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('click', handleTouch);
      canvas.removeEventListener('touchstart', handleTouch);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, score, highScore]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {gameState === 'menu' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Endless Runner
            </CardTitle>
            <p className="text-muted-foreground">Run as far as you can!</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                High Score: {highScore}m
              </Badge>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Controls:</p>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                <span>Space, W, or Up Arrow - Jump</span>
              </div>
              <p>Down Arrow or S - Duck (avoid birds)</p>
              <p>Click/Tap - Jump (mobile)</p>
            </div>
            
            <Button 
              onClick={startGame} 
              className="w-full" 
              size="lg"
              data-testid="button-start-runner"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Running
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
                <Trophy className="h-4 w-4 text-yellow-500" />
                {score} pts
              </Badge>
              <Badge variant="outline">
                {distance}m
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGameState('paused')}
              data-testid="button-pause-runner"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>
          
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-border rounded-lg shadow-lg cursor-pointer"
            data-testid="canvas-runner"
          />
          
          <p className="text-center text-sm text-muted-foreground">
            Press Space/Up to jump, Down to duck
          </p>
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
              data-testid="button-resume-runner"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button 
              variant="outline" 
              onClick={startGame} 
              className="w-full"
              data-testid="button-restart-runner"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setGameState('menu')} 
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
            <div className="space-y-1">
              <p className="text-muted-foreground">Distance: {distance}m</p>
              <p className="text-muted-foreground">Score: {score + distance}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(score + distance) >= highScore && (score + distance) > 0 && (
              <div className="text-center">
                <Badge className="bg-yellow-500 text-yellow-900">New High Score!</Badge>
              </div>
            )}
            <Button 
              onClick={startGame} 
              className="w-full"
              data-testid="button-try-again"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGameState('menu')} 
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
