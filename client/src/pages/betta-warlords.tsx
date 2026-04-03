import { GrudgeEmbed } from '@/components/GrudgeEmbed';

export default function BettaWarlords() {
  return (
    <div className="flex flex-col h-full" data-testid="page-betta-warlords">
      <GrudgeEmbed
        src="https://grudge-wars.vercel.app/play"
        title="Betta Warlords — RPG Adventure"
        allowFullscreen
        showExternalLink
      />
    </div>
  );
}
