/**
 * AI Service — Provider Chain
 *
 * Manages AI providers with fallback:
 *   1. Legion Hub (ai.grudge-studio.com) — Workers AI + VPS agents
 *   2. Grok (xAI) — direct API fallback
 *
 * Enable/disable providers via environment variables:
 *   LEGION_HUB_API_KEY — enables Legion Hub
 *   XAI_API_KEY        — enables Grok
 */

import type { AIProvider, GenerateOptions } from './providers/provider.interface';
import { LegionHubProvider } from './providers/legionHub';
import { GrokProvider } from './providers/grok';

class AIService {
  private providers: AIProvider[] = [];

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    // Legion Hub — primary (edge AI + VPS fallback built-in)
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
