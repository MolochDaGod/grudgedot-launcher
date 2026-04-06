import { Server as SocketIOServer, Socket } from 'socket.io';
import { nanoid } from 'nanoid';

export interface Player {
  id: string;
  sessionId: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: Date;
}

export type GameType = 'crown-clash' | 'rts-battle' | 'grudge-arena' | 'grudge-gangs' | 'gruda-wars' | 'decay' | 'mmo-world' | 'custom';

export interface GameRoom {
  id: string;
  name: string;
  gameType: GameType;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'starting' | 'in-progress' | 'finished';
  settings: Record<string, any>;
  createdAt: Date;
}

export interface LobbyMessage {
  id: string;
  playerId: string;
  username: string;
  content: string;
  timestamp: Date;
}

class LobbyManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();
  private lobbyMessages: LobbyMessage[] = [];
  private io: SocketIOServer | null = null;

  initialize(io: SocketIOServer) {
    this.io = io;
    
    io.on('connection', (socket: Socket) => {
      console.log(`[Lobby] Player connected: ${socket.id}`);
      
      socket.emit('lobby:rooms', this.getPublicRooms());
      socket.emit('lobby:messages', this.lobbyMessages.slice(-50));

      socket.on('lobby:chat', (data: { username: string; content: string }) => {
        const message: LobbyMessage = {
          id: nanoid(),
          playerId: socket.id,
          username: data.username,
          content: data.content,
          timestamp: new Date(),
        };
        this.lobbyMessages.push(message);
        if (this.lobbyMessages.length > 100) {
          this.lobbyMessages = this.lobbyMessages.slice(-100);
        }
        io.emit('lobby:message', message);
      });

      socket.on('room:create', (data: {
        name: string;
        gameType: GameType;
        maxPlayers: number;
        isPrivate: boolean;
        password?: string;
        username: string;
        settings?: Record<string, any>;
      }) => {
        const room = this.createRoom(socket.id, data);
        if (room) {
          socket.join(room.id);
          socket.emit('room:created', room);
          io.emit('lobby:rooms', this.getPublicRooms());
        }
      });

      socket.on('room:join', (data: { roomId: string; username: string; password?: string }) => {
        const result = this.joinRoom(socket.id, data.roomId, data.username, data.password);
        if (result.success && result.room) {
          socket.join(data.roomId);
          socket.emit('room:joined', result.room);
          io.to(data.roomId).emit('room:player-joined', {
            room: result.room,
            player: result.room.players.get(socket.id),
          });
          io.emit('lobby:rooms', this.getPublicRooms());
        } else {
          socket.emit('room:error', { message: result.error });
        }
      });

      socket.on('room:leave', () => {
        this.handlePlayerLeave(socket);
      });

      socket.on('room:ready', (isReady: boolean) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room) {
            const player = room.players.get(socket.id);
            if (player) {
              player.isReady = isReady;
              io.to(roomId).emit('room:updated', this.serializeRoom(room));
            }
          }
        }
      });

      socket.on('room:start', () => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room && room.hostId === socket.id) {
            const allReady = Array.from(room.players.values()).every(p => p.isReady || p.isHost);
            if (allReady && room.players.size >= 2) {
              room.status = 'starting';
              io.to(roomId).emit('room:starting', this.serializeRoom(room));
              
              setTimeout(() => {
                room.status = 'in-progress';
                io.to(roomId).emit('game:start', {
                  roomId: room.id,
                  gameType: room.gameType,
                  players: Array.from(room.players.values()),
                  settings: room.settings,
                });
              }, 3000);
            } else {
              socket.emit('room:error', { message: 'Not all players are ready or not enough players' });
            }
          }
        }
      });

      socket.on('room:kick', (playerId: string) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room && room.hostId === socket.id && playerId !== socket.id) {
            const kickedSocket = io.sockets.sockets.get(playerId);
            if (kickedSocket) {
              kickedSocket.emit('room:kicked');
              kickedSocket.leave(roomId);
            }
            room.players.delete(playerId);
            this.playerRooms.delete(playerId);
            io.to(roomId).emit('room:updated', this.serializeRoom(room));
            io.emit('lobby:rooms', this.getPublicRooms());
          }
        }
      });

      socket.on('room:settings', (settings: Record<string, any>) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room && room.hostId === socket.id) {
            room.settings = { ...room.settings, ...settings };
            io.to(roomId).emit('room:updated', this.serializeRoom(room));
          }
        }
      });

      socket.on('game:action', (action: { type: string; data: any }) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          socket.to(roomId).emit('game:action', {
            playerId: socket.id,
            ...action,
          });
        }
      });

      socket.on('game:state', (state: any) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room && room.hostId === socket.id) {
            socket.to(roomId).emit('game:state', state);
          }
        }
      });

      socket.on('game:end', (result: any) => {
        const roomId = this.playerRooms.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room && room.hostId === socket.id) {
            room.status = 'finished';
            io.to(roomId).emit('game:ended', result);
            io.emit('lobby:rooms', this.getPublicRooms());
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Lobby] Player disconnected: ${socket.id}`);
        this.handlePlayerLeave(socket);
      });
    });
  }

  private createRoom(hostId: string, data: {
    name: string;
    gameType: GameType;
    maxPlayers: number;
    isPrivate: boolean;
    password?: string;
    username: string;
    settings?: Record<string, any>;
  }): GameRoom | null {
    const existingRoom = this.playerRooms.get(hostId);
    if (existingRoom) {
      return null;
    }

    const roomId = nanoid(8);
    const room: GameRoom = {
      id: roomId,
      name: data.name || `${data.username}'s Game`,
      gameType: data.gameType,
      hostId,
      players: new Map(),
      maxPlayers: Math.min(data.maxPlayers || 4, 8),
      isPrivate: data.isPrivate,
      password: data.password,
      status: 'waiting',
      settings: data.settings || {},
      createdAt: new Date(),
    };

    const hostPlayer: Player = {
      id: nanoid(),
      sessionId: hostId,
      username: data.username,
      isReady: false,
      isHost: true,
      joinedAt: new Date(),
    };

    room.players.set(hostId, hostPlayer);
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);

    return room;
  }

  private joinRoom(playerId: string, roomId: string, username: string, password?: string): { 
    success: boolean; 
    room?: GameRoom; 
    error?: string 
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.isPrivate && room.password && room.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    const existingRoom = this.playerRooms.get(playerId);
    if (existingRoom) {
      return { success: false, error: 'Already in a room' };
    }

    const player: Player = {
      id: nanoid(),
      sessionId: playerId,
      username,
      isReady: false,
      isHost: false,
      joinedAt: new Date(),
    };

    room.players.set(playerId, player);
    this.playerRooms.set(playerId, roomId);

    return { success: true, room };
  }

  private handlePlayerLeave(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socket.id);
      return;
    }

    room.players.delete(socket.id);
    this.playerRooms.delete(socket.id);
    socket.leave(roomId);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    } else if (room.hostId === socket.id) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        room.hostId = newHost.sessionId;
        newHost.isHost = true;
      }
    }

    if (room.players.size > 0) {
      this.io?.to(roomId).emit('room:updated', this.serializeRoom(room));
      this.io?.to(roomId).emit('room:player-left', { playerId: socket.id });
    }

    this.io?.emit('lobby:rooms', this.getPublicRooms());
  }

  private serializeRoom(room: GameRoom): any {
    return {
      id: room.id,
      name: room.name,
      gameType: room.gameType,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
      settings: room.settings,
      createdAt: room.createdAt,
    };
  }

  private getPublicRooms(): any[] {
    return Array.from(this.rooms.values())
      .filter(room => !room.isPrivate && room.status === 'waiting')
      .map(room => this.serializeRoom(room));
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPlayerCount(): number {
    let count = 0;
    this.rooms.forEach(room => {
      count += room.players.size;
    });
    return count;
  }
}

export const lobbyManager = new LobbyManager();
