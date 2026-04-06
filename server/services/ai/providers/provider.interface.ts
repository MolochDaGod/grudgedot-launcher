/**
 * AI Provider Interface
 *
 * All AI providers (Grok, LegionHub, etc.) implement this interface.
 * Used by the AI service to route requests through a fallback chain.
 */

export interface GenerateOptions {
  provider?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /** Agent role for role-specialized providers (e.g. 'dev', 'lore', 'art') */
  role?: string;
}

export interface AIProvider {
  name: string;

  /** Generate a text response from a prompt */
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;

  /** Generate a structured JSON response */
  generateJSON<T>(prompt: string, schema?: unknown): Promise<T>;

  /** Stream text tokens */
  streamText?(prompt: string, options?: GenerateOptions): AsyncIterableIterator<string>;
}
