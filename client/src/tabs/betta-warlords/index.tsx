import React from 'react';

import { GAME_URLS } from '@shared/gameUrls';

const GAME_URL = GAME_URLS.bettaWarlords;

export default function BettaWarlordsTab() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#050a18', position: 'relative' }}>
      <iframe
        src={GAME_URL}
        title="Betta Warlords"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="autoplay; fullscreen; gamepad; microphone"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
