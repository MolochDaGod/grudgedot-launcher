/**
 * AI Service — Provider Chain
 *
 * Manages AI providers with fallback:
 *   1. Puter AI (GRUDACHAIN account) — 500+ models free via paid Puter membership
 *   2. Legion Hub (ai.grudge-studio.com) — Workers AI + VPS agents
 *   3. Grok (xAI) — direct API fallback
 *
 * Enable/disable providers via environment variables:
 *   PUTER_API_KEY      — enables Puter AI (GRUDACHAIN account) — PRIMARY
 *   LEGION_HUB_API_KEY — enables Legion Hub
 *   XAI_API_KEY        — enables Grok
 */

import type { AIProvider, GenerateOptions } from './providers/provider.interface';
import { PuterAIProvider, PUTER_MODEL_MAP } from './providers/puterAI';
import { LegionHubProvider } from './providers/legionHub';
import { GrokProvider } from './providers/grok';

class AIService {
  private providers: AIProvider[] = [];

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    // Puter AI — PRIMARY (GRUDACHAIN paid membership, 500+ models, no API keys needed)
    // Set PUTER_API_KEY to the GRUDACHAIN Puter account API key from puter.com
    const puterKey = process.env.PUTER_API_KEY;
    if (puterKey) {
      this.providers.push(new PuterAIProvider({ apiKey: puterKey }));
      console.log('✅ AI provider: Puter AI (GRUDACHAIN account — 500+ models free)');
    } else {
      // Works without auth key for free-tier access too
      this.providers.push(new PuterAIProvider());
      console.log('✅ AI provider: Puter AI (unauthenticated free tier)');
    }

    // Legion Hub — secondary (edge AI + VPS fallback built-in)
    const legionKey = process.env.LEGION_HUB_API_KEY;
    if (legionKey) {
      this.providers.push(
        new LegionHubProvider({
          apiKey: legionKey,
          baseURL: process.env.LEGION_HUB_URL || 'https://ai.grudge-studio.com',
        })
      );
      console.log('✅ AI provider: Legion Hub (ai.grudge-studio.com)');
    }

    // Grok — fallback
    const xaiKey = process.env.XAI_API_KEY;
    if (xaiKey) {
      this.providers.push(
        new GrokProvider({ apiKey: xaiKey })
      );
      console.log('✅ AI provider: Grok (xAI)');
    }

    if (this.providers.length === 0) {
      console.warn('⚠️  No AI providers configured — set LEGION_HUB_API_KEY or XAI_API_KEY');
    }
  }

  /**
   * Generate text using the provider chain.
   * Tries each provider in order; returns the first successful result.
   */
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    // If a specific provider is requested, try it first
    const chain = this.getProviderChain(options?.provider);

    for (const provider of chain) {
      try {
        return await provider.generateText(prompt, options);
      } catch (err: any) {
        console.warn(`[ai] ${provider.name} failed: ${err.message}`);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  /**
   * Generate structured JSON using the provider chain.
   */
  async generateJSON<T>(prompt: string, schema?: unknown): Promise<T> {
    for (const provider of this.providers) {
      try {
        return await provider.generateJSON<T>(prompt, schema);
      } catch (err: any) {
        console.warn(`[ai] ${provider.name} JSON failed: ${err.message}`);
        continue;
      }
    }

    throw new Error('All AI providers failed for JSON generation');
  }

  /**
   * Get provider status for diagnostics.
   */
  getStatus() {
    return this.providers.map(p => ({
      name: p.name,
      available: true,
    }));
  }

  /** GRD-17 core → Puter AI model map */
  getPuterModelMap(): Record<string, string> {
    return { ...PUTER_MODEL_MAP };
  }

  private getProviderChain(preferProvider?: string): AIProvider[] {
    if (!preferProvider) return [...this.providers];

    const preferred = this.providers.find(p => p.name === preferProvider);
    if (preferred) {
      return [preferred, ...this.providers.filter(p => p.name !== preferProvider)];
    }
    return [...this.providers];
  }
}

// Export singleton
export const aiService = new AIService();
