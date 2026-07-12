import type { AIProvider, GenerateOptions } from './provider.interface';
import createLogger from '../../../lib/logger';
const aiLogger = createLogger('Grok');

interface GrokConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}

/**
 * Rate limiter for Grok API (5 requests per minute)
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 5;
  private readonly windowMs: number = 60000; // 1 minute

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Remove requests older than the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      aiLogger.info({ waitTime }, 'Rate limit reached, waiting...');
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }
}

/**
 * Grok AI Provider for X.AI's Grok API
 * 
 * Features:
 * - Built-in rate limiting (5 requests per minute)
 * - Support for grok-4-latest and other models
 * - Streaming and non-streaming responses
 */
export class GrokProvider implements AIProvider {
  name = 'grok';
  private config: GrokConfig;
  private rateLimiter = new RateLimiter();

  constructor(config: GrokConfig) {
    this.config = {
      baseURL: 'https://api.x.ai/v1',
      defaultModel: 'grok-4-latest',
      ...config,
    };
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    stream: boolean = false
  ): Promise<Response> {
    await this.rateLimiter.waitForSlot();

    const url = `${this.config.baseURL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      aiLogger.error({ status: response.status, error }, 'Grok API error');
      throw new Error(`Grok API error: ${response.status} - ${error}`);
    }

    return response;
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: options?.systemPrompt || 'You are a helpful AI assistant monitoring and debugging applications.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const body = {
      messages,
      model: options?.model || this.config.defaultModel,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: false,
    };

    const response = await this.makeRequest('/chat/completions', body);
    const data = await response.json();

    return data.choices?.[0]?.message?.content || '';
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
      return JSON.parse(text) as T;
    } catch (error) {
      aiLogger.error({ error, text }, 'Failed to parse JSON from Grok');
      throw new Error('Invalid JSON response from Grok');
    }
  }

  async *streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncIterableIterator<string> {
    const messages = [
      {
        role: 'system',
        content: options?.systemPrompt || 'You are a helpful AI assistant.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const body = {
      messages,
      model: options?.model || this.config.defaultModel,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    };

    const response = await this.makeRequest('/chat/completions', body, true);
    
    if (!response.body) {
      throw new Error('No response body from Grok API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
