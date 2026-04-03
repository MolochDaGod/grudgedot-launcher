import { GrudgeEmbed } from '@/components/GrudgeEmbed';

export default function NexusNemesisPage() {
  return (
    <div className="flex flex-col h-full" data-testid="page-nexus-nemesis">
      <GrudgeEmbed
        src="https://nemesis.grudge-studio.com"
        title="Nexus Nemesis — TCG"
        allowFullscreen
        showExternalLink
      />
    </div>
  );
}
