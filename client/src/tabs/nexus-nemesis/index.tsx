import React from 'react';

const GAME_URL = 'https://nemesis.grudge-studio.com';

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
