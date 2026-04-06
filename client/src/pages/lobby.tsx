import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { grudgeGameApi, type GrudgeCharacter } from '@/lib/grudgeBackendApi';
// Colyseus lobby hook — enable by setting VITE_USE_COLYSEUS=true
// import { useColyseusLobby } from '@/hooks/useColyseusLobby';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Crown, 
  Gamepad2, 
  MessageSquare, 
  Plus, 
  Play, 
  Lock, 
  Send,
  UserPlus,
  LogIn,
  Check,
  X,
  Swords,
  Castle,
  ArrowLeft,
  RefreshCw,
  Server,
  Container,
  Square,
  RotateCw,
  Rocket,
  AlertTriangle,
  ExternalLink,
  Crosshair,
  Skull,
  Globe
} from 'lucide-react';

interface Player {
  id: string;
  sessionId: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: string;
}

interface GameRoom {
  id: string;
  name: string;
  gameType: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'in-progress' | 'finished';
  settings: Record<string, any>;
  createdAt: string;
}

interface LobbyMessage {
  id: string;
  playerId: string;
  username: string;
  content: string;
  timestamp: string;
}

const GAME_TYPE_INFO = {
  'crown-clash': { 
    name: 'Crown Clash', 
    icon: Crown, 
    description: 'Card battle arena game',
    color: 'text-yellow-500'
  },
  'rts-battle': { 
    name: 'RTS Battle', 
    icon: Castle, 
    description: 'Real-time strategy warfare',
    color: 'text-blue-500'
  },
  'grudge-arena': {
    name: 'Grudge Arena',
    icon: Crosshair,
    description: '3D PvP combat arena',
    color: 'text-red-500'
  },
  'grudge-gangs': {
    name: 'Grudge Gangs',
    icon: Users,
    description: 'Team-based MOBA brawler',
    color: 'text-purple-500'
  },
  'gruda-wars': {
    name: 'Gruda Wars',
    icon: Swords,
    description: 'RPG dungeon crawler with PvP',
    color: 'text-orange-500'
  },
  'decay': {
    name: 'Decay',
    icon: Skull,
    description: 'Survival FPS — fight the horde',
    color: 'text-green-500'
  },
  'mmo-world': {
    name: 'MMO World',
    icon: Globe,
    description: 'Massively multiplayer RPG',
    color: 'text-cyan-500'
  },
  'custom': { 
    name: 'Custom Game', 
    icon: Gamepad2, 
    description: 'Custom game mode',
    color: 'text-amber-500'
  },
};

// PVP games that can have dedicated servers spun up
const PVP_GAMES = [
  { key: 'grudge-arena', name: 'Grudge Arena', route: '/arena', description: '3D PvP combat arena' },
  { key: 'grudge-gangs', name: 'Grudge Gangs', route: '/moba', description: 'Team-based MOBA brawler' },
  { key: 'gruda-wars', name: 'Gruda Wars', route: '/gruda-wars', description: 'RPG dungeon crawler with PvP arenas' },
  { key: 'decay', name: 'Decay', route: '/decay', description: 'Survival FPS — fight the horde' },
  { key: 'crown-clash', name: 'Crown Clash', route: '/crown-clash', description: 'Card battle PvP arena' },
  { key: 'rts-battle', name: 'RTS Battle', route: '/rts-builder', description: 'Real-time strategy warfare' },
  { key: 'mmo-world', name: 'MMO World', route: '/mmo', description: 'Massively multiplayer RPG world' },
];

interface CoolifyApp {
  uuid: string;
  name: string;
  description?: string;
  fqdn?: string;
  status?: string;
  git_repository?: string;
  git_branch?: string;
  created_at?: string;
  updated_at?: string;
}

interface CoolifyServer {
  uuid: string;
  name: string;
  description?: string;
  ip?: string;
  is_reachable?: boolean;
  created_at?: string;
}

function AppStatusBadge({ status }: { status?: string }) {
  const s = (status || 'unknown').toLowerCase();
  if (s === 'running') return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Running</Badge>;
  if (s === 'stopped' || s === 'exited') return <Badge variant="destructive">Stopped</Badge>;
  if (s.includes('deploy') || s.includes('build')) return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Deploying</Badge>;
  if (s.includes('restart')) return <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Restarting</Badge>;
  return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
}

export default function LobbyPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newRoom, setNewRoom] = useState({
    name: '',
    gameType: 'crown-clash' as keyof typeof GAME_TYPE_INFO,
    maxPlayers: 4,
    isPrivate: false,
    password: '',
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/lobby/stats'],
    refetchInterval: 10000,
  });

  // ── Coolify VPS Queries ──
  const coolifyStatusQuery = useQuery({
    queryKey: ['coolify', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/coolify/status');
      return res.json() as Promise<{ configured: boolean; url: string | null }>;
    },
  });

  const coolifyServersQuery = useQuery({
    queryKey: ['coolify', 'servers'],
    queryFn: async () => {
      const res = await fetch('/api/coolify/servers');
      if (!res.ok) return [];
      return res.json() as Promise<CoolifyServer[]>;
    },
    enabled: coolifyStatusQuery.data?.configured === true,
    refetchInterval: 60000,
  });

  const coolifyAppsQuery = useQuery({
    queryKey: ['coolify', 'applications'],
    queryFn: async () => {
      const res = await fetch('/api/coolify/applications');
      if (!res.ok) return [];
      return res.json() as Promise<CoolifyApp[]>;
    },
    enabled: coolifyStatusQuery.data?.configured === true,
    refetchInterval: 30000,
  });

  const restartAppMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const res = await fetch(`/api/coolify/applications/${uuid}/restart`, { method: 'POST' });
      if (!res.ok) throw new Error('Restart failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Restart Triggered', description: 'Application is restarting...' });
      qc.invalidateQueries({ queryKey: ['coolify'] });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Restart Failed', description: err.message });
    },
  });

  const deployAppMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const res = await fetch(`/api/coolify/applications/${uuid}/deploy`, { method: 'POST' });
      if (!res.ok) throw new Error('Deploy failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Deploy Triggered', description: 'Rebuilding from latest source...' });
      qc.invalidateQueries({ queryKey: ['coolify'] });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Deploy Failed', description: err.message });
    },
  });

  const startAppMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const res = await fetch(`/api/coolify/applications/${uuid}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Start failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Start Triggered', description: 'Application is starting...' });
      qc.invalidateQueries({ queryKey: ['coolify'] });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Start Failed', description: err.message });
    },
  });

  const stopAppMutation = useMutation({
    mutationFn: async (uuid: string) => {
      const res = await fetch(`/api/coolify/applications/${uuid}/stop`, { method: 'POST' });
      if (!res.ok) throw new Error('Stop failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Stop Triggered', description: 'Application is stopping...' });
      qc.invalidateQueries({ queryKey: ['coolify'] });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Stop Failed', description: err.message });
    },
  });

  const coolifyConfigured = coolifyStatusQuery.data?.configured === true;
  const servers = coolifyServersQuery.data || [];
  const coolifyApps = coolifyAppsQuery.data || [];
  const anyMutating = restartAppMutation.isPending || deployAppMutation.isPending || stopAppMutation.isPending || startAppMutation.isPending;

  // Grudge backend character picker
  const { data: grudgeChars = [] } = useQuery<GrudgeCharacter[]>({
    queryKey: ['grudge', 'characters'],
    queryFn: () => grudgeGameApi.listCharacters(),
    enabled: isAuthenticated,
  });
  const [selectedChar, setSelectedChar] = useState<GrudgeCharacter | null>(null);

  // Auto-select first character
  useEffect(() => {
    if (grudgeChars.length > 0 && !selectedChar) setSelectedChar(grudgeChars[0]);
  }, [grudgeChars, selectedChar]);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    } else {
      const stored = localStorage.getItem('lobby-username');
      if (stored) {
        setUsername(stored);
      } else {
        setUsername(`Player${Math.floor(Math.random() * 10000)}`);
      }
    }
  }, [user]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to lobby server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from lobby server');
      setConnected(false);
    });

    newSocket.on('lobby:rooms', (roomList: GameRoom[]) => {
      setRooms(roomList);
    });

    newSocket.on('lobby:messages', (messages: LobbyMessage[]) => {
      setLobbyMessages(messages);
    });

    newSocket.on('lobby:message', (message: LobbyMessage) => {
      setLobbyMessages(prev => [...prev, message]);
    });

    newSocket.on('room:created', (room: GameRoom) => {
      setCurrentRoom(room);
      setShowCreateDialog(false);
      toast({ title: 'Room created!', description: `Room "${room.name}" is ready` });
    });

    newSocket.on('room:joined', (room: GameRoom) => {
      setCurrentRoom(room);
      setShowJoinDialog(false);
      setJoinPassword('');
      toast({ title: 'Joined room!', description: `Welcome to "${room.name}"` });
    });

    newSocket.on('room:updated', (room: GameRoom) => {
      setCurrentRoom(room);
    });

    newSocket.on('room:player-joined', ({ room, player }: { room: GameRoom; player: Player }) => {
      setCurrentRoom(room);
      toast({ title: 'Player joined', description: `${player.username} joined the room` });
    });

    newSocket.on('room:player-left', ({ playerId }: { playerId: string }) => {
      toast({ title: 'Player left', description: 'A player has left the room' });
    });

    newSocket.on('room:kicked', () => {
      setCurrentRoom(null);
      toast({ title: 'Kicked', description: 'You were kicked from the room', variant: 'destructive' });
    });

    newSocket.on('room:starting', (room: GameRoom) => {
      setCurrentRoom(room);
      toast({ title: 'Game starting!', description: 'Get ready...' });
    });

    newSocket.on('game:start', (data: any) => {
      toast({ title: 'Game started!', description: `Starting ${data.gameType}...` });
      const gameRoutes: Record<string, string> = {
        'crown-clash': '/crown-clash',
        'rts-battle': '/rts-builder',
        'grudge-arena': '/arena',
        'grudge-gangs': '/moba',
        'gruda-wars': '/gruda-wars',
        'decay': '/decay',
        'mmo-world': '/mmo',
      };
      const route = gameRoutes[data.gameType];
      if (route) window.location.href = route;
    });

    newSocket.on('room:error', ({ message }: { message: string }) => {
      toast({ title: 'Error', description: message, variant: 'destructive' });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyMessages]);

  useEffect(() => {
    if (username && !user?.username) {
      localStorage.setItem('lobby-username', username);
    }
  }, [username, user]);

  const handleCreateRoom = () => {
    if (!socket || !newRoom.name.trim()) return;
    
    socket.emit('room:create', {
      ...newRoom,
      username,
    });
  };

  const handleJoinRoom = (room: GameRoom) => {
    if (room.isPrivate) {
      setSelectedRoom(room);
      setShowJoinDialog(true);
    } else {
      socket?.emit('room:join', { roomId: room.id, username });
    }
  };

  const confirmJoinRoom = () => {
    if (!socket || !selectedRoom) return;
    socket.emit('room:join', { 
      roomId: selectedRoom.id, 
      username, 
      password: joinPassword 
    });
  };

  const handleLeaveRoom = () => {
    socket?.emit('room:leave');
    setCurrentRoom(null);
  };

  const handleReady = () => {
    if (!currentRoom) return;
    const me = currentRoom.players.find(p => p.sessionId === socket?.id);
    socket?.emit('room:ready', !me?.isReady);
  };

  const handleStartGame = () => {
    socket?.emit('room:start');
  };

  const handleKick = (playerId: string) => {
    socket?.emit('room:kick', playerId);
  };

  const handleSendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit('lobby:chat', { username, content: chatInput.trim() });
    setChatInput('');
  };

  const isHost = currentRoom?.hostId === socket?.id;
  const myPlayer = currentRoom?.players.find(p => p.sessionId === socket?.id);
  const allReady = currentRoom?.players.every(p => p.isReady || p.isHost) && (currentRoom?.players.length || 0) >= 2;

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <Swords className="w-16 h-16 mx-auto text-red-600 mb-4" />
          <h2 className="text-2xl font-bold">Join the Battle</h2>
          <p className="text-muted-foreground">Sign in to create or join multiplayer game lobbies</p>
        </div>
        <Button asChild data-testid="button-login">
          <a href="/auth">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </a>
        </Button>
      </div>
    );
  }

  if (currentRoom) {
    const currentInfo = GAME_TYPE_INFO[currentRoom.gameType as keyof typeof GAME_TYPE_INFO] || GAME_TYPE_INFO['custom'];
    const GameIcon = currentInfo.icon;
    
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleLeaveRoom} data-testid="button-leave-room">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
            <Badge variant={currentRoom.status === 'waiting' ? 'secondary' : 'default'}>
              {currentRoom.status}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <GameIcon className={`w-8 h-8 ${currentInfo.color}`} />
                <div>
                  <CardTitle data-testid="text-room-name">{currentRoom.name}</CardTitle>
                  <CardDescription>
                    {currentInfo.name} - {currentRoom.players.length}/{currentRoom.maxPlayers} players
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players
                </h3>
                {currentRoom.players.map((player) => (
                  <div 
                    key={player.sessionId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`player-row-${player.sessionId}`}
                  >
                    <div className="flex items-center gap-3">
                      {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                      <span className="font-medium">{player.username}</span>
                      {player.sessionId === socket?.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <Badge className="bg-green-600">
                          <Check className="w-3 h-3 mr-1" /> Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="w-3 h-3 mr-1" /> Not Ready
                        </Badge>
                      )}
                      {isHost && player.sessionId !== socket?.id && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleKick(player.sessionId)}
                          data-testid={`button-kick-${player.sessionId}`}
                        >
                          Kick
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                {!isHost && (
                  <Button 
                    variant={myPlayer?.isReady ? "secondary" : "default"}
                    onClick={handleReady}
                    data-testid="button-ready"
                  >
                    {myPlayer?.isReady ? 'Cancel Ready' : 'Ready Up'}
                  </Button>
                )}
                {isHost && (
                  <Button 
                    onClick={handleStartGame}
                    disabled={!allReady}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-start-game"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-lobby-title">
              <Swords className="w-6 h-6 text-red-600" />
              Multiplayer Lobby
            </h1>
            <p className="text-sm text-muted-foreground">
              {connected ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Connected as {username}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Connecting...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { socket?.emit('lobby:refresh'); coolifyAppsQuery.refetch(); coolifyServersQuery.refetch(); }} data-testid="button-refresh-lobbies">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-room">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Game Room</DialogTitle>
                  <DialogDescription>
                    Set up a new multiplayer game room
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="room-name">Room Name</Label>
                    <Input
                      id="room-name"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      placeholder="My Awesome Game"
                      data-testid="input-room-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="game-type">Game Type</Label>
                    <Select
                      value={newRoom.gameType}
                      onValueChange={(value: any) => setNewRoom({ ...newRoom, gameType: value })}
                    >
                      <SelectTrigger data-testid="select-game-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crown-clash">Crown Clash - Card Battle</SelectItem>
                        <SelectItem value="rts-battle">RTS Battle - Strategy</SelectItem>
                        <SelectItem value="grudge-arena">Grudge Arena - 3D PvP</SelectItem>
                        <SelectItem value="grudge-gangs">Grudge Gangs - MOBA</SelectItem>
                        <SelectItem value="gruda-wars">Gruda Wars - RPG PvP</SelectItem>
                        <SelectItem value="decay">Decay - Survival FPS</SelectItem>
                        <SelectItem value="mmo-world">MMO World - Multiplayer RPG</SelectItem>
                        <SelectItem value="custom">Custom Game</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-players">Max Players</Label>
                    <Select
                      value={String(newRoom.maxPlayers)}
                      onValueChange={(value) => setNewRoom({ ...newRoom, maxPlayers: parseInt(value) })}
                    >
                      <SelectTrigger data-testid="select-max-players">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Players</SelectItem>
                        <SelectItem value="4">4 Players</SelectItem>
                        <SelectItem value="6">6 Players</SelectItem>
                        <SelectItem value="8">8 Players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="private">Private Room</Label>
                    <Switch
                      id="private"
                      checked={newRoom.isPrivate}
                      onCheckedChange={(checked) => setNewRoom({ ...newRoom, isPrivate: checked })}
                      data-testid="switch-private"
                    />
                  </div>
                  {newRoom.isPrivate && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newRoom.password}
                        onChange={(e) => setNewRoom({ ...newRoom, password: e.target.value })}
                        placeholder="Enter room password"
                        data-testid="input-password"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRoom} disabled={!newRoom.name.trim()} data-testid="button-confirm-create">
                    Create Room
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        {/* Grudge character picker */}
        {grudgeChars.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Play as:</h3>
            <div className="flex gap-2 flex-wrap">
              {grudgeChars.map((ch) => (
                <Button
                  key={ch.id}
                  variant={selectedChar?.id === ch.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChar(ch)}
                  data-testid={`btn-select-char-${ch.id}`}
                >
                  {ch.name} (Lv {ch.level} {ch.class})
                </Button>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="rooms" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="rooms" className="gap-1"><Gamepad2 className="h-3.5 w-3.5" />Rooms</TabsTrigger>
            <TabsTrigger value="servers" className="gap-1"><Server className="h-3.5 w-3.5" />VPS Servers</TabsTrigger>
            <TabsTrigger value="pvp-games" className="gap-1"><Crosshair className="h-3.5 w-3.5" />PVP Games</TabsTrigger>
          </TabsList>

          {/* ═══ ROOMS TAB ═══ */}
          <TabsContent value="rooms">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Available Rooms ({rooms.length})
                </h2>

                {rooms.length === 0 ? (
                  <Card className="p-12 text-center">
                    <div className="text-muted-foreground space-y-2">
                      <Gamepad2 className="w-12 h-12 mx-auto opacity-50" />
                      <p>No rooms available</p>
                      <p className="text-sm">Create a room to start playing!</p>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {rooms.map((room) => {
                      const info = GAME_TYPE_INFO[room.gameType as keyof typeof GAME_TYPE_INFO] || GAME_TYPE_INFO['custom'];
                      const GameIcon = info.icon;
                      return (
                        <Card 
                          key={room.id} 
                          className="hover-elevate cursor-pointer"
                          onClick={() => handleJoinRoom(room)}
                          data-testid={`card-lobby-${room.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg bg-muted ${info.color}`}>
                                  <GameIcon className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{room.name}</h3>
                                    {room.isPrivate && <Lock className="w-4 h-4 text-muted-foreground" />}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {info.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{room.players.length}/{room.maxPlayers}</span>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {room.status}
                                  </Badge>
                                </div>
                                <Button size="sm" data-testid={`button-join-${room.id}`}>
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Join
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Card className="h-[400px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Lobby Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-2">
                        {lobbyMessages.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                        ) : (
                          lobbyMessages.map((msg) => (
                            <div key={msg.id} className="text-sm">
                              <span className="font-medium text-primary">{msg.username}:</span>{' '}
                              <span className="text-muted-foreground">{msg.content}</span>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        data-testid="input-chat"
                      />
                      <Button size="icon" onClick={handleSendChat} data-testid="button-send-chat">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Play</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {PVP_GAMES.slice(0, 4).map((game) => {
                      const info = GAME_TYPE_INFO[game.key as keyof typeof GAME_TYPE_INFO];
                      const Icon = info?.icon || Gamepad2;
                      return (
                        <Link key={game.key} href={game.route}>
                          <Button variant="outline" className="w-full justify-start">
                            <Icon className={`w-4 h-4 mr-2 ${info?.color || 'text-muted-foreground'}`} />
                            {game.name}
                          </Button>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══ VPS SERVERS TAB ═══ */}
          <TabsContent value="servers" className="space-y-4">
            {!coolifyConfigured ? (
              <Card>
                <CardContent className="py-8 text-center space-y-3">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                  <p className="font-semibold">Coolify Not Configured</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set <code className="text-xs bg-muted px-1 rounded">COOLIFY_API_URL</code> and{' '}
                    <code className="text-xs bg-muted px-1 rounded">COOLIFY_API_TOKEN</code> in your environment variables to manage VPS game servers.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* VPS Servers */}
                {servers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" /> VPS Servers ({servers.length})
                      </CardTitle>
                      <CardDescription>Physical/virtual servers managed by Coolify</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {servers.map((srv) => (
                        <div key={srv.uuid} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{srv.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {srv.ip || 'No IP'} &middot; {srv.description || 'No description'}
                            </p>
                          </div>
                          <Badge className={srv.is_reachable ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-600 text-white'}>
                            {srv.is_reachable ? 'Reachable' : 'Unreachable'}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Deployed Game Server Applications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Container className="h-5 w-5" /> Game Server Applications ({coolifyApps.length})
                    </CardTitle>
                    <CardDescription>Deployed game servers — restart, deploy, start or stop</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {coolifyApps.length === 0 && (
                      <p className="text-sm text-muted-foreground">No applications found on Coolify.</p>
                    )}
                    {coolifyApps.map((app) => (
                      <div key={app.uuid} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{app.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {app.fqdn || app.git_repository || 'No domain'}
                            </p>
                          </div>
                          <AppStatusBadge status={app.status} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => restartAppMutation.mutate(app.uuid)} disabled={anyMutating}>
                            <RotateCw className="h-3 w-3" />Restart
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => deployAppMutation.mutate(app.uuid)} disabled={anyMutating}>
                            <Rocket className="h-3 w-3" />Deploy
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => startAppMutation.mutate(app.uuid)} disabled={anyMutating}>
                            <Play className="h-3 w-3" />Start
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-red-400 border-red-800 hover:bg-red-900/30" onClick={() => stopAppMutation.mutate(app.uuid)} disabled={anyMutating}>
                            <Square className="h-3 w-3" />Stop
                          </Button>
                          {app.fqdn && (
                            <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => window.open(app.fqdn!, '_blank')}>
                              <ExternalLink className="h-3 w-3" />Open
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {coolifyStatusQuery.data?.url && (
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => window.open(coolifyStatusQuery.data?.url || '#', '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Coolify Dashboard
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ═══ PVP GAMES TAB ═══ */}
          <TabsContent value="pvp-games" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-red-500" /> PVP Game Servers
                </CardTitle>
                <CardDescription>
                  Launch a new game server instance for any PVP mode, or join an existing one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PVP_GAMES.map((game) => {
                    const info = GAME_TYPE_INFO[game.key as keyof typeof GAME_TYPE_INFO];
                    const Icon = info?.icon || Gamepad2;
                    return (
                      <Card key={game.key} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${info?.color || ''}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{game.name}</p>
                              <p className="text-xs text-muted-foreground">{game.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={game.route} className="flex-1">
                              <Button variant="default" size="sm" className="w-full gap-1">
                                <Play className="h-3 w-3" /> Play Now
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setNewRoom({ ...newRoom, name: `${game.name} Server`, gameType: game.key as keyof typeof GAME_TYPE_INFO });
                                setShowCreateDialog(true);
                              }}
                            >
                              <Plus className="h-3 w-3" /> Host
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Running game servers from Coolify that match PVP patterns */}
            {coolifyConfigured && coolifyApps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Container className="h-5 w-5" /> Active Dedicated Servers
                  </CardTitle>
                  <CardDescription>Coolify-managed game server instances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coolifyApps.map((app) => (
                    <div key={app.uuid} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{app.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.fqdn || 'No domain'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AppStatusBadge status={app.status} />
                        {app.fqdn && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(app.fqdn!, '_blank')}>
                            <ExternalLink className="h-3 w-3 mr-1" />Join
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Private Room</DialogTitle>
            <DialogDescription>
              Enter the password to join "{selectedRoom?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="join-password">Password</Label>
            <Input
              id="join-password"
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Enter room password"
              onKeyDown={(e) => e.key === 'Enter' && confirmJoinRoom()}
              data-testid="input-join-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmJoinRoom} data-testid="button-confirm-join">
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
