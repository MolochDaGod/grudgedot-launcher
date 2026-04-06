import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Minimize2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { getAuthData } from '@/lib/auth';

interface GrudgeEmbedProps {
  /** Full URL to embed (e.g. https://grudge-wars.vercel.app/gko-boxing) */
  src: string;
  /** Page title shown during loading */
  title?: string;
  /** Allow fullscreen toggle */
  allowFullscreen?: boolean;
  /** Extra CSS class on the container */
  className?: string;
  /** Show the external link button */
  showExternalLink?: boolean;
  /** Minimum height */
  minHeight?: string;
}

/**
 * Embeds any Grudge Studio app in an iframe with:
 * - Auth token forwarding via postMessage
 * - Loading spinner
 * - Fullscreen toggle
 * - Error boundary with retry
 * - External link button
 */
export function GrudgeEmbed({
  src,
  title = 'Loading...',
  allowFullscreen = true,
  className = '',
  showExternalLink = true,
  minHeight = '100%',
}: GrudgeEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [key, setKey] = useState(0);

  // Forward auth token to iframe once it loads
  const sendAuth = useCallback(() => {
    const auth = getAuthData();
    if (!auth?.token || !iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        { type: 'grudge:auth', token: auth.token, grudgeId: auth.grudgeId, username: auth.username },
        '*'
      );
    } catch {}
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    // Send auth after a small delay to let the child app initialize
    setTimeout(sendAuth, 500);
  }, [sendAuth]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  // Listen for messages from the embedded app
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data?.type) return;
      // Child requests auth token
      if (e.data.type === 'grudge:requestAuth') {
        sendAuth();
      }
      // Child reports navigation (for breadcrumbs, etc.)
      if (e.data.type === 'grudge:navigate') {
        // Could update parent URL or breadcrumbs here
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sendAuth]);

  const retry = () => {
    setLoading(true);
    setError(false);
    setKey(k => k + 1);
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      iframeRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen(!fullscreen);
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className={`relative flex flex-col h-full ${className}`} style={{ minHeight }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar/50 border-b border-border/50 shrink-0">
        <span className="text-xs text-muted-foreground font-medium truncate">{title}</span>
        <div className="flex items-center gap-1">
          {showExternalLink && (
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={retry}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          {allowFullscreen && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90">
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load {title}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={retry}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={src} target="_blank" rel="noopener noreferrer">
                  Open Externally
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={src}
        onLoad={handleLoad}
        onError={handleError}
        className="flex-1 w-full border-0"
        style={{ minHeight: 0 }}
        allow="autoplay; fullscreen; gamepad; microphone"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
