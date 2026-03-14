import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Trophy, Clock, Gamepad2, Zap, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import { overdriveApi, type Track, type LeaderboardEntry } from "@/lib/gameApi";

const FALLBACK_TRACKS: Track[] = [
  { id: "houston-strip", name: "Houston Strip", description: "Downtown drag race through the heart of Houston.", length: 400, difficulty: 2, terrain: "asphalt" },
  { id: "gulf-coast-run", name: "Gulf Coast Run", description: "Sprint along the Gulf Freeway at midnight.", length: 600, difficulty: 3, terrain: "highway" },
  { id: "nasa-blvd", name: "NASA Boulevard", description: "High-speed blast past the Space Center.", length: 800, difficulty: 4, terrain: "boulevard" },
  { id: "bayou-alley", name: "Bayou Alley", description: "Tight backstreet run through the Bayou district.", length: 350, difficulty: 1, terrain: "street" },
];

/* ── Houston neighbourhood theme per track ─────────────────────────── */
interface TrackTheme {
  bg: string;
  road: string;
  stripe: string;
  divider: string;
  gridColor: string;
  gridDensity: number;
  buildingColors: string[];
  landmarks: { name: string; y: number; w: number; h: number; color: string }[];
  envObjects: { type: "tree" | "lamp" | "sign" | "water" | "dome" | "tower"; x: number; yOff: number }[];
  skyGlow: string;
  /** route drawn on the Houston overview map */
  route: { x: number; y: number }[];
  routeColor: string;
}

const TRACK_THEMES: Record<string, TrackTheme> = {
  "houston-strip": {
    bg: "#0c0c14",
    road: "#2e2e2e",
    stripe: "#ffff00",
    divider: "#ffff00",
    gridColor: "#1a1a28",
    gridDensity: 8,
    buildingColors: ["#1a2844", "#22305a", "#14203c", "#182a4e", "#0f1a30"],
    landmarks: [
      { name: "Chase Tower", y: 80, w: 70, h: 55, color: "#1e3560" },
      { name: "Discovery Grn", y: 220, w: 55, h: 35, color: "#1a4a2a" },
      { name: "Minute Maid", y: 350, w: 80, h: 45, color: "#3a2020" },
      { name: "Toyota Center", y: 480, w: 65, h: 50, color: "#2a1e3e" },
    ],
    envObjects: [
      { type: "tower", x: 60, yOff: 0 },
      { type: "lamp", x: 145, yOff: 60 },
      { type: "tower", x: 40, yOff: 180 },
      { type: "sign", x: 700, yOff: 100 },
      { type: "lamp", x: 680, yOff: 280 },
      { type: "tower", x: 720, yOff: 400 },
    ],
    skyGlow: "rgba(40,80,180,0.06)",
    route: [{ x: 145, y: 95 }, { x: 155, y: 130 }, { x: 148, y: 165 }, { x: 152, y: 200 }],
    routeColor: "#ff3333",
  },
  "gulf-coast-run": {
    bg: "#080e14",
    road: "#333",
    stripe: "#ffffff",
    divider: "#ff8800",
    gridColor: "#121a22",
    gridDensity: 5,
    buildingColors: ["#1a1a1a", "#222", "#181818", "#252525"],
    landmarks: [
      { name: "Ellington", y: 90, w: 60, h: 40, color: "#2a2a3a" },
      { name: "Webster", y: 240, w: 50, h: 30, color: "#252535" },
      { name: "League City", y: 390, w: 65, h: 35, color: "#222232" },
      { name: "Galveston", y: 520, w: 75, h: 45, color: "#1a2530" },
    ],
    envObjects: [
      { type: "lamp", x: 120, yOff: 40 },
      { type: "sign", x: 700, yOff: 50 },
      { type: "lamp", x: 130, yOff: 200 },
      { type: "sign", x: 690, yOff: 350 },
      { type: "lamp", x: 125, yOff: 500 },
    ],
    skyGlow: "rgba(20,40,60,0.08)",
    route: [{ x: 155, y: 160 }, { x: 170, y: 195 }, { x: 185, y: 235 }, { x: 200, y: 270 }],
    routeColor: "#ff8800",
  },
  "nasa-blvd": {
    bg: "#040810",
    road: "#282838",
    stripe: "#00ccff",
    divider: "#00ccff",
    gridColor: "#0a0e1a",
    gridDensity: 6,
    buildingColors: ["#0e1a2a", "#12203a", "#0a1422", "#162844"],
    landmarks: [
      { name: "JSC Gate", y: 70, w: 75, h: 35, color: "#1a2840" },
      { name: "Rocket Park", y: 200, w: 60, h: 50, color: "#0e1830" },
      { name: "Mission Ctrl", y: 340, w: 80, h: 40, color: "#152040" },
      { name: "Saturn V", y: 480, w: 50, h: 60, color: "#1a2a50" },
    ],
    envObjects: [
      { type: "dome", x: 55, yOff: 30 },
      { type: "dome", x: 730, yOff: 160 },
      { type: "lamp", x: 140, yOff: 120 },
      { type: "tower", x: 720, yOff: 320 },
      { type: "dome", x: 50, yOff: 440 },
      { type: "lamp", x: 140, yOff: 350 },
    ],
    skyGlow: "rgba(0,120,200,0.05)",
    route: [{ x: 185, y: 200 }, { x: 200, y: 235 }, { x: 210, y: 260 }, { x: 215, y: 290 }],
    routeColor: "#00ccff",
  },
  "bayou-alley": {
    bg: "#0a100a",
    road: "#2a2420",
    stripe: "#88aa44",
    divider: "#88aa44",
    gridColor: "#141a14",
    gridDensity: 10,
    buildingColors: ["#1a1a14", "#1e1e16", "#222218", "#18180e"],
    landmarks: [
      { name: "Buffalo Bayou", y: 100, w: 80, h: 30, color: "#1a3020" },
      { name: "Allen Pkwy", y: 230, w: 60, h: 35, color: "#1e2a18" },
      { name: "Montrose", y: 360, w: 55, h: 40, color: "#2a2218" },
      { name: "Rice Village", y: 490, w: 65, h: 35, color: "#22281a" },
    ],
    envObjects: [
      { type: "tree", x: 40, yOff: 0 },
      { type: "water", x: 25, yOff: 80 },
      { type: "tree", x: 55, yOff: 170 },
      { type: "water", x: 20, yOff: 300 },
      { type: "tree", x: 730, yOff: 120 },
      { type: "tree", x: 710, yOff: 350 },
      { type: "water", x: 720, yOff: 460 },
    ],
    skyGlow: "rgba(40,60,30,0.07)",
    route: [{ x: 120, y: 105 }, { x: 130, y: 135 }, { x: 125, y: 160 }, { x: 135, y: 190 }],
    routeColor: "#88aa44",
  },
};
const DEFAULT_THEME = TRACK_THEMES["houston-strip"];

function getTheme(trackId: string): TrackTheme {
  return TRACK_THEMES[trackId] ?? DEFAULT_THEME;
}

/* ── Animated Houston overview mini-map ──────────────────────────── */
function HoustonMapPreview({ tracks, selectedId }: { tracks: Track[]; selectedId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = 0;
    const W = canvas.width;
    const H = canvas.height;

    /* Houston simplified map: freeways + water + districts */
    const drawMap = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      /* Water — Buffalo Bayou + Ship Channel */
      ctx.strokeStyle = "#1a3040";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.35);
      ctx.quadraticCurveTo(W * 0.25, H * 0.28, W * 0.5, H * 0.36);
      ctx.quadraticCurveTo(W * 0.75, H * 0.44, W, H * 0.4);
      ctx.stroke();

      /* I-610 Loop */
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.45, W * 0.28, H * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      /* I-45 North-South */
      ctx.beginPath();
      ctx.moveTo(W * 0.52, 0);
      ctx.lineTo(W * 0.55, H * 0.45);
      ctx.lineTo(W * 0.65, H);
      ctx.stroke();

      /* I-10 East-West */
      ctx.beginPath();
      ctx.moveTo(0, H * 0.42);
      ctx.lineTo(W, H * 0.42);
      ctx.stroke();

      /* US-59 / I-69 */
      ctx.beginPath();
      ctx.moveTo(W * 0.15, 0);
      ctx.lineTo(W * 0.5, H * 0.45);
      ctx.lineTo(W * 0.85, H);
      ctx.stroke();

      /* District labels */
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#333";
      ctx.fillText("DOWNTOWN", W * 0.44, H * 0.38);
      ctx.fillText("GALLERIA", W * 0.22, H * 0.48);
      ctx.fillText("NASA / JSC", W * 0.62, H * 0.72);
      ctx.fillText("MONTROSE", W * 0.28, H * 0.34);
      ctx.fillText("MED CTR", W * 0.38, H * 0.58);

      /* Draw ALL routes faintly */
      for (const track of tracks) {
        const theme = getTheme(track.id);
        const isSel = track.id === selectedId;
        ctx.strokeStyle = isSel ? theme.routeColor : `${theme.routeColor}44`;
        ctx.lineWidth = isSel ? 4 : 2;
        ctx.setLineDash(isSel ? [] : [4, 4]);
        ctx.beginPath();
        theme.route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.setLineDash([]);

        /* Track label */
        const last = theme.route[theme.route.length - 1];
        ctx.font = isSel ? "bold 10px monospace" : "9px monospace";
        ctx.fillStyle = isSel ? theme.routeColor : "#555";
        ctx.fillText(track.name, last.x + 8, last.y + 4);
      }

      /* Animated car dot on selected route */
      if (selectedId) {
        const theme = getTheme(selectedId);
        const route = theme.route;
        const progress = (Math.sin(t * 0.02) + 1) / 2;
        const idx = Math.min(Math.floor(progress * (route.length - 1)), route.length - 2);
        const frac = (progress * (route.length - 1)) - idx;
        const px = route[idx].x + (route[idx + 1].x - route[idx].x) * frac;
        const py = route[idx].y + (route[idx + 1].y - route[idx].y) * frac;

        /* Glow */
        ctx.shadowColor = theme.routeColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = theme.routeColor;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        /* Tiny trail */
        for (let i = 1; i <= 3; i++) {
          const tp = Math.max(0, progress - i * 0.06);
          const ti = Math.min(Math.floor(tp * (route.length - 1)), route.length - 2);
          const tf = (tp * (route.length - 1)) - ti;
          const tx = route[ti].x + (route[ti + 1].x - route[ti].x) * tf;
          const ty = route[ti].y + (route[ti + 1].y - route[ti].y) * tf;
          ctx.globalAlpha = 0.5 - i * 0.14;
          ctx.fillStyle = theme.routeColor;
          ctx.beginPath();
          ctx.arc(tx, ty, 3 - i * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* Border */
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, W, H);
    };

    const loop = () => {
      t++;
      drawMap();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [tracks, selectedId]);

  return <canvas ref={ref} width={300} height={320} className="w-full rounded-lg border border-gray-700" />;
}

export default function GrudgeDrive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRacingRef = useRef(false);
  const raceIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRacing, setIsRacing] = useState(false);

  useEffect(() => {
    document.title = "Overdrive - Speed. Skill. Survival.";
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      const tracksData = await overdriveApi.getTracks();
      const leaderboardData = await overdriveApi.getLeaderboard();
      const finalTracks = tracksData.length > 0 ? tracksData : FALLBACK_TRACKS;
      setTracks(finalTracks);
      setLeaderboard(leaderboardData);
      if (finalTracks.length > 0) {
        setSelectedTrack(finalTracks[0]);
      }
    } catch (err) {
      console.error('Error loading Overdrive data:', err);
      // Use fallback tracks so the game is still playable offline
      setTracks(FALLBACK_TRACKS);
      setSelectedTrack(FALLBACK_TRACKS[0]);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup event listeners and animation loop when race ends or component unmounts
  useEffect(() => {
    return () => {
      isRacingRef.current = false;
      cleanupRef.current?.();
    };
  }, []);

  const stopRace = useCallback(() => {
    isRacingRef.current = false;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsRacing(false);
  }, []);

  const startRace = async (track: Track) => {
    try {
      setError(null);
      const race = await overdriveApi.startRace(track.id);
      raceIdRef.current = race?.id ?? null;
    } catch (err) {
      console.error('Race API unavailable, starting offline:', err);
      raceIdRef.current = null;
    }
    // Always start the local race engine regardless of API result
    isRacingRef.current = true;
    setIsRacing(true);
    initRaceCanvas();
  };

  const initRaceCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = getTheme(selectedTrack?.id ?? "");

    let carX = canvas.width / 2 - 20;
    const carY = canvas.height - 150;
    let carSpeed = 0;
    const maxSpeed = 15;
    const acceleration = 0.3;
    let rpm = 0;
    let gear = 1;
    let raceProgress = 0;
    let opponentProgress = 0;
    const opponentSpeed = 8 + Math.random() * 4;
    const raceDistance = selectedTrack?.length ?? 400;
    let countdown = 3;
    let countdownTimer = 0;
    let raceStarted = false;
    let raceFinished = false;
    let raceEndHandled = false;
    let elapsedMs = 0;
    let lastFrameTime = performance.now();
    const keys: { [key: string]: boolean } = {};

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true;
      if (e.key === 'Shift' && gear < 5) gear++;
      if (e.key === 'Control' && gear > 1) gear--;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    cleanupRef.current = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };

    /* ── Environment drawing helpers ──────────────────────────── */
    const drawEnvObject = (obj: TrackTheme["envObjects"][number], scrollY: number) => {
      const y = ((obj.yOff * 3 + scrollY) % (canvas.height + 80)) - 40;
      if (y < -60 || y > canvas.height + 60) return;
      const x = obj.x;
      switch (obj.type) {
        case "tower": {
          ctx.fillStyle = "#1a2a44";
          ctx.fillRect(x, y, 22, 65);
          ctx.fillStyle = "#223050";
          ctx.fillRect(x + 3, y + 5, 16, 8);
          ctx.fillRect(x + 3, y + 18, 16, 8);
          ctx.fillRect(x + 3, y + 31, 16, 8);
          ctx.fillRect(x + 3, y + 44, 16, 8);
          /* Lit windows */
          for (let wy = 0; wy < 4; wy++) {
            if (Math.random() > 0.4) {
              ctx.fillStyle = "rgba(255,220,100,0.35)";
              ctx.fillRect(x + 5 + (wy % 2) * 8, y + 6 + wy * 13, 5, 5);
            }
          }
          break;
        }
        case "lamp": {
          ctx.fillStyle = "#444";
          ctx.fillRect(x + 2, y, 3, 30);
          ctx.fillStyle = "#ffcc44";
          ctx.shadowColor = "#ffcc44";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(x + 3, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case "sign": {
          ctx.fillStyle = "#333";
          ctx.fillRect(x + 2, y + 10, 3, 20);
          ctx.fillStyle = "#1a5a1a";
          ctx.fillRect(x - 8, y, 24, 12);
          ctx.fillStyle = "#fff";
          ctx.font = "7px monospace";
          ctx.fillText("EXIT", x - 5, y + 9);
          break;
        }
        case "tree": {
          ctx.fillStyle = "#3a2a1a";
          ctx.fillRect(x + 4, y + 14, 6, 16);
          ctx.fillStyle = "#1a4a1a";
          ctx.beginPath();
          ctx.arc(x + 7, y + 10, 11, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "water": {
          ctx.fillStyle = "rgba(30,80,90,0.5)";
          ctx.fillRect(x, y, 100, 18);
          ctx.strokeStyle = "rgba(60,140,160,0.3)";
          ctx.lineWidth = 1;
          for (let w = 0; w < 5; w++) {
            ctx.beginPath();
            ctx.moveTo(x + w * 20, y + 9);
            ctx.quadraticCurveTo(x + w * 20 + 10, y + 4, x + w * 20 + 20, y + 9);
            ctx.stroke();
          }
          break;
        }
        case "dome": {
          ctx.fillStyle = "#1a2840";
          ctx.beginPath();
          ctx.arc(x + 15, y + 20, 18, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x - 3, y + 20, 36, 12);
          ctx.fillStyle = "rgba(0,180,255,0.15)";
          ctx.beginPath();
          ctx.arc(x + 15, y + 20, 18, Math.PI, 0);
          ctx.fill();
          break;
        }
      }
    };

    /* ── Track-themed background ───────────────────────────── */
    const drawHoustonMap = (offset: number) => {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* Ambient sky glow */
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, theme.skyGlow);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* Street grid */
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1;
      for (let i = 0; i < theme.gridDensity; i++) {
        const gy = ((i * (canvas.height / theme.gridDensity)) + offset * 0.3) % canvas.height;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const gx = i * (canvas.width / 4);
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }

      /* Scrolling buildings on left side */
      const bIdx = Math.floor(-offset / 90) % 50;
      for (let b = 0; b < 8; b++) {
        const by = ((b * 90 + offset) % (canvas.height + 100)) - 50;
        if (by < -80 || by > canvas.height + 20) continue;
        const seed = (bIdx + b) * 17;
        const bw = 40 + (seed % 35);
        const bh = 30 + (seed % 40);
        const color = theme.buildingColors[(seed) % theme.buildingColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(10, by, bw, bh);
        /* Windows */
        ctx.fillStyle = "rgba(255,220,100,0.12)";
        for (let wy = 0; wy < 3; wy++) {
          for (let wx = 0; wx < 3; wx++) {
            if (((seed + wy + wx) % 3) === 0) {
              ctx.fillRect(14 + wx * 10, by + 5 + wy * 10, 6, 6);
            }
          }
        }
      }

      /* Right-side buildings */
      for (let b = 0; b < 8; b++) {
        const by = ((b * 95 + offset + 40) % (canvas.height + 100)) - 50;
        if (by < -80 || by > canvas.height + 20) continue;
        const seed = (bIdx + b + 20) * 13;
        const bw = 35 + (seed % 30);
        const bh = 25 + (seed % 35);
        const color = theme.buildingColors[(seed + 2) % theme.buildingColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(canvas.width - 10 - bw, by, bw, bh);
        ctx.fillStyle = "rgba(255,220,100,0.1)";
        for (let wy = 0; wy < 2; wy++) {
          for (let wx = 0; wx < 2; wx++) {
            if (((seed + wy + wx) % 3) !== 0) {
              ctx.fillRect(canvas.width - 8 - bw + wx * 12, by + 5 + wy * 10, 6, 6);
            }
          }
        }
      }

      /* Environment objects (trees, lamps, water, domes, etc.) */
      for (const obj of theme.envObjects) {
        drawEnvObject(obj, offset);
      }

      /* Landmarks */
      ctx.font = '11px monospace';
      for (const lm of theme.landmarks) {
        const ly = ((lm.y * 1.2 + offset) % (canvas.height + 100)) - 50;
        if (ly < -60 || ly > canvas.height + 20) continue;
        ctx.fillStyle = lm.color;
        ctx.fillRect(15, ly, lm.w, lm.h);
        ctx.fillStyle = '#888';
        ctx.fillText(lm.name, 20, ly + lm.h / 2 + 4);
      }

      /* ── Main drag strip ───────────────────────────── */
      const stripX = canvas.width / 2 - 120;
      ctx.fillStyle = theme.road;
      ctx.fillRect(stripX, 0, 240, canvas.height);

      /* Road edge lines */
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(stripX, 0); ctx.lineTo(stripX, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(stripX + 240, 0); ctx.lineTo(stripX + 240, canvas.height); ctx.stroke();

      /* Starting line */
      if (offset < 50) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(stripX, canvas.height - 120, 240, 8);
      }

      /* Lane divider */
      ctx.strokeStyle = theme.divider;
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      /* Finish line */
      const finishY = canvas.height - 150 - (raceDistance * 1.5);
      if (finishY + offset > 0 && finishY + offset < canvas.height) {
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
          ctx.fillRect(stripX + i * 20, finishY + offset, 20, 15);
        }
      }
    };

    /* ── Car with exhaust & speed lines ─────────────────── */
    const drawCar = (x: number, y: number, color: string, speed: number, isPlayer: boolean) => {
      /* Speed streaks behind car at high speed */
      if (speed > 4 && isPlayer) {
        const streakAlpha = Math.min(0.5, (speed - 4) / 20);
        ctx.strokeStyle = `rgba(255,255,255,${streakAlpha})`;
        ctx.lineWidth = 1;
        for (let s = 0; s < 4; s++) {
          const sx = x + 4 + Math.random() * 32;
          const sLen = 12 + speed * 3;
          ctx.beginPath();
          ctx.moveTo(sx, y + 70);
          ctx.lineTo(sx + (Math.random() - 0.5) * 3, y + 70 + sLen);
          ctx.stroke();
        }
      }

      /* Car body */
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 40, 70);
      /* Roof highlight */
      ctx.fillStyle = `rgba(255,255,255,0.08)`;
      ctx.fillRect(x + 4, y + 4, 32, 30);

      /* Windshield */
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(x + 5, y + 10, 30, 20);

      /* Wheels */
      ctx.fillStyle = '#111';
      ctx.fillRect(x - 5, y + 10, 8, 15);
      ctx.fillRect(x + 37, y + 10, 8, 15);
      ctx.fillRect(x - 5, y + 45, 8, 15);
      ctx.fillRect(x + 37, y + 45, 8, 15);
      /* Wheel shine */
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 4, y + 12, 6, 4);
      ctx.fillRect(x + 38, y + 12, 6, 4);

      /* Headlights */
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x + 5, y + 65, 10, 4);
      ctx.fillRect(x + 25, y + 65, 10, 4);

      /* Taillights glow at speed */
      if (speed > 2) {
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 8 + speed;
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(x + 3, y, 8, 4);
        ctx.fillRect(x + 29, y, 8, 4);
        ctx.shadowBlur = 0;
      }

      /* Exhaust particles at speed */
      if (speed > 3 && isPlayer) {
        for (let p = 0; p < 3; p++) {
          const px = x + 15 + (Math.random() - 0.5) * 10;
          const py = y - 2 - Math.random() * (speed * 2);
          const pr = 1.5 + Math.random() * 2;
          ctx.fillStyle = `rgba(180,180,180,${0.15 + Math.random() * 0.2})`;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawHUD = () => {
      /* Speed panel */
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(10, 10, 200, 130);
      ctx.strokeStyle = theme.stripe;
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 200, 130);

      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`${Math.floor(carSpeed * 10)} MPH`, 20, 42);

      ctx.font = '14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`RPM: ${Math.floor(rpm)}`, 20, 62);
      ctx.fillText(`GEAR: ${gear}`, 120, 62);

      /* RPM bar */
      ctx.fillStyle = '#222';
      ctx.fillRect(20, 72, 170, 18);
      const rpmPercent = Math.min(rpm / 8000, 1);
      const rpmGrad = ctx.createLinearGradient(20, 0, 190, 0);
      rpmGrad.addColorStop(0, '#00ff00');
      rpmGrad.addColorStop(0.7, '#ffcc00');
      rpmGrad.addColorStop(1, '#ff0000');
      ctx.fillStyle = rpmGrad;
      ctx.fillRect(20, 72, 170 * rpmPercent, 18);

      /* Track name */
      ctx.fillStyle = theme.stripe;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(selectedTrack?.name ?? 'Race', 20, 108);
      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.fillText(selectedTrack?.terrain?.toUpperCase() ?? '', 20, 125);

      /* Distance + time panel */
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(canvas.width - 210, 10, 200, 110);
      ctx.strokeStyle = theme.stripe;
      ctx.lineWidth = 1;
      ctx.strokeRect(canvas.width - 210, 10, 200, 110);

      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(`YOU: ${Math.floor(raceProgress)}m`, canvas.width - 200, 35);
      ctx.fillText(`OPP: ${Math.floor(opponentProgress)}m`, canvas.width - 200, 58);
      ctx.fillStyle = '#888';
      ctx.fillText(`/ ${raceDistance}m`, canvas.width - 200, 78);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${(elapsedMs / 1000).toFixed(1)}s`, canvas.width - 200, 105);
    };

    const animate = (now: number) => {
      if (!isRacingRef.current) return;

      const dt = now - lastFrameTime;
      lastFrameTime = now;

      drawHoustonMap(-raceProgress * 1.5);

      // Countdown
      if (!raceStarted) {
        countdownTimer += dt;
        if (countdownTimer > 1000) {
          countdown--;
          countdownTimer = 0;
          if (countdown === 0) {
            raceStarted = true;
            lastFrameTime = performance.now();
          }
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = countdown > 0 ? '#ffff00' : '#00ff00';
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(countdown > 0 ? countdown.toString() : 'GO!', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
      }

      if (raceStarted && !raceFinished) {
        elapsedMs += dt;

        // Player controls
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
          carSpeed += acceleration * (gear / 5);
          rpm = Math.min(8000, carSpeed * 500 / gear);
        } else {
          carSpeed *= 0.98;
          rpm *= 0.95;
        }
        
        carSpeed = Math.min(carSpeed, maxSpeed * (gear / 5));
        
        // Lane changing
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
          carX = Math.max(canvas.width / 2 - 110, carX - 3);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
          carX = Math.min(canvas.width / 2 + 10, carX + 3);
        }

        raceProgress += carSpeed / 10;
        opponentProgress += opponentSpeed / 10;

        // Check finish
        if (raceProgress >= raceDistance || opponentProgress >= raceDistance) {
          raceFinished = true;
        }
      }

      // Draw cars
      drawCar(carX, carY, '#ff0000', carSpeed, true);
      
      // Opponent car (left lane)
      const opponentX = canvas.width / 2 - 100;
      const opponentY = canvas.height - 150 + (raceProgress - opponentProgress) * 1.5;
      if (opponentY > -80 && opponentY < canvas.height) {
        drawCar(opponentX, opponentY, '#0066ff', opponentSpeed, false);
      }

      drawHUD();

      // Race result
      if (raceFinished) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const won = raceProgress >= raceDistance && raceProgress > opponentProgress;
        ctx.fillStyle = won ? '#00ff00' : '#ff0000';
        ctx.font = 'bold 60px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(won ? 'YOU WIN!' : 'YOU LOSE!', canvas.width / 2, canvas.height / 2 - 40);
        
        const playerTime = (elapsedMs / 1000).toFixed(2);
        const opponentTime = (raceDistance / (opponentSpeed / 10) / 60).toFixed(2);

        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText(`Your time: ${playerTime}s`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(`Opponent: ${opponentTime}s`, canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = 'left';
        
        // Fire once: submit race result and schedule end
        if (!raceEndHandled) {
          raceEndHandled = true;

          // Submit completion to API
          if (raceIdRef.current) {
            overdriveApi.completeRace(raceIdRef.current, elapsedMs, elapsedMs).catch(console.error);
          }

          setTimeout(() => {
            stopRace();
            loadGameData();
          }, 4000);
        }
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col" data-testid="page-grudge-drive">
      <header className="bg-black/80 border-b border-red-900/30 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-red-500" />
            <h1 className="text-xl font-bold text-white">
              OVER<span className="text-red-500">DRIVE</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Gamepad2 className="h-4 w-4" />
          <span>Racing Game</span>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {isRacing && (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">Racing!</h3>
                  <Button
                    onClick={stopRace}
                    variant="outline"
                    size="sm"
                  >
                    End Race
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full rounded-lg border border-red-500/30"
                />
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2"><strong className="text-white">Controls:</strong></p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>↑/W - Accelerate</div>
                    <div>←/→ or A/D - Change lanes</div>
                    <div>Shift - Shift up</div>
                    <div>Ctrl - Shift down</div>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2">🏁 Drag race through Houston streets! Perfect your shifts!</p>
                </div>
              </CardContent>
            </Card>
          )}
          {error && (
            <Card className="border-red-500/50 bg-red-950/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardContent className="p-8 text-center">
                <p className="text-gray-300">Loading tracks...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* Tracks List */}
              <div className="col-span-2 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Race Tracks</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {tracks.map((track) => (
                      <Card
                        key={track.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTrack?.id === track.id
                            ? 'bg-red-900/30 border-red-500'
                            : 'bg-gray-900/30 border-gray-700 hover:bg-gray-800/40'
                        }`}
                        onClick={() => setSelectedTrack(track)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-white">{track.name}</h3>
                              <p className="text-sm text-gray-400">{track.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {track.length}m
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Difficulty {track.difficulty}/5
                                </Badge>
                              </div>
                            </div>
                            {track.bestTime && (
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Best Time</p>
                                <p className="text-lg font-bold text-red-400">
                                  {(track.bestTime / 1000).toFixed(2)}s
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="col-span-1 space-y-4">
                {/* Houston route map */}
                <Card className="bg-gray-900/50 border-red-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Car className="h-4 w-4 text-red-400" />
                      Houston Race Map
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <HoustonMapPreview tracks={tracks} selectedId={selectedTrack?.id ?? null} />
                  </CardContent>
                </Card>

                {selectedTrack && (
                  <Card className="bg-gray-900/50 border-red-900/30">
                    <CardHeader>
                      <CardTitle className="text-red-400">{selectedTrack.name}</CardTitle>
                      <CardDescription>{selectedTrack.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Distance</span>
                          <span className="font-bold text-white">{selectedTrack.length}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Difficulty</span>
                          <span className="font-bold text-white">{selectedTrack.difficulty}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Terrain</span>
                          <span className="font-bold text-white capitalize">{selectedTrack.terrain}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => startRace(selectedTrack)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-start-race"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Start Race
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Global Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <div key={entry.playerId} className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-bold text-red-400 w-6">{entry.rank}</span>
                        <div>
                          <p className="text-white font-medium">{entry.playerName}</p>
                          <p className="text-xs text-gray-400">{entry.trackName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{(entry.bestTime / 1000).toFixed(2)}s</p>
                        <p className="text-xs text-gray-400">{entry.completions} runs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
