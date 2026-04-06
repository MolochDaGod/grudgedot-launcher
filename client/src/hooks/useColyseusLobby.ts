/**
 * useColyseusLobby — React hook that connects the GGE lobby page to a
 * Colyseus game server instead of the old Socket.IO lobby.
 *
 * This hook exposes the same logical interface (rooms, chat, create/join/leave)
 * that lobby.tsx was already using, but talks over Colyseus WebSocket.
 *
 * Prerequisites:
 *   npm install colyseus.js
 *   (colyseus.js is the browser client — it's tiny and has no server deps)
 *
 * If colyseus.js is not installed yet, this file will cause a build error
 * that you can resolve by running:
 *   npm install colyseus.js@0.16
 */

import { useState, useEffect, useCallback, useRef } from "react";
// @ts-ignore — colyseus.js is optional, only installed when VITE_USE_COLYSEUS=true
import { Client, Room } from "colyseus.js";

// Default to WCS Colyseus server; override via env
const COLYSEUS_WS_URL =
  (import.meta as any).env?.VITE_COLYSEUS_WS_URL ||
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? "wss://localhost:2567"
    : "ws://localhost:2567");

// --- Types (matches lobby.tsx expectations) ---

export interface Player {
  id: string;
  sessionId: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: string;
}

export interface GameRoom {
  id: string;
  name: string;
  gameType: "crown-clash" | "rts-battle" | "gruda-wars" | "custom";
  hostId: string;
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  status: "waiting" | "starting" | "in-progress" | "finished";
  settings: Record<string, any>;
  createdAt: string;
}

export interface LobbyMessage {
  id: string;
  playerId: string;
  username: string;
  content: string;
  timestamp: string;
}

interface UseColyseusLobbyReturn {
  connected: boolean;
  rooms: GameRoom[];
  currentRoom: GameRoom | null;
  lobbyMessages: LobbyMessage[];
  sessionId: string | null;

  createRoom: (data: {
    name: string;
    gameType: string;
    maxPlayers: number;
    isPrivate: boolean;
    password?: string;
    username: string;
  }) => Promise<void>;

  joinRoom: (roomId: string, username: string, password?: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  startGame: () => void;
  kickPlayer: (sessionId: string) => void;
  updateSettings: (settings: Record<string, any>) => void;
  sendChat: (username: string, content: string) => void;
  refreshRooms: () => Promise<void>;
}

export function useColyseusLobby(): UseColyseusLobbyReturn {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize Colyseus client
  useEffect(() => {
    const client = new Client(COLYSEUS_WS_URL);
    clientRef.current = client;
    setConnected(true); // Colyseus client is stateless until join; mark connected

    // Poll available rooms
    const pollRooms = async () => {
      try {
        const available = await client.getAvailableRooms("lobby");
        const mapped: GameRoom[] = available.map((r: any) => ({
          id: r.roomId,
          name: r.metadata?.roomName || "Unknown",
          gameType: r.metadata?.gameType || "custom",
          hostId: "",
          players: [],
          maxPlayers: r.metadata?.maxPlayers || 8,
          isPrivate: false,
          status: "waiting",
          settings: {},
          createdAt: new Date().toISOString(),
        }));
        setRooms(mapped);
      } catch {
        // Server may not be running yet
      }
    };

    pollRooms();
    const interval = setInterval(pollRooms, 5000);

    return () => {
      clearInterval(interval);
      roomRef.current?.leave();
    };
  }, []);

  // Helper: sync room state to our GameRoom shape
  const syncRoomState = useCallback((room: Room) => {
    const state = room.state as any;
    if (!state) return;

    const players: Player[] = [];
    state.players?.forEach((p: any, sid: string) => {
      players.push({
        id: sid,
        sessionId: sid,
        username: p.username || "Unknown",
        isReady: p.isReady || false,
        isHost: p.isHost || false,
        joinedAt: new Date(p.joinedAt || 0).toISOString(),
      });
    });

    const gr: GameRoom = {
      id: room.id,
      name: state.roomName || "Game Room",
      gameType: state.gameType || "custom",
      hostId: players.find((p) => p.isHost)?.sessionId || "",
      players,
      maxPlayers: state.maxPlayers || 8,
      isPrivate: state.isPrivate || false,
      status: state.phase || "waiting",
      settings: {},
      createdAt: new Date().toISOString(),
    };

    setCurrentRoom(gr);
  }, []);

  // Wire room event listeners
  const attachRoomListeners = useCallback(
    (room: Room) => {
      setSessionId(room.sessionId);

      room.onStateChange(() => {
        syncRoomState(room);
      });

      room.onMessage("game:start", (data: any) => {
        // Redirect to game page based on type
        if (data.gameType === "crown-clash") {
          window.location.href = "/crown-clash";
        } else if (data.gameType === "rts-battle") {
          window.location.href = "/rts-builder";
        } else if (data.gameType === "gruda-wars") {
          window.location.href = "/gruda-wars";
        }
      });

      room.onLeave(() => {
        roomRef.current = null;
        setCurrentRoom(null);
        setSessionId(null);
      });
    },
    [syncRoomState]
  );

  // --- Actions ---

  const createRoom = useCallback(
    async (data: {
      name: string;
      gameType: string;
      maxPlayers: number;
      isPrivate: boolean;
      password?: string;
      username: string;
    }) => {
      if (!clientRef.current) return;

      const room = await clientRef.current.create("lobby", {
        roomName: data.name,
        gameType: data.gameType,
        maxPlayers: data.maxPlayers,
        isPrivate: data.isPrivate,
        password: data.password,
        username: data.username,
      });

      roomRef.current = room;
      attachRoomListeners(room);
    },
    [attachRoomListeners]
  );

  const joinRoom = useCallback(
    async (roomId: string, username: string, password?: string) => {
      if (!clientRef.current) return;

      const room = await clientRef.current.joinById(roomId, {
        username,
        password,
      });

      roomRef.current = room;
      attachRoomListeners(room);
    },
    [attachRoomListeners]
  );

  const leaveRoom = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    setCurrentRoom(null);
  }, []);

  const setReady = useCallback((isReady: boolean) => {
    roomRef.current?.send("ready", isReady);
  }, []);

  const startGame = useCallback(() => {
    roomRef.current?.send("start");
  }, []);

  const kickPlayer = useCallback((targetSessionId: string) => {
    roomRef.current?.send("kick", targetSessionId);
  }, []);

  const updateSettings = useCallback((settings: Record<string, any>) => {
    roomRef.current?.send("settings", settings);
  }, []);

  const sendChat = useCallback((username: string, content: string) => {
    roomRef.current?.send("chat", { content });
    // Optimistic local add
    setLobbyMessages((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}`,
        playerId: sessionId || "",
        username,
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [sessionId]);

  const refreshRooms = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      const available = await clientRef.current.getAvailableRooms("lobby");
      const mapped: GameRoom[] = available.map((r: any) => ({
        id: r.roomId,
        name: r.metadata?.roomName || "Unknown",
        gameType: r.metadata?.gameType || "custom",
        hostId: "",
        players: [],
        maxPlayers: r.metadata?.maxPlayers || 8,
        isPrivate: false,
        status: "waiting",
        settings: {},
        createdAt: new Date().toISOString(),
      }));
      setRooms(mapped);
    } catch {}
  }, []);

  return {
    connected,
    rooms,
    currentRoom,
    lobbyMessages,
    sessionId,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    kickPlayer,
    updateSettings,
    sendChat,
    refreshRooms,
  };
}
