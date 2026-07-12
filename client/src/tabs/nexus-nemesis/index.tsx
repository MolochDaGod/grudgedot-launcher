import React from 'react';

import { GAME_URLS } from '@shared/gameUrls';

const GAME_URL = GAME_URLS.nemesis;

export default function NexusNemesisTab() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <iframe
        src={GAME_URL}
        title="Nexus Nemesis"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="autoplay; fullscreen; gamepad; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
