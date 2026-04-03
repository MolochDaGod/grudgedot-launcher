import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';

const RTS_URL = 'https://grudge-warlords-rts.vercel.app';

export default function SwarmRTS() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={`flex flex-col bg-black text-white ${fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'}`}
      data-testid="swarm-rts-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-home">
            <Home className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Grudge Warlords RTS</h1>
        <Badge className="bg-amber-600 text-white">WC3-Style</Badge>
        <Badge variant="outline" className="text-xs">67 Units • 8 Heroes • 16 Buildings</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setFullscreen(!fullscreen)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <a href={RTS_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4 mr-1" /> Open Standalone
          </Button>
        </a>
      </div>

      {/* Game iframe */}
      <iframe
        src={RTS_URL}
        className="flex-1 w-full border-0"
        style={{ minHeight: fullscreen ? 'calc(100vh - 48px)' : 'calc(100vh - 120px)' }}
        allow="fullscreen; autoplay"
        title="Grudge Warlords RTS"
      />
    </div>
  );
}
