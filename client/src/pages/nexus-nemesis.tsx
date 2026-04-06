import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

const GAME_URL = 'https://nemesis.grudge-studio.com';

export default function NexusNemesisPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>Nexus Nemesis</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400 border-0">TCG</Badge>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-400 border-0">Web3</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(GAME_URL, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Game iframe */}
      <iframe
        src={GAME_URL}
        title="Nexus Nemesis"
        className="w-full border-none"
        style={{ height: 'calc(100vh - 7rem)' }}
        allow="autoplay; fullscreen; gamepad; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
