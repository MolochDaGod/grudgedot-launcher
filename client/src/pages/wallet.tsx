import { useAuth } from "@/hooks/useAuth";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gem, Trophy, LogIn, ShoppingBag } from "lucide-react";
import type { Currency, PlayerWallet, StoreItem } from "@shared/schema";

const CURRENCY_ICONS: Record<string, any> = {
  GOLD: Coins,
  GEMS: Gem,
  TOKENS: Trophy,
};

const CURRENCY_COLORS: Record<string, string> = {
  GOLD: "text-yellow-500",
  GEMS: "text-purple-500",
  TOKENS: "text-blue-500",
};

export default function WalletPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: currencies } = useCachedQuery<Currency[]>(
    ["/api/currencies"],
    { ttlMs: 600_000 },
  );

  const { data: wallets, isLoading: walletsLoading } = useCachedQuery<PlayerWallet[]>(
    ["/api/players/me/wallet"],
    { ttlMs: 60_000, enabled: isAuthenticated },
  );

  const { data: storeItems } = useCachedQuery<StoreItem[]>(
    ["/api/store"],
    { ttlMs: 600_000 },
  );

  const getWalletBalance = (currencyId: string) => {
    const wallet = wallets?.find(w => w.currencyId === currencyId);
    return wallet?.balance || 0;
  };

  const getCurrency = (currencyId: string) => {
    return currencies?.find(c => c.id === currencyId);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your Wallet</h2>
          <p className="text-muted-foreground">Sign in to view your in-game currencies</p>
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

  if (walletsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-wallet-title">Wallet</h1>
        <p className="text-sm text-muted-foreground">Manage your in-game currencies</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {currencies?.map((currency) => {
            const Icon = CURRENCY_ICONS[currency.code] || Coins;
            const colorClass = CURRENCY_COLORS[currency.code] || "text-gray-500";
            const balance = getWalletBalance(currency.id);

            return (
              <Card key={currency.id} data-testid={`card-currency-${currency.code}`}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold" data-testid={`text-balance-${currency.code}`}>
                      {balance.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{currency.name}</p>
                  </div>
                  {currency.isPremium && (
                    <Badge variant="secondary" className="ml-auto">Premium</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Store</h2>
          {!storeItems || storeItems.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2 text-lg sm:text-xl">Store Coming Soon</CardTitle>
              <CardDescription>Check back later for items to purchase!</CardDescription>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {storeItems.map((item) => {
                const price = item.price as { gold?: number; gems?: number };
                return (
                  <Card key={item.id} className="hover-elevate" data-testid={`card-store-${item.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {price.gold && price.gold > 0 && (
                            <Badge variant="secondary" className="text-yellow-500">
                              <Coins className="mr-1 h-3 w-3" />
                              {price.gold}
                            </Badge>
                          )}
                          {price.gems && price.gems > 0 && (
                            <Badge variant="secondary" className="text-purple-500">
                              <Gem className="mr-1 h-3 w-3" />
                              {price.gems}
                            </Badge>
                          )}
                        </div>
                        <Button size="sm" data-testid={`button-buy-${item.id}`}>
                          Buy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
