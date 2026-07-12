import puterStorage from "./puterStorage";

export type PuterUser = {
  username: string;
  email?: string;
  uuid?: string;
};

export type StorageCategory =
  | "cache"
  | "save"
  | "settings"
  | "session"
  | "custom";

const PUTER_CDN = "https://js.puter.com/v2/";
const STORAGE_PREFIX = "grudge_";

class PuterService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private loadingCallback:
    | ((loading: boolean, message?: string) => void)
    | null = null;

  setLoadingCallback(callback: (loading: boolean, message?: string) => void) {
    this.loadingCallback = callback;
  }

  private showLoading(message?: string) {
    this.loadingCallback?.(true, message);
  }

  private hideLoading() {
    this.loadingCallback?.(false);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.showLoading("Initializing Grudge Cloud...");

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.puter) {
        this.initialized = true;
        this.hideLoading();
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = PUTER_CDN;
      script.async = true;

      script.onload = () => {
        this.initialized = true;
        this.hideLoading();
        resolve();
      };

      script.onerror = () => {
        this.initPromise = null;
        this.hideLoading();
        reject(new Error("Failed to load Puter.js"));
      };

      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  isReady(): boolean {
    return this.initialized && puterStorage.isAvailable;
  }

  async ensureReady(): Promise<void> {
    if (!this.isReady()) {
      await this.init();
    }
  }

  async isSignedIn(): Promise<boolean> {
    await this.ensureReady();
    return puterStorage.isSignedIn();
  }

  async signIn(): Promise<PuterUser | null> {
    await this.ensureReady();
    this.showLoading("Signing in...");
    try {
      await puterStorage.signIn();
      const user = await puterStorage.getUser();
      return user as PuterUser | null;
    } finally {
      this.hideLoading();
    }
  }

  async signOut(): Promise<void> {
    await this.ensureReady();
    this.showLoading("Signing out...");
    try {
      await puterStorage.signOut();
    } finally {
      this.hideLoading();
    }
  }

  async getUser(): Promise<PuterUser | null> {
    if (!this.isReady()) return null;
    const user = await puterStorage.getUser();
    return user as PuterUser | null;
  }

  private prefixKey(key: string, category: string): string {
    return `${STORAGE_PREFIX}${category}_${key}`;
  }

  async set(
    key: string,
    value: any,
    category: StorageCategory = "custom",
  ): Promise<void> {
    await this.ensureReady();
    const prefixedKey = this.prefixKey(key, category);
    const data = JSON.stringify({ value, timestamp: Date.now() });
    await window.puter.kv.set(prefixedKey, data);
  }

  async get<T = any>(
    key: string,
    category: StorageCategory = "custom",
  ): Promise<T | null> {
    await this.ensureReady();
    try {
      const prefixedKey = this.prefixKey(key, category);
      const data = await window.puter.kv.get(prefixedKey);
      if (!data) return null;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return parsed?.value ?? null;
    } catch {
      return null;
    }
  }

  async delete(
    key: string,
    category: StorageCategory = "custom",
  ): Promise<void> {
    await this.ensureReady();
    const prefixedKey = this.prefixKey(key, category);
    await window.puter.kv.del(prefixedKey);
  }

  async setCache(key: string, value: any, ttlMs?: number): Promise<void> {
    const data = { value, expires: ttlMs ? Date.now() + ttlMs : null };
    await this.set(key, data, "cache");
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const data = await this.get<{ value: T; expires: number | null }>(
      key,
      "cache",
    );
    if (!data) return null;
    if (data.expires && Date.now() > data.expires) {
      await this.delete(key, "cache");
      return null;
    }
    return data.value;
  }

  async saveGame(saveId: string, gameData: any): Promise<void> {
    this.showLoading("Saving game...");
    try {
      await this.set(saveId, gameData, "save");
    } finally {
      this.hideLoading();
    }
  }

  async loadGame<T = any>(saveId: string): Promise<T | null> {
    this.showLoading("Loading save...");
    try {
      return await this.get<T>(saveId, "save");
    } finally {
      this.hideLoading();
    }
  }

  async listSaves(): Promise<string[]> {
    await this.ensureReady();
    const allKeys = await window.puter.kv.list(`${STORAGE_PREFIX}save_*`);
    const savePrefix = `${STORAGE_PREFIX}save_`;
    return allKeys
      .filter((key: string) => key.startsWith(savePrefix))
      .map((key: string) => key.replace(savePrefix, ""));
  }

  async deleteSave(saveId: string): Promise<void> {
    await this.delete(saveId, "save");
  }

  async setSettings(settings: Record<string, any>): Promise<void> {
    await this.set("user_settings", settings, "settings");
  }

  async getSettings<T = Record<string, any>>(): Promise<T | null> {
    return await this.get<T>("user_settings", "settings");
  }

  async setSession(key: string, value: any): Promise<void> {
    await this.set(key, value, "session");
  }

  async getSession<T = any>(key: string): Promise<T | null> {
    return await this.get<T>(key, "session");
  }

  async clearSession(): Promise<void> {
    await this.ensureReady();
    const allKeys = await window.puter.kv.list(`${STORAGE_PREFIX}session_*`);
    for (const key of allKeys) {
      await window.puter.kv.del(key);
    }
  }

  async uploadFile(
    path: string,
    content: Blob | File | string,
  ): Promise<string> {
    await this.ensureReady();
    this.showLoading("Uploading file...");
    try {
      const result = await window.puter.fs.write(path, content, {
        createMissingParents: true,
      });
      return result.path;
    } finally {
      this.hideLoading();
    }
  }

  async downloadFile(path: string): Promise<Blob> {
    await this.ensureReady();
    this.showLoading("Downloading file...");
    try {
      return await puterStorage.readFile(path);
    } finally {
      this.hideLoading();
    }
  }

  async listFiles(path: string = ""): Promise<any[]> {
    await this.ensureReady();
    return await puterStorage.listFiles(path);
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureReady();
    await puterStorage.deleteFile(path);
  }

  async createFolder(path: string): Promise<void> {
    await this.ensureReady();
    await window.puter.fs.mkdir(path, { createMissingParents: true });
  }

  async clearAllData(): Promise<void> {
    await this.ensureReady();
    this.showLoading("Clearing data...");
    try {
      const allKeys = await window.puter.kv.list(`${STORAGE_PREFIX}*`);
      for (const key of allKeys) {
        await window.puter.kv.del(key);
      }
    } finally {
      this.hideLoading();
    }
  }

  getStorage() {
    return puterStorage;
  }
}

export const puterService = new PuterService();
export default puterService;

// Convenience check used by engine components
export const isPuterAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter;
};

// ============================================
// Engine AI Integration (used by engine editor)
// ============================================

export const PUTER_AI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_5_NANO: 'gpt-5-nano',
  O1: 'o1',
  O3_MINI: 'o3-mini',
  GEMINI_2_FLASH: 'gemini-2.0-flash',
  GEMINI_1_5_PRO: 'gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash',
  CLAUDE_3_7_SONNET: 'claude-3-7-sonnet',
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet',
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_HAIKU: 'claude-3-haiku',
  DEEPSEEK_CHAT: 'deepseek-chat',
  GROK_2: 'grok-2',
  DALLE_3: 'dall-e-3',
  FLUX: 'flux',
  GPT_IMAGE: 'gpt-image',
} as const;

export const aiChat = async (prompt: string, model?: string): Promise<string> => {
  if (!isPuterAvailable()) throw new Error('Puter.js is not available');
  const response = await window.puter!.ai.chat(prompt, { model: model || 'gpt-4o' });
  if (typeof response === 'string') return response;
  if ((response as any)?.message?.content) return (response as any).message.content;
  return String(response);
};

export const aiChatUniversal = async (prompt: string, model: string = PUTER_AI_MODELS.GEMINI_2_FLASH): Promise<string> => {
  if (!isPuterAvailable()) throw new Error('Puter.js is not available');
  const response = await window.puter!.ai.chat(prompt, { model });
  if (typeof response === 'string') return response;
  if ((response as any)?.message?.content) return (response as any).message.content;
  return String(response);
};

export const aiChatStream = async (
  prompt: string,
  onChunk: (text: string) => void,
  options?: { model?: string }
): Promise<void> => {
  if (!isPuterAvailable()) throw new Error('Puter.js is not available');
  const response = await window.puter!.ai.chat(prompt, {
    model: options?.model || 'gpt-4o',
    stream: true
  });
  if (response && typeof (response as any)[Symbol.asyncIterator] === 'function') {
    for await (const chunk of response as any) {
      if (chunk?.text) onChunk(chunk.text);
    }
  } else if (typeof response === 'string') {
    onChunk(response);
  }
};

export const generateImage = async (prompt: string, options?: { model?: string }): Promise<HTMLImageElement | null> => {
  if (!isPuterAvailable()) return null;
  try {
    return await (window.puter!.ai as any).txt2img(prompt, { model: options?.model || 'dall-e-3' });
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
};

export const textToSpeech = async (text: string, options?: { voice?: string }): Promise<HTMLAudioElement | null> => {
  if (!isPuterAvailable()) return null;
  try {
    return await (window.puter!.ai as any).txt2speech(text, { voice: options?.voice || 'alloy' });
  } catch (error) {
    console.error('Text-to-speech failed:', error);
    return null;
  }
};

export const showOpenFilePicker = async (): Promise<{ data: Blob; path: string; name: string } | null> => {
  if (!isPuterAvailable()) return null;
  try {
    const result = await (window.puter as any).ui.showOpenFilePicker();
    const file = Array.isArray(result) ? result[0] : result;
    if (!file) return null;
    const data = typeof file.content === 'function'
      ? await file.content()
      : (typeof file.read === 'function' ? await file.read() : null);
    if (!data) return null;
    return { data, path: file.path || '', name: file.name || '' };
  } catch (error) {
    console.error('File picker failed:', error);
    return null;
  }
};

export const showSaveFilePicker = async (content: string | Blob, filename: string): Promise<{ path: string } | null> => {
  if (!isPuterAvailable()) return null;
  try {
    const result = await (window.puter as any).ui.showSaveFilePicker(content, filename);
    return { path: result?.path || result?.name || filename };
  } catch (error) {
    console.error('Save file picker failed:', error);
    return null;
  }
};
