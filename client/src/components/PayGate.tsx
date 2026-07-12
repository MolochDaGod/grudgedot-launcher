/**
 * PayGate — Role-based feature gate for Grudge Studio premium features.
 *
 * Usage:
 *   <PayGate tier="member">
 *     <PremiumFeature />
 *   </PayGate>
 *
 * Tiers (ascending):
 *   guest  → pleb → member → admin/master
 *
 * If the user's role is insufficient, renders a blurred teaser + upgrade CTA.
 */
import { type ReactNode } from 'react';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

type GrudgeRole = 'guest' | 'pleb' | 'member' | 'admin' | 'master';

const ROLE_RANK: Record<GrudgeRole, number> = {
  guest: 0,
  pleb: 1,
  member: 2,
  admin: 9,
  master: 10,
};

function getRank(role?: string): number {
  return ROLE_RANK[(role as GrudgeRole) ?? 'guest'] ?? 0;
}

interface PayGateProps {
  /** Minimum role required to see the content */
  tier: 'member' | 'admin' | 'master';
  /** What to show in the lock CTA title */
  featureName?: string;
  /** Brief description of the locked feature */
  description?: string;
  /** Show a blurred preview of children behind the lock */
  blurPreview?: boolean;
  children: ReactNode;
}

export function PayGate({
  tier,
  featureName,
  description,
  blurPreview = true,
  children,
}: PayGateProps) {
  const { user } = useAuth();
  const userRank = getRank(user?.role);
  const requiredRank = ROLE_RANK[tier];

  // User has access — render normally
  if (userRank >= requiredRank) return <>{children}</>;

  const TIER_LABELS: Record<string, string> = {
    member: 'Member',
    admin: 'Admin',
    master: 'Master',
  };

  return (
    <div className="relative">
      {/* Blurred preview */}
      {blurPreview && (
        <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.35 }}>
          {children}
        </div>
      )}

      {/* Lock overlay */}
      <div className={`${blurPreview ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="bg-background/95 backdrop-blur-sm border border-amber-800/40 rounded-xl p-6 max-w-sm mx-4 shadow-2xl shadow-black/50 text-center">
          {/* Lock icon */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-600/30 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>

          {/* Tier badge */}
          <Badge
            className="mb-3 bg-amber-500/20 text-amber-300 border-amber-600/30 text-[10px] tracking-wider uppercase"
          >
            <Crown className="w-2.5 h-2.5 mr-1" />
            {TIER_LABELS[tier]} Feature
          </Badge>

          <h3
            className="font-bold text-base text-foreground mb-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {featureName ?? 'Premium Feature'}
          </h3>

          {description && (
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              {description}
            </p>
          )}

          <div className="space-y-2">
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white font-semibold"
              onClick={() => window.open('https://grudgewarlords.com', '_blank', 'noopener')}
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Upgrade to {TIER_LABELS[tier]}
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </Button>
            <p className="text-[10px] text-muted-foreground/60">
              Access all features at{' '}
              <span className="text-amber-500/70">grudgewarlords.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline lock badge — for labeling locked sidebar items without full overlay */
export function PayBadge({ tier }: { tier: 'member' | 'admin' | 'master' }) {
  const { user } = useAuth();
  const userRank = getRank(user?.role);
  const requiredRank = ROLE_RANK[tier];
  if (userRank >= requiredRank) return null;

  return (
    <Lock className="h-2.5 w-2.5 text-amber-500/60 flex-shrink-0" />
  );
}
