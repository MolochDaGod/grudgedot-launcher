/**
 * @deprecated Use EngineBootstrap from '@/components/EngineBootstrap' instead.
 * This wrapper exists only for backward compatibility with files not yet migrated.
 */
import { EngineBootstrap, type EngineType } from './EngineBootstrap';
export type { EngineType };

interface BabylonPlaceholderProps {
  title: string;
  description: string;
  concepts?: string[];
  engine?: EngineType;
}

export function BabylonPlaceholder({ title, description, concepts, engine = 'babylon' }: BabylonPlaceholderProps) {
  return <EngineBootstrap title={title} description={description} concepts={concepts} engine={engine} />;
}
