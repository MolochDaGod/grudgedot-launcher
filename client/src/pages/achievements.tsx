import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Swords, Package, LogIn, Check, Lock } from "lucide-react";
import type { Achievement, PlayerAchievement } from "@shared/schema";

const CATEGORY_ICONS: Record<string, any> = {
  combat: Swords,
  collection: Package,
  progression: Star,
};

export default function AchievementsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: achievements, isLoading: achievementsLoading } = useCachedQuery<Achievement[]>(
    ["/api/achievements"],
    { ttlMs: 600_000 },
  );

  const { data: playerAchievements } = useCachedQuery<PlayerAchievement[]>(
    ["/api/players/me/achievements"],
    { ttlMs: 60_000, enabled: isAuthenticated },
  );

  const getPlayerProgress = (achievementId: string) => {
    return playerAchievements?.find(pa => pa.achievementId === achievementId);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-muted-foreground">Sign in to view your progress</p>
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

  if (achievementsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading achievements...</div>
      </div>
    );
  }

  const completedCount = playerAchievements?.filter(pa => pa.completedAt).length || 0;
  const totalCount = achievements?.length || 0;

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-achievements-title">Achievements</h1>
            <p className="text-sm text-muted-foreground">Track your progress and earn rewards</p>
          </div>
          <Badge variant="secondary" className="text-base sm:text-lg px-3 py-1 w-fit">
            <Trophy className="mr-1 h-4 w-4" />
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </div>

      {!achievements || achievements.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
          <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2 text-lg sm:text-xl">No Achievements Yet</CardTitle>
          <CardDescription>Achievements will appear here once they are added.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {achievements.map((achievement) => {
            const playerProgress = getPlayerProgress(achievement.id);
            const requirement = achievement.requirement as { type: string; count: number };
            const reward = achievement.reward as { gold?: number; xp?: number; gems?: number };
            const progress = playerProgress?.progress || 0;
            const isCompleted = playerProgress?.completedAt != null;
            const progressPercent = Math.min(100, Math.round((progress / requirement.count) * 100));
            const Icon = CATEGORY_ICONS[achievement.category] || Trophy;

            return (
              <Card 
                key={achievement.id} 
                className={`hover-elevate ${isCompleted ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-achievement-${achievement.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isCompleted ? 'bg-primary' : 'bg-muted'}`}>
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{achievement.name}</CardTitle>
                        <CardDescription>{achievement.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {achievement.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{progress}/{requirement.count}</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Rewards:</span>
                      {reward.gold && (
                        <Badge variant="secondary" className="text-yellow-500">
                          {reward.gold} Gold
                        </Badge>
                      )}
                      {reward.xp && (
                        <Badge variant="secondary" className="text-blue-500">
                          {reward.xp} XP
                        </Badge>
                      )}
                      {reward.gems && (
                        <Badge variant="secondary" className="text-purple-500">
                          {reward.gems} Gems
                        </Badge>
                      )}
                    </div>
                    {isCompleted && !playerProgress?.claimedAt && (
                      <Button size="sm" data-testid={`button-claim-${achievement.id}`}>
                        Claim
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
