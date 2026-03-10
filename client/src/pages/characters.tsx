import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sword, Shield, Zap, Heart, Lock, Check, LogIn } from "lucide-react";
import type { Character, PlayerCharacter } from "@shared/schema";

const RARITY_COLORS = {
  common: "bg-gray-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-amber-500",
};

const TYPE_ICONS: Record<string, any> = {
  warrior: Sword,
  mage: Zap,
  archer: Shield,
  legendary: Heart,
};

export default function CharactersPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: allCharacters, isLoading: charactersLoading } = useCachedQuery<Character[]>(
    ["/api/characters"],
    { ttlMs: 600_000 },
  );

  const { data: playerCharacters } = useCachedQuery<PlayerCharacter[]>(
    ["/api/players/me/characters"],
    { ttlMs: 120_000, enabled: isAuthenticated },
  );

  const unlockCharacterMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const response = await apiRequest("POST", `/api/players/me/characters/${characterId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/characters"] });
      toast({
        title: "Character Unlocked",
        description: "New character added to your collection!",
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

  const isCharacterOwned = (characterId: string) => {
    return playerCharacters?.some(pc => pc.characterId === characterId);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Character Collection</h2>
          <p className="text-muted-foreground">Sign in to view and manage your characters</p>
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

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading characters...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-characters-title">Character Collection</h1>
        <p className="text-sm text-muted-foreground">Unlock and manage your heroes</p>
      </div>

      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none" data-testid="tab-all-characters">All Characters</TabsTrigger>
          <TabsTrigger value="owned" className="flex-1 sm:flex-none" data-testid="tab-owned-characters">My Collection ({playerCharacters?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {allCharacters?.map((character) => {
              const owned = isCharacterOwned(character.id);
              const stats = character.baseStats as { health: number; attack: number; defense: number; speed: number };
              const Icon = TYPE_ICONS[character.type] || Sword;

              return (
                <Card key={character.id} className={`hover-elevate ${owned ? 'ring-2 ring-primary' : ''}`} data-testid={`card-character-${character.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${RARITY_COLORS[character.rarity as keyof typeof RARITY_COLORS]}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{character.name}</CardTitle>
                          <CardDescription className="capitalize">{character.type}</CardDescription>
                        </div>
                      </div>
                      <Badge className={RARITY_COLORS[character.rarity as keyof typeof RARITY_COLORS]}>
                        {character.rarity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{stats.health} HP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Sword className="h-3 w-3 text-orange-500" />
                        <span>{stats.attack} ATK</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-blue-500" />
                        <span>{stats.defense} DEF</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span>{stats.speed} SPD</span>
                      </div>
                    </div>

                    {owned ? (
                      <Button className="w-full" variant="secondary" disabled data-testid={`button-owned-${character.id}`}>
                        <Check className="mr-2 h-4 w-4" />
                        Owned
                      </Button>
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={() => unlockCharacterMutation.mutate(character.id)}
                        disabled={unlockCharacterMutation.isPending}
                        data-testid={`button-unlock-${character.id}`}
                      >
                        {character.unlockLevel > 1 ? (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Requires Level {character.unlockLevel}
                          </>
                        ) : (
                          "Unlock Free"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="owned" className="mt-0">
          {!playerCharacters || playerCharacters.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
              <Sword className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2 text-lg sm:text-xl">No Characters Yet</CardTitle>
              <CardDescription>Unlock characters from the collection to add them here!</CardDescription>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {playerCharacters.map((pc) => {
                const character = allCharacters?.find(c => c.id === pc.characterId);
                if (!character) return null;
                const stats = character.baseStats as { health: number; attack: number; defense: number; speed: number };
                const Icon = TYPE_ICONS[character.type] || Sword;

                return (
                  <Card key={pc.id} className="hover-elevate" data-testid={`card-owned-${pc.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${RARITY_COLORS[character.rarity as keyof typeof RARITY_COLORS]}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{character.name}</CardTitle>
                            <CardDescription>Level {pc.level}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {pc.xp} XP
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          <span>{stats.health} HP</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sword className="h-3 w-3 text-orange-500" />
                          <span>{stats.attack} ATK</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-blue-500" />
                          <span>{stats.defense} DEF</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          <span>{stats.speed} SPD</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
