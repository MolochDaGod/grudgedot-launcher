import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Trophy, Gamepad2, Star, LogIn, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import type { PlayerProfile, LevelRequirement } from "@shared/schema";

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { data: profile, isLoading: profileLoading } = useCachedQuery<PlayerProfile>(
    ["/api/players/me"],
    { ttlMs: 120_000, enabled: isAuthenticated },
  );

  const { data: levels } = useCachedQuery<LevelRequirement[]>(
    ["/api/levels"],
    { ttlMs: 600_000 },
  );

  const createProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      const response = await apiRequest("POST", "/api/players/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me"] });
      toast({
        title: "Profile Created",
        description: "Welcome to the game!",
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      const response = await apiRequest("PATCH", "/api/players/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
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

  const getCurrentLevelProgress = () => {
    if (!profile || !levels || levels.length === 0) return { progress: 0, currentXp: 0, nextLevelXp: 100 };
    const currentLevelReq = levels.find(l => l.level === profile.level);
    const nextLevelReq = levels.find(l => l.level === profile.level + 1);
    if (!currentLevelReq || !nextLevelReq) return { progress: 100, currentXp: profile.xp, nextLevelXp: profile.xp };
    const xpForCurrentLevel = currentLevelReq.xpRequired;
    const xpForNextLevel = nextLevelReq.xpRequired;
    const xpIntoLevel = profile.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    return {
      progress: Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)),
      currentXp: profile.xp,
      nextLevelXp: xpForNextLevel,
    };
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your Profile</h2>
          <p className="text-muted-foreground">Sign in to view and manage your player profile</p>
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

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Your Profile</CardTitle>
            <CardDescription>Set up your player profile to start playing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                data-testid="input-display-name"
              />
            </div>
            <Button 
              className="w-full"
              onClick={() => createProfileMutation.mutate({ displayName: displayName || "Player" })}
              disabled={createProfileMutation.isPending}
              data-testid="button-create-profile"
            >
              {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const levelProgress = getCurrentLevelProgress();

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-8"
                        data-testid="input-edit-name"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => updateProfileMutation.mutate({ displayName })}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-name"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                        data-testid="button-cancel-edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid="text-display-name">{profile.displayName}</CardTitle>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => {
                          setDisplayName(profile.displayName);
                          setIsEditing(true);
                        }}
                        data-testid="button-edit-name"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <CardDescription>{user?.email}</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                <Star className="mr-1 h-4 w-4" />
                Level {profile.level}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Experience</span>
                <span>{levelProgress.currentXp} / {levelProgress.nextLevelXp} XP</span>
              </div>
              <Progress value={levelProgress.progress} className="h-2" data-testid="progress-xp" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-games-played">{profile.totalGamesPlayed}</p>
                    <p className="text-sm text-muted-foreground">Games Played</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-wins">{profile.totalWins}</p>
                    <p className="text-sm text-muted-foreground">Victories</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="outline" asChild data-testid="button-logout">
            <a href="/api/logout">Sign Out</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
