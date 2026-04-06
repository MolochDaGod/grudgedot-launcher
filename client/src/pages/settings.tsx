import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useCachedMutation } from "@/hooks/useCachedMutation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { grudgeAccountApi, grudgeIdApi } from "@/lib/grudgeBackendApi";
import { 
  User, 
  Settings, 
  Volume2, 
  Monitor, 
  Bell, 
  Shield, 
  LogOut, 
  Mail,
  Calendar,
  Gamepad2,
  Music,
  Sparkles,
  Eye,
  Keyboard,
  LogIn,
  Laptop,
  Trash2,
  Crown
} from "lucide-react";
import { useState, useEffect } from "react";
import type { UserSettings } from "@shared/schema";

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

interface GraphicsSettings {
  quality: "low" | "medium" | "high" | "ultra";
  shadows: boolean;
  particles: boolean;
  antiAliasing: boolean;
  fps: 30 | 60 | 120;
}

interface NotificationSettings {
  gameInvites: boolean;
  achievements: boolean;
  friendRequests: boolean;
  systemUpdates: boolean;
  sounds: boolean;
}

const defaultAudioSettings: AudioSettings = {
  masterVolume: 80,
  musicVolume: 60,
  sfxVolume: 80,
  muted: false,
};

const defaultGraphicsSettings: GraphicsSettings = {
  quality: "high",
  shadows: true,
  particles: true,
  antiAliasing: true,
  fps: 60,
};

const defaultNotificationSettings: NotificationSettings = {
  gameInvites: true,
  achievements: true,
  friendRequests: true,
  systemUpdates: true,
  sounds: true,
};

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [audioSettings, setAudioSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(defaultGraphicsSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Grudge backend sessions & identity
  const { data: grudgeSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['grudge', 'sessions'],
    queryFn: () => grudgeAccountApi.listSessions(),
    enabled: isAuthenticated,
  });

  const { data: grudgeMe } = useQuery({
    queryKey: ['grudge', 'identity'],
    queryFn: () => grudgeIdApi.getMe(),
    enabled: isAuthenticated,
  });

  const revokeSession = useMutation({
    mutationFn: (computerId: string) => grudgeAccountApi.revokeSession(computerId),
    onSuccess: () => { refetchSessions(); toast({ title: 'Session revoked' }); },
    onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Could not revoke session' }),
  });

  const { data: settings, isLoading: settingsLoading } = useCachedQuery<UserSettings>(
    ["/api/settings"],
    { ttlMs: 300_000, enabled: isAuthenticated },
  );

  useEffect(() => {
    if (settings) {
      if (settings.audioSettings) {
        setAudioSettings({ ...defaultAudioSettings, ...(settings.audioSettings as AudioSettings) });
      }
      if (settings.graphicsSettings) {
        setGraphicsSettings({ ...defaultGraphicsSettings, ...(settings.graphicsSettings as GraphicsSettings) });
      }
      if (settings.notificationSettings) {
        setNotificationSettings({ ...defaultNotificationSettings, ...(settings.notificationSettings as NotificationSettings) });
      }
    }
  }, [settings]);

  const saveSettingsMutation = useCachedMutation<UserSettings, Partial<UserSettings>>({
    mutationFn: async (data) => {
      const response = await apiRequest("PUT", "/api/settings", data);
      return response.json();
    },
    cacheKey: ["/api/settings"],
    ttlMs: 300_000,
    onSuccess: () => {
      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSaveAll = () => {
    saveSettingsMutation.mutate({
      audioSettings,
      graphicsSettings,
      notificationSettings,
    });
  };

  const updateAudio = (key: keyof AudioSettings, value: number | boolean) => {
    setAudioSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateGraphics = (key: keyof GraphicsSettings, value: string | boolean | number) => {
    setGraphicsSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateNotifications = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Sign in to access your account settings and preferences</p>
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

  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col min-h-full p-4 sm:p-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
                <Settings className="h-6 w-6" />
                Settings
              </h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            {hasChanges && (
              <Button 
                onClick={handleSaveAll}
                disabled={saveSettingsMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-save-settings"
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="account" className="flex items-center gap-2 py-2" data-testid="tab-account">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2 py-2" data-testid="tab-audio">
                <Volume2 className="h-4 w-4" />
                <span className="hidden sm:inline">Audio</span>
              </TabsTrigger>
              <TabsTrigger value="graphics" className="flex items-center gap-2 py-2" data-testid="tab-graphics">
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Graphics</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 py-2" data-testid="tab-notifications">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Your personal account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-red-600">
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-semibold" data-testid="text-user-name">
                        {user?.firstName || user?.username || "User"}
                        {user?.lastName && ` ${user.lastName}`}
                      </h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span data-testid="text-user-email">{user?.email || "No email"}</span>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified Account
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Username
                      </Label>
                      <div className="font-medium" data-testid="text-username">
                        {user?.username || "Not set"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Member Since
                      </Label>
                      <div className="font-medium" data-testid="text-created-at">
                        {user?.createdAt ? formatDate(new Date(user.createdAt)) : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grudge Identity */}
              {grudgeMe && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      Grudge Identity
                    </CardTitle>
                    <CardDescription>Your Grudge Warlords account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><Label className="text-muted-foreground">Grudge ID</Label><p className="font-mono">{grudgeMe.grudge_id || grudgeMe.grudgeId || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Username</Label><p>{grudgeMe.username || '—'}</p></div>
                      {grudgeMe.faction && <div><Label className="text-muted-foreground">Faction</Label><p>{grudgeMe.faction}</p></div>}
                      {grudgeMe.race && <div><Label className="text-muted-foreground">Race / Class</Label><p>{grudgeMe.race} {grudgeMe.class}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Grudge Sessions */}
              {grudgeSessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Laptop className="h-5 w-5" />
                      Grudge Sessions ({grudgeSessions.length})
                    </CardTitle>
                    <CardDescription>Active sessions across devices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {grudgeSessions.map((s: any) => (
                        <div key={s.computer_id || s.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div>
                            <p className="text-sm font-medium">{s.label || s.computer_id || 'Unknown device'}</p>
                            <p className="text-xs text-muted-foreground">{s.last_seen ? new Date(s.last_seen).toLocaleString() : 'Active'}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeSession.mutate(s.computer_id)}
                            disabled={revokeSession.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Revoke
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-red-600/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <LogOut className="h-5 w-5" />
                    Session
                  </CardTitle>
                  <CardDescription>Manage your current session</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild data-testid="button-logout">
                    <a href="/api/logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audio" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Audio Settings
                  </CardTitle>
                  <CardDescription>Adjust volume and sound preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Mute All Sounds</Label>
                      <p className="text-sm text-muted-foreground">Disable all game audio</p>
                    </div>
                    <Switch
                      checked={audioSettings.muted}
                      onCheckedChange={(checked) => updateAudio("muted", checked)}
                      data-testid="switch-mute"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          Master Volume
                        </Label>
                        <span className="text-sm text-muted-foreground">{audioSettings.masterVolume}%</span>
                      </div>
                      <Slider
                        value={[audioSettings.masterVolume]}
                        onValueChange={([value]) => updateAudio("masterVolume", value)}
                        max={100}
                        step={1}
                        disabled={audioSettings.muted}
                        data-testid="slider-master-volume"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          Music Volume
                        </Label>
                        <span className="text-sm text-muted-foreground">{audioSettings.musicVolume}%</span>
                      </div>
                      <Slider
                        value={[audioSettings.musicVolume]}
                        onValueChange={([value]) => updateAudio("musicVolume", value)}
                        max={100}
                        step={1}
                        disabled={audioSettings.muted}
                        data-testid="slider-music-volume"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Gamepad2 className="h-4 w-4" />
                          Sound Effects
                        </Label>
                        <span className="text-sm text-muted-foreground">{audioSettings.sfxVolume}%</span>
                      </div>
                      <Slider
                        value={[audioSettings.sfxVolume]}
                        onValueChange={([value]) => updateAudio("sfxVolume", value)}
                        max={100}
                        step={1}
                        disabled={audioSettings.muted}
                        data-testid="slider-sfx-volume"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="graphics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Graphics Settings
                  </CardTitle>
                  <CardDescription>Configure visual quality and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Graphics Quality
                    </Label>
                    <Select 
                      value={graphicsSettings.quality}
                      onValueChange={(value) => updateGraphics("quality", value)}
                    >
                      <SelectTrigger data-testid="select-quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="ultra">Ultra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Target FPS
                    </Label>
                    <Select 
                      value={String(graphicsSettings.fps)}
                      onValueChange={(value) => updateGraphics("fps", Number(value))}
                    >
                      <SelectTrigger data-testid="select-fps">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 FPS</SelectItem>
                        <SelectItem value="60">60 FPS</SelectItem>
                        <SelectItem value="120">120 FPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Shadows</Label>
                        <p className="text-sm text-muted-foreground">Enable dynamic shadows</p>
                      </div>
                      <Switch
                        checked={graphicsSettings.shadows}
                        onCheckedChange={(checked) => updateGraphics("shadows", checked)}
                        data-testid="switch-shadows"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Particles</Label>
                        <p className="text-sm text-muted-foreground">Show particle effects</p>
                      </div>
                      <Switch
                        checked={graphicsSettings.particles}
                        onCheckedChange={(checked) => updateGraphics("particles", checked)}
                        data-testid="switch-particles"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Anti-Aliasing</Label>
                        <p className="text-sm text-muted-foreground">Smooth jagged edges</p>
                      </div>
                      <Switch
                        checked={graphicsSettings.antiAliasing}
                        onCheckedChange={(checked) => updateGraphics("antiAliasing", checked)}
                        data-testid="switch-antialiasing"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Choose what you want to be notified about</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notification Sounds</Label>
                      <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sounds}
                      onCheckedChange={(checked) => updateNotifications("sounds", checked)}
                      data-testid="switch-notification-sounds"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Game Invites</Label>
                      <p className="text-sm text-muted-foreground">Notify when invited to games</p>
                    </div>
                    <Switch
                      checked={notificationSettings.gameInvites}
                      onCheckedChange={(checked) => updateNotifications("gameInvites", checked)}
                      data-testid="switch-game-invites"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Achievements</Label>
                      <p className="text-sm text-muted-foreground">Notify when earning achievements</p>
                    </div>
                    <Switch
                      checked={notificationSettings.achievements}
                      onCheckedChange={(checked) => updateNotifications("achievements", checked)}
                      data-testid="switch-achievements"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Friend Requests</Label>
                      <p className="text-sm text-muted-foreground">Notify for friend requests</p>
                    </div>
                    <Switch
                      checked={notificationSettings.friendRequests}
                      onCheckedChange={(checked) => updateNotifications("friendRequests", checked)}
                      data-testid="switch-friend-requests"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">System Updates</Label>
                      <p className="text-sm text-muted-foreground">Important system announcements</p>
                    </div>
                    <Switch
                      checked={notificationSettings.systemUpdates}
                      onCheckedChange={(checked) => updateNotifications("systemUpdates", checked)}
                      data-testid="switch-system-updates"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ScrollArea>
  );
}
