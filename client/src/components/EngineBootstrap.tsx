import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export type EngineType = 'threejs' | 'babylon' | '2d';

interface EngineBootstrapProps {
  title: string;
  description: string;
  engine: EngineType;
  concepts?: string[];
}

const ENGINE_META: Record<EngineType, { label: string; color: string; route: string }> = {
  threejs:  { label: 'Studio Forge', color: 'bg-amber-500/20 text-amber-300', route: '/forge' },
  babylon:  { label: 'Studio Forge', color: 'bg-amber-500/20 text-amber-300', route: '/forge' },
  '2d':     { label: '2D Engine',    color: 'bg-emerald-500/20 text-emerald-400', route: '/flat-engine' },
};

/**
 * Placeholder for game pages that are being rebuilt on a specific engine.
 * Shows which engine the game targets and links to the appropriate editor.
 */
export function EngineBootstrap({ title, description, engine, concepts }: EngineBootstrapProps) {
  const meta = ENGINE_META[engine];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
      <Hammer className="h-16 w-16 text-amber-500 animate-pulse" />
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Badge variant="secondary" className={`text-xs font-mono mb-4 border-0 ${meta.color}`}>
          {meta.label}
        </Badge>
        {concepts && concepts.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {concepts.map(c => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}
      </div>
      <Button variant="outline" asChild>
        <Link href={meta.route}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Open {meta.label}
        </Link>
      </Button>
    </div>
  );
}
