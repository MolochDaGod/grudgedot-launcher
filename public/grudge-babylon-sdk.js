/**
 * Grudge Babylon AI SDK
 *
 * Lightweight client for the Babylon AI Workers (Havok Scholar + Babylon Sage).
 * Drop into any editor, game page, or tool to get BabylonJS 9 + Havok expertise.
 *
 * Usage (script tag):
 *   <script src="/grudge-babylon-sdk.js"></script>
 *   <script>
 *     const answer = await BabylonAI.askHavok("How do I set up PhysicsCharacterController?");
 *   </script>
 *
 * Usage (ES module):
 *   import { BabylonAI } from './grudge-babylon-sdk.js';
 *   const answer = await BabylonAI.askSage("How does animation retargeting work?");
 *
 * Endpoints auto-resolve:
 *   - If running inside GDevelop Assistant → proxied via /api/gruda-legion/babylon/*
 *   - Otherwise → direct to Cloudflare Workers at babylon-ai-workers.grudge.workers.dev
 */

const WORKER_URL = 'https://babylon-ai-workers.grudge.workers.dev';
const PROXY_PREFIX = '/api/gruda-legion/babylon';

function resolveBase() {
  // If we're on the same origin as GDevelop Assistant, use the proxy
  if (typeof window !== 'undefined') {
    try {
      const host = window.location.hostname;
      if (host === 'localhost' || host.includes('gdevelop-assistant') || host.includes('grudge-studio')) {
        return PROXY_PREFIX;
      }
    } catch (_) { /* SSR or restricted context */ }
  }
  return WORKER_URL;
}

async function post(endpoint, body) {
  const base = resolveBase();
  const url = `${base}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`BabylonAI ${endpoint}: ${response.status} - ${text}`);
  }

  return response.json();
}

async function get(endpoint, params) {
  const base = resolveBase();
  const qs = new URLSearchParams(params).toString();
  const url = `${base}${endpoint}${qs ? '?' + qs : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BabylonAI ${endpoint}: ${response.status}`);
  }
  return response.json();
}

const BabylonAI = {
  /**
   * Ask the Havok Scholar — physics, character controllers, collision, constraints.
   * @param {string} question - Your question
   * @param {string} [code] - Optional code snippet for context
   * @returns {Promise<{answer: string, worker: string, source: string}>}
   */
  async askHavok(question, code) {
    return post('/havok', { question, context: 'grudge-studio', code });
  },

  /**
   * Ask the Babylon Sage — rendering, materials, animations, terrain, VFX.
   * @param {string} question - Your question
   * @param {string} [code] - Optional code snippet for context
   * @returns {Promise<{answer: string, worker: string, source: string}>}
   */
  async askSage(question, code) {
    return post('/sage', { question, context: 'grudge-studio', code });
  },

  /**
   * Auto-route: detects physics vs rendering and picks the right worker.
   * @param {string} question - Your question
   * @param {string} [code] - Optional code snippet
   * @returns {Promise<{answer: string, worker: string, source: string}>}
   */
  async ask(question, code) {
    const lower = question.toLowerCase();
    const physicsKeywords = [
      'havok', 'physics', 'collision', 'constraint', 'charactercontroller',
      'character controller', 'checksupport', 'calculatemovement', 'rigidbody',
      'gravity', 'jumpheight', 'capsule', 'physicsbody', 'physicsaggregate',
    ];
    const isPhysics = physicsKeywords.some(kw => lower.includes(kw));
    return isPhysics ? this.askHavok(question, code) : this.askSage(question, code);
  },

  /**
   * Semantic search across all ingested BabylonJS API docs.
   * @param {string} query - Search query
   * @param {string} [domain='all'] - Filter: 'physics', 'rendering', or 'all'
   * @returns {Promise<{query: string, results: Array}>}
   */
  async search(query, domain = 'all') {
    return get('/search', { q: query, domain });
  },

  /**
   * Ingest a new document into the knowledge base.
   * @param {{title: string, content: string, domain?: string, url?: string, category?: string}} doc
   * @returns {Promise<{success: boolean, docId: string}>}
   */
  async learn(doc) {
    return post('/learn', doc);
  },

  /**
   * Health check — are the workers alive?
   * @returns {Promise<{status: string, workers: string[]}>}
   */
  async health() {
    return get('/health', {});
  },

  /** Direct Cloudflare Worker URL (for reference / manual use) */
  WORKER_URL,
};

// Export for ES modules
export { BabylonAI };

// Attach to window for script-tag usage
if (typeof window !== 'undefined') {
  window.BabylonAI = BabylonAI;
}
