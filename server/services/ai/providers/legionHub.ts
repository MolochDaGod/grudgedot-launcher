import type { AIProvider, GenerateOptions } from './provider.interface';
import createLogger from '../../../lib/logger';
const aiLogger = createLogger('LegionHub');

interface LegionHubConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * GRUDA Legion Hub AI Provider
 *
 * Calls the centralized AI hub at ai.grudge-studio.com.
 * Supports role-based routing (dev, lore, art, balance, etc.)
 * and automatic Workers AI → VPS fallback on the server side.
 */
export class LegionHubProvider implements AIProvider {
  name = 'legion-hub';
  private config: LegionHubConfig;

  constructor(config: LegionHubConfig) {
    this.config = {
      baseURL: 'https://ai.grudge-studio.com',
      ...config,
    };
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<any> {
    const url = `${this.config.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      aiLogger.error({ status: response.status, error: errorText, endpoint }, 'Legion Hub API error');
      throw new Error(`Legion Hub error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const role = options?.role || 'general';
    const endpoint = role === 'general' ? '/v1/chat' : `/v1/agents/${role}/chat`;

    const body = {
      message: prompt,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 1024,
      model: options?.model,
    };

    // If a system prompt is provided, use the messages format
    if (options?.systemPrompt) {
      (body as any).messages = [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: prompt },
      ];
      delete (body as any).message;
    }

    const data = await this.makeRequest(endpoint, body);
    return data.response || '';
  }

  async generateJSON<T>(prompt: string, schema?: unknown): Promise<T> {
    const systemPrompt = schema
      ? `You are a helpful assistant. Always respond with valid JSON matching this schema: ${JSON.stringify(schema)}`
      : 'You are a helpful assistant. Always respond with valid JSON.';

    const text = await this.generateText(prompt, {
      systemPrompt,
      temperature: 0,
    });

    try {
      // Extract JSON from potential markdown code blocks
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonText = jsonMatch[1].trim();

      const start = jsonText.indexOf('{') !== -1 ? jsonText.indexOf('{') : jsonText.indexOf('[');
      const end = jsonText.lastIndexOf('}') !== -1 ? jsonText.lastIndexOf('}') + 1 : jsonText.lastIndexOf(']') + 1;
      if (start !== -1 && end > start) {
        jsonText = jsonText.substring(start, end);
      }

      return JSON.parse(jsonText) as T;
    } catch (error) {
      aiLogger.error({ error, text }, 'Failed to parse JSON from Legion Hub');
      throw new Error('Invalid JSON response from Legion Hub');
    }
  }
}
