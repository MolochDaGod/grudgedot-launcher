export default function GrudgeBox() {
  return (
    <div className="w-full h-full" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <iframe
        src="https://standalone-grudge.vercel.app/grudge-box"
        title="GrudgeBox"
        className="w-full h-full border-0"
        style={{ minHeight: 'calc(100vh - 3.5rem)' }}
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
