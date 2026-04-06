import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface BabylonPlaceholderProps {
  title: string;
  description: string;
  concepts?: string[];
}

/**
 * Placeholder for 3D game pages being rebuilt on BabylonJS.
 * Shows the game concept and what's being migrated.
 */
export function BabylonPlaceholder({ title, description, concepts }: BabylonPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
      <Hammer className="h-16 w-16 text-amber-500 animate-pulse" />
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Badge variant="secondary" className="text-xs font-mono mb-4">
          Rebuilding on BabylonJS
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
        <Link href="/engine">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Open Grudge Engine
        </Link>
      </Button>
    </div>
  );
}
