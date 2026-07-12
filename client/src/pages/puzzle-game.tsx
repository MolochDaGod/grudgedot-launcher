import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
import {
  Play,
  Pause,
  Home,
  RotateCcw,
  Trophy,
  Timer,
  Zap,
  Sparkles
} from "lucide-react";

interface Tile {
  type: number;
  x: number;
  y: number;
  selected: boolean;
  matched: boolean;
  falling: boolean;
  targetY: number;
}

const TILE_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#e67e22',
];

const TILE_SYMBOLS = ['★', '◆', '●', '▲', '■', '♥'];

export default function PuzzleGame() {
  return (
    <GrudgeGameWrapper gameSlug="puzzle" gameName="Gem Crusher" xpPerThousand={8} goldPerGame={10}>
      {(session) => <PuzzleGameInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function PuzzleGameInner({ session }: { session: GrudgeGameSession }) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [targetScore, setTargetScore] = useState(1000);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [selectedTile, setSelectedTile] = useState<{row: number, col: number} | null>(null);
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('puzzle-highscore');
    return saved ? parseInt(saved) : 0;
  });

  const GRID_SIZE = 8;
  const TILE_SIZE = 50;
  const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

  const createTile = useCallback((row: number, col: number, type?: number): Tile => {
    return {
      type: type !== undefined ? type : Math.floor(Math.random() * TILE_COLORS.length),
      x: col * TILE_SIZE,
      y: row * TILE_SIZE,
      selected: false,
      matched: false,
      falling: false,
      targetY: row * TILE_SIZE,
    };
  }, []);

  const initGrid = useCallback(() => {
    const newGrid: Tile[][] = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        let tile: Tile;
        do {
          tile = createTile(row, col);
        } while (
          (col >= 2 && newGrid[row][col-1]?.type === tile.type && newGrid[row][col-2]?.type === tile.type) ||
          (row >= 2 && newGrid[row-1]?.[col]?.type === tile.type && newGrid[row-2]?.[col]?.type === tile.type)
        );
        newGrid[row][col] = tile;
      }
    }
    
    return newGrid;
  }, [createTile]);

  const findMatches = useCallback((grid: Tile[][]) => {
    const matches: Set<string> = new Set();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const type = grid[row][col].type;
        if (type === grid[row][col+1]?.type && type === grid[row][col+2]?.type) {
          let matchLength = 3;
          while (col + matchLength < GRID_SIZE && grid[row][col+matchLength]?.type === type) {
            matchLength++;
          }
          for (let i = 0; i < matchLength; i++) {
            matches.add(`${row},${col+i}`);
          }
        }
      }
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const type = grid[row][col].type;
        if (type === grid[row+1]?.[col]?.type && type === grid[row+2]?.[col]?.type) {
          let matchLength = 3;
          while (row + matchLength < GRID_SIZE && grid[row+matchLength]?.[col]?.type === type) {
            matchLength++;
          }
          for (let i = 0; i < matchLength; i++) {
            matches.add(`${row+i},${col}`);
          }
        }
      }
    }

    return matches;
  }, []);

  const removeMatchesAndRefill = useCallback((grid: Tile[][], matches: Set<string>) => {
    const newGrid = grid.map(row => row.map(tile => ({...tile})));
    let pointsEarned = 0;

    matches.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      newGrid[row][col].matched = true;
      pointsEarned += 10;
    });

    const matchMultiplier = matches.size >= 5 ? 3 : matches.size >= 4 ? 2 : 1;
    pointsEarned *= matchMultiplier;

    for (let col = 0; col < GRID_SIZE; col++) {
      let emptySpaces = 0;
      
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col].matched) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          newGrid[row + emptySpaces][col] = {
            ...newGrid[row][col],
            targetY: (row + emptySpaces) * TILE_SIZE,
            falling: true,
          };
          newGrid[row][col] = createTile(row, col);
          newGrid[row][col].y = -TILE_SIZE * (emptySpaces - row);
          newGrid[row][col].targetY = row * TILE_SIZE;
          newGrid[row][col].falling = true;
        }
      }
      
      for (let i = 0; i < emptySpaces; i++) {
        newGrid[i][col] = createTile(i, col);
        newGrid[i][col].y = -TILE_SIZE * (emptySpaces - i);
        newGrid[i][col].targetY = i * TILE_SIZE;
        newGrid[i][col].falling = true;
      }
    }

    return { newGrid, pointsEarned };
  }, [createTile]);

  const swapTiles = useCallback((grid: Tile[][], r1: number, c1: number, r2: number, c2: number) => {
    const newGrid = grid.map(row => row.map(tile => ({...tile})));
    const temp = newGrid[r1][c1];
    newGrid[r1][c1] = {...newGrid[r2][c2], x: c1 * TILE_SIZE, y: r1 * TILE_SIZE};
    newGrid[r2][c2] = {...temp, x: c2 * TILE_SIZE, y: r2 * TILE_SIZE};
    return newGrid;
  }, []);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (isAnimating || gameState !== 'playing') return;

    if (!selectedTile) {
      setSelectedTile({ row, col });
      setGrid(prev => {
        const newGrid = prev.map(r => r.map(t => ({...t, selected: false})));
        newGrid[row][col].selected = true;
        return newGrid;
      });
    } else {
      const dr = Math.abs(row - selectedTile.row);
      const dc = Math.abs(col - selectedTile.col);
      
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        setIsAnimating(true);
        
        const swappedGrid = swapTiles(grid, selectedTile.row, selectedTile.col, row, col);
        const matches = findMatches(swappedGrid);
        
        if (matches.size >= 3) {
          setMoves(prev => prev - 1);
          setGrid(swappedGrid.map(r => r.map(t => ({...t, selected: false}))));
          
          setTimeout(() => {
            const processMatches = (currentGrid: Tile[][], currentCombo: number) => {
              const currentMatches = findMatches(currentGrid);
              if (currentMatches.size >= 3) {
                const { newGrid, pointsEarned } = removeMatchesAndRefill(currentGrid, currentMatches);
                const comboMultiplier = 1 + currentCombo * 0.5;
                const finalPoints = Math.floor(pointsEarned * comboMultiplier);
                
                setScore(prev => {
                  const newScore = prev + finalPoints;
                  if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem('puzzle-highscore', newScore.toString());
                  }
                  return newScore;
                });
                setCombo(currentCombo + 1);
                
                setTimeout(() => {
                  const settledGrid = newGrid.map(r => r.map(t => ({
                    ...t,
                    y: t.targetY,
                    falling: false,
                    matched: false,
                  })));
                  setGrid(settledGrid);
                  
                  setTimeout(() => {
                    processMatches(settledGrid, currentCombo + 1);
                  }, 200);
                }, 300);
              } else {
                setCombo(0);
                setIsAnimating(false);
              }
            };
            
            processMatches(swappedGrid, 0);
          }, 100);
        } else {
          setGrid(prev => prev.map(r => r.map(t => ({...t, selected: false}))));
          setIsAnimating(false);
        }
      } else {
        setGrid(prev => {
          const newGrid = prev.map(r => r.map(t => ({...t, selected: false})));
          newGrid[row][col].selected = true;
          return newGrid;
        });
        setSelectedTile({ row, col });
      }
      
      if (selectedTile.row === row && selectedTile.col === col) {
        setGrid(prev => prev.map(r => r.map(t => ({...t, selected: false}))));
        setSelectedTile(null);
      } else if (!((Math.abs(row - selectedTile.row) === 1 && col === selectedTile.col) || 
                   (Math.abs(col - selectedTile.col) === 1 && row === selectedTile.row))) {
        setSelectedTile({ row, col });
      } else {
        setSelectedTile(null);
      }
    }
  }, [selectedTile, grid, isAnimating, gameState, swapTiles, findMatches, removeMatchesAndRefill, highScore]);

  const startGame = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setMoves(30);
    setCombo(0);
    setSelectedTile(null);
    setTargetScore(1000 * level);
    setGameState('playing');
  }, [initGrid, level]);

  useEffect(() => {
    if (moves <= 0 && !isAnimating) {
      if (score >= targetScore) {
        setLevel(prev => prev + 1);
      }
      setGameState('gameover');
    }
  }, [moves, score, targetScore, isAnimating]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
        ctx.stroke();
      }

      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const tile = grid[row]?.[col];
          if (!tile || tile.matched) continue;

          const x = tile.x + TILE_SIZE / 2;
          const y = tile.y + TILE_SIZE / 2;
          const radius = TILE_SIZE / 2 - 4;

          if (tile.selected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(tile.x + 2, tile.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          }

          const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
          gradient.addColorStop(0, TILE_COLORS[tile.type]);
          gradient.addColorStop(1, adjustColor(TILE_COLORS[tile.type], -30));
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(TILE_SYMBOLS[tile.type], x, y);
        }
      }

      if (combo > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${combo}x COMBO!`, CANVAS_SIZE / 2, 30);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, grid, combo]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      handleTileClick(row, col);
    }
  }, [handleTileClick]);

  function adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {gameState === 'menu' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-500" />
              Gem Match
            </CardTitle>
            <p className="text-muted-foreground">Match 3 or more gems to score!</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                High Score: {highScore}
              </Badge>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">How to Play:</p>
              <p>Click a gem, then click an adjacent gem to swap them.</p>
              <p>Match 3 or more of the same gem to score points!</p>
              <p>Chain combos for bonus multipliers!</p>
            </div>
            
            <Button 
              onClick={startGame} 
              className="w-full" 
              size="lg"
              data-testid="button-start-puzzle"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {score}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                {moves} moves
              </Badge>
              <Badge variant="outline">Level {level}</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGameState('paused')}
              data-testid="button-pause-puzzle"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Target: {targetScore}</span>
              <span>{Math.min(100, Math.floor((score / targetScore) * 100))}%</span>
            </div>
            <Progress value={Math.min(100, (score / targetScore) * 100)} className="h-2" />
          </div>
          
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="border-2 border-border rounded-lg shadow-lg cursor-pointer"
            onClick={handleCanvasClick}
            data-testid="canvas-puzzle"
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
              data-testid="button-resume-puzzle"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button 
              variant="outline" 
              onClick={startGame} 
              className="w-full"
              data-testid="button-restart-puzzle"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart
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
            <CardTitle className={`text-2xl ${score >= targetScore ? 'text-green-500' : 'text-red-500'}`}>
              {score >= targetScore ? 'Level Complete!' : 'Game Over'}
            </CardTitle>
            <p className="text-muted-foreground">Final Score: {score}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {score >= highScore && score > 0 && (
              <div className="text-center">
                <Badge className="bg-yellow-500 text-yellow-900">New High Score!</Badge>
              </div>
            )}
            
            {score >= targetScore && (
              <Button 
                onClick={() => {
                  startGame();
                }} 
                className="w-full"
                data-testid="button-next-level"
              >
                <Play className="h-5 w-5 mr-2" />
                Next Level ({level}/∞)
              </Button>
            )}
            
            <Button 
              variant={score >= targetScore ? "outline" : "default"}
              onClick={() => {
                setLevel(1);
                startGame();
              }} 
              className="w-full"
              data-testid="button-try-again"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              {score >= targetScore ? 'Play Again' : 'Try Again'}
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
    </div>
  );
}
