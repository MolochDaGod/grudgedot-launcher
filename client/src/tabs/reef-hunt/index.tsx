import React from 'react';

const GAME_URL = 'https://standalone-grudge.vercel.app/play';

export default function ReefHuntTab() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#050a18', position: 'relative' }}>
      <iframe
        src={GAME_URL}
        title="Reef Hunt"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
