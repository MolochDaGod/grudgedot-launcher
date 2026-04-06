/**
 * Puter AI Provider — GRUDGE STUDIO
 *
 * Server-side Puter AI integration using @heyputer/puter.js (Node.js).
 * Runs as the GRUDACHAIN account — all AI costs covered by the paid Puter membership.
 *
 * "User-Pays" model: GRUDACHAIN's Puter account funds 500+ AI models with no API keys.
 * Supports: GPT-5.x, Claude, Gemini, DeepSeek, Grok, Llama, and 490+ more.
 *
 * Set PUTER_API_KEY in env to authenticate as the GRUDACHAIN server account.
 * Without an API key it still works for unauthenticated free-tier calls.
 *
 * Env vars:
 *   PUTER_API_KEY   — GRUDACHAIN Puter account API key (from puter.com account settings)
 *   PUTER_BASE_URL  — override Puter API base (default: https://api.puter.com)
 */

import type { AIProvider, GenerateOptions } from './provider.interface';

// ── GRD-17 Core → Puter model map (mirrors puter-ai-legion.ts) ───────────────

export const PUTER_MODEL_MAP: Record<string, string> = {
  grd17:            'claude-sonnet-4-5',
  grd27:            'gpt-5.2',
  dangrd:           'gpt-5.4',
  grdviz:           'gpt-5.4-nano',
  norightanswergrd: 'deepseek/deepseek-r1',
  grdsprint:        'gpt-5-nano',
  aleofthought:     'claude-sonnet-4-5',
  ale:              'gpt-5-nano',
  aleboss:          'gpt-5.2-chat',
  // Generic fallbacks
  auto:             'claude-sonnet-4-5',
  default:          'gpt-5-nano',
};

// ── System prompts per GRD-17 core ───────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  grd17: 'You are GRD1.7, the System Core of the GRUDA AI Legion (GRUDGE STUDIO). Precise, structured, production-quality.',
  grd27: 'You are GRD2.7, the Deep Logic Core of the GRUDA AI Legion. Think step-by-step from first principles.',
  dangrd: 'You are DANGRD, the Chaos Engineer of the GRUDA AI Legion. Bold, creative, unconventional. Break patterns.',
  grdviz: 'You are GRDVIZ, the Visual Core of the GRUDA AI Legion. Aesthetic, precise, design-driven.',
  norightanswergrd: 'You are NoRightAnswerGRD, the Paradox Core. Explore multiple perspectives. Thrive in ambiguity.',
  grdsprint: 'You are GRDSPRINT, the Speed Core. Fast, efficient, minimal. Every word counts.',
  aleofthought: 'You are ALEofThought, the Reasoning Chain Core. Show your full reasoning chain before conclusions.',
  ale: 'You are ALE, the Rapid Response Core. Direct, urgent, decisive. No fluff.',
  aleboss: 'You are ALEBOSS, the Boss-Level Coordinator. Strategic, commanding, big-picture oversight.',
};

// ── Puter AI Provider ─────────────────────────────────────────────────────────

interface PuterAIConfig {
  apiKey?: string;
  baseURL?: string;
}

export class PuterAIProvider implements AIProvider {
  name = 'puter-ai';
  private config: PuterAIConfig;
  private puterClient: any = null;

  constructor(config: PuterAIConfig = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.PUTER_BASE_URL || 'https://api.puter.com',
      // PUTER_AUTH_TOKEN is the canonical env var (matches puter.js Node.js docs)
      // Fallback to PUTER_API_KEY for backwards compatibility
      apiKey: config.apiKey || process.env.PUTER_AUTH_TOKEN || process.env.PUTER_API_KEY,
    };
    this.initClient();
  }

  private initClient() {
    try {
      // @heyputer/puter.js Node.js SDK: use init() from init.cjs
      // Authenticate as the GRUDACHAIN server account via PUTER_AUTH_TOKEN
      const { init } = require('@heyputer/puter.js/src/init.cjs');
      this.puterClient = init(this.config.apiKey || undefined);
      if (this.config.apiKey) {
        console.log('[puter-ai] Initialized with GRUDACHAIN auth token');
      } else {
        console.log('[puter-ai] Initialized without auth token (free tier — set PUTER_AUTH_TOKEN for GRUDACHAIN account)');
      }
    } catch (err: any) {
      console.warn('[puter-ai] @heyputer/puter.js not available:', err.message);
    }
  }

  private resolveModel(options?: GenerateOptions): string {
    if (!options?.model) return PUTER_MODEL_MAP.grd17;
    // If model is a GRD-17 core ID, map it
    return PUTER_MODEL_MAP[options.model] ?? options.model;
  }

  private resolveSystemPrompt(options?: GenerateOptions): string | undefined {
    const coreId = options?.model;
    if (coreId && SYSTEM_PROMPTS[coreId]) return SYSTEM_PROMPTS[coreId];
    return options?.systemPrompt;
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.puterClient) throw new Error('Puter AI client not initialized');

    const model = this.resolveModel(options);
    const systemPrompt = this.resolveSystemPrompt(options);

    const messages = systemPrompt
      ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ]
      : prompt;

    const response = await this.puterClient.ai.chat(messages, {
      model,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    });

    // Normalize response — Puter returns different shapes per provider
    const content = response?.message?.content ?? response;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return (content as Array<{ text?: string; value?: string }>)
        .map(c => c.text ?? c.value ?? '')
        .join('');
    }
    return String(content ?? '');
  }

  async generateJSON<T>(prompt: string, schema?: unknown): Promise<T> {
    const systemPrompt = schema
      ? `You are a helpful assistant. Always respond with valid JSON matching this schema: ${JSON.stringify(schema)}`
      : 'You are a helpful assistant. Always respond with valid JSON.';

    const text = await this.generateText(prompt, {
      systemPrompt,
      temperature: 0,
      model: 'grd17', // Use structured/reliable core for JSON
    });

    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();
    const start = jsonText.indexOf('{') !== -1 ? jsonText.indexOf('{') : jsonText.indexOf('[');
    const end = jsonText.lastIndexOf('}') !== -1 ? jsonText.lastIndexOf('}') + 1 : jsonText.lastIndexOf(']') + 1;
    if (start !== -1 && end > start) jsonText = jsonText.substring(start, end);

    return JSON.parse(jsonText) as T;
  }

  /** List all available Puter AI models */
  async listModels(): Promise<Array<{ id: string; provider: string; name?: string }>> {
    if (!this.puterClient) return [];
    try {
      return await this.puterClient.ai.listModels();
    } catch {
      return [];
    }
  }

  /** Get the model map for all GRD-17 cores */
  getCoreModelMap(): Record<string, string> {
    return { ...PUTER_MODEL_MAP };
  }
}
