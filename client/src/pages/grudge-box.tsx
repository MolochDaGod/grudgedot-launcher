import { GrudgeEmbed } from '@/components/GrudgeEmbed';

const GKO_URL = 'https://grudge-wars.vercel.app/gko-boxing';

export default function GrudgeBox() {
  return (
    <div className="flex flex-col h-full" data-testid="page-grudge-box">
      <GrudgeEmbed
        src={GKO_URL}
        title="G.K.O. Boxing — PvE Campaign"
        allowFullscreen
        showExternalLink
      />
    </div>
  );
}
