import React, { Suspense } from 'react';
const GrudgeWarlordsRTS = React.lazy(() => import('../../pages/grudge-warlords-rts'));

export default function GrudgeSwarmTab() {
  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Suspense fallback={<div style={{ color: '#fff', padding: 16 }}>Loading RTS Game Designer…</div>}>
        <GrudgeWarlordsRTS />
      </Suspense>
    </div>
  );
}
