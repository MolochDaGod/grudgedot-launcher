import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-200">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/auth" className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <h1
          className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 font-serif mb-2"
        >
          Privacy Policy
        </h1>
        <p className="text-stone-500 text-sm mb-8">Last updated: March 11, 2026</p>

        <div className="space-y-6 text-stone-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">1. Introduction</h2>
            <p>
              Grudge Studio ("we", "us", "our") operates the GDevelop Assistant platform and
              Grudge Warlords game ecosystem at gdevelop-assistant.vercel.app and related
              services. This Privacy Policy explains how we collect, use, and protect your
              information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">2. Information We Collect</h2>
            <h3 className="font-medium text-stone-200 mt-3 mb-1">Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Username and display name</li>
              <li>Email address (if provided or via Google/Discord OAuth)</li>
              <li>Solana wallet address (auto-created via Crossmint or externally connected)</li>
              <li>OAuth identifiers from Google, Discord, GitHub, or Puter</li>
              <li>Avatar URL from connected social accounts</li>
            </ul>
            <h3 className="font-medium text-stone-200 mt-3 mb-1">Game Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Character data (class, race, level, inventory, equipment)</li>
              <li>In-game currency balances (Gold, GBUX)</li>
              <li>Game projects, maps, and asset configurations you create</li>
              <li>Chat messages sent through the AI assistant</li>
            </ul>
            <h3 className="font-medium text-stone-200 mt-3 mb-1">Automatically Collected</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address and browser user agent (via standard HTTP headers)</li>
              <li>Login timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and manage your Grudge Account (GRUDGE ID)</li>
              <li>To provide game services and save your progress across Grudge games</li>
              <li>To create custodial Solana wallets for NFT and token functionality</li>
              <li>To power AI features (chat, asset generation, game assistance)</li>
              <li>To improve our services and fix bugs</li>
              <li>To communicate important service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">4. Third-Party Services</h2>
            <p>We integrate with the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Google OAuth</strong> — for authentication (we receive your name, email, profile picture)</li>
              <li><strong>Discord OAuth</strong> — for authentication</li>
              <li><strong>Crossmint</strong> — for Solana custodial wallet creation and NFT minting</li>
              <li><strong>xAI (Grok)</strong> — for AI-powered game development assistance</li>
              <li><strong>Meshy</strong> — for 3D asset generation</li>
              <li><strong>Neon Database</strong> — for data storage (PostgreSQL)</li>
              <li><strong>Vercel</strong> — for hosting and deployment</li>
              <li><strong>Puter</strong> — for optional cloud storage authentication</li>
            </ul>
            <p className="mt-2">
              Each third-party service has its own privacy policy. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">5. Data Storage & Security</h2>
            <p>
              Your data is stored in a PostgreSQL database hosted on Neon. Passwords are hashed
              using bcrypt. Authentication tokens are signed JWTs with 30-day expiry. We use HTTPS
              for all data transmission. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">6. Guest Accounts</h2>
            <p>
              Guest accounts are created with minimal data (a generated username and GRUDGE ID).
              Guest account data may be deleted after 90 days of inactivity. You can upgrade a
              guest account to a full account at any time by linking a login method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">7. Blockchain & NFT Data</h2>
            <p>
              If you mint characters or assets as NFTs, the transaction data is recorded on the
              Solana blockchain and is publicly visible. Blockchain transactions are irreversible.
              Custodial wallet addresses are associated with your GRUDGE ID.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">8. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You can view your account data via your profile and settings pages</li>
              <li>You can request deletion of your account by contacting us</li>
              <li>You can disconnect third-party OAuth providers from your account</li>
              <li>Note: blockchain data cannot be deleted once minted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">9. Children's Privacy</h2>
            <p>
              Our services are not directed to children under 13. We do not knowingly collect
              personal information from children under 13. If we discover such data has been
              collected, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">10. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this
              page with an updated date. Continued use of the service after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">11. Contact</h2>
            <p>
              For privacy questions or data requests, contact Grudge Studio through our Discord
              community or GitHub repository.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-stone-800 text-stone-600 text-xs text-center">
          <Link href="/tos" className="hover:text-stone-400">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link href="/auth" className="hover:text-stone-400">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
