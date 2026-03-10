import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import puterService, { type PuterUser } from '@/lib/puter';
import puterStorage from '@/lib/puterStorage';
import { PuterLoader } from '@/components/puter-loader';
import { getAuthData } from '@/lib/auth';
import { createGrudgeCloud } from '@/lib/grudge-cloud-impl';

interface PuterContextType {
  isReady: boolean;
  isLoading: boolean;
  isAvailable: boolean;
  error: string | null;
  isSignedIn: boolean;
  user: PuterUser | null;
  retry: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  set: (key: string, value: any, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom') => Promise<void>;
  get: <T = any>(key: string, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom') => Promise<T | null>;
  del: (key: string, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom') => Promise<void>;
  setCache: (key: string, value: any, ttlMs?: number) => Promise<void>;
  getCache: <T = any>(key: string) => Promise<T | null>;
  saveGame: (saveId: string, gameData: any) => Promise<void>;
  loadGame: <T = any>(saveId: string) => Promise<T | null>;
  listSaves: () => Promise<string[]>;
  deleteSave: (saveId: string) => Promise<void>;
  setSettings: (settings: Record<string, any>) => Promise<void>;
  getSettings: <T = Record<string, any>>() => Promise<T | null>;
  uploadFile: (path: string, content: Blob | File | string) => Promise<string>;
  downloadFile: (path: string) => Promise<Blob>;
  listFiles: (path?: string) => Promise<any[]>;
  deleteFile: (path: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const PuterContext = createContext<PuterContextType | null>(null);

export function PuterProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to cloud...');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<PuterUser | null>(null);

  const initPuter = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingMessage('Initializing Grudge Cloud...');
      await puterService.init();
      setIsAvailable(true);
      
      // Auth check wrapped in its own try/catch — Puter SDK calls
      // api.puter.com/whoami which returns 401 when not signed in.
      // This is expected and should not surface as an error.
      try {
        const signedIn = await puterService.isSignedIn();
        setIsSignedIn(signedIn);
        if (signedIn) {
          const userData = await puterService.getUser();
          setUser(userData);
          // Auto-initialize GRUDA directory tree on Puter cloud
          await initPuterStorageAndLink(userData);
        }
      } catch {
        // 401 from Puter API = not signed in, this is normal
        setIsSignedIn(false);
        setUser(null);
      }

      // Initialize GrudgeCloud singleton after SDK is ready
      try {
        const cloud = createGrudgeCloud();
        await cloud.init();
        window.GrudgeCloud = cloud;
        window.dispatchEvent(
          new CustomEvent('grudge-cloud-ready', { detail: cloud }),
        );
      } catch {
        // GrudgeCloud init is non-critical
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize cloud storage';
      console.warn('Puter unavailable, running in local-only mode:', errorMessage);
      setError(errorMessage);
      setIsAvailable(false);
    } finally {
      setIsReady(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    puterService.setLoadingCallback((loading, message) => {
      setIsLoading(loading);
      if (message) setLoadingMessage(message);
    });

    initPuter();
  }, [initPuter]);

  // Initialize Puter storage directories and link Puter UUID to Grudge account
  const initPuterStorageAndLink = useCallback(async (userData: PuterUser | null) => {
    if (userData) {
      try {
        await puterStorage.initializeDirectories();
      } catch (err) {
        console.warn('Failed to initialize Puter directories:', err);
      }
    }
    // Link Puter UUID to Grudge user if both are available
    if (userData?.uuid) {
      const authData = getAuthData();
      if (authData?.userId) {
        try {
          await fetch('/api/auth/link-puter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.token}`,
              'x-grudge-user-id': authData.userId,
            },
            body: JSON.stringify({
              puterUuid: userData.uuid,
              puterUsername: userData.username,
            }),
          });
        } catch {
          // Non-critical — linkage is also stored client-side
        }
      }
    }
  }, []);

  const retry = useCallback(async () => {
    await initPuter();
  }, [initPuter]);

  const signIn = useCallback(async () => {
    setLoadingMessage('Signing in...');
    const userData = await puterService.signIn();
    if (userData) {
      setUser(userData);
      setIsSignedIn(true);
      // Auto-initialize storage + link account after manual sign-in
      await initPuterStorageAndLink(userData);
    }
  }, [initPuterStorageAndLink]);

  const signOut = useCallback(async () => {
    setLoadingMessage('Signing out...');
    await puterService.signOut();
    setUser(null);
    setIsSignedIn(false);
  }, []);

  const set = useCallback(async (key: string, value: any, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom') => {
    await puterService.set(key, value, category);
  }, []);

  const get = useCallback(async <T = any,>(key: string, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom'): Promise<T | null> => {
    return await puterService.get<T>(key, category);
  }, []);

  const del = useCallback(async (key: string, category?: 'cache' | 'save' | 'settings' | 'session' | 'custom') => {
    await puterService.delete(key, category);
  }, []);

  const setCache = useCallback(async (key: string, value: any, ttlMs?: number) => {
    await puterService.setCache(key, value, ttlMs);
  }, []);

  const getCache = useCallback(async <T = any,>(key: string): Promise<T | null> => {
    return await puterService.getCache<T>(key);
  }, []);

  const saveGame = useCallback(async (saveId: string, gameData: any) => {
    setLoadingMessage('Saving game...');
    await puterService.saveGame(saveId, gameData);
  }, []);

  const loadGame = useCallback(async <T = any,>(saveId: string): Promise<T | null> => {
    setLoadingMessage('Loading save...');
    return await puterService.loadGame<T>(saveId);
  }, []);

  const listSaves = useCallback(async () => {
    return await puterService.listSaves();
  }, []);

  const deleteSave = useCallback(async (saveId: string) => {
    await puterService.deleteSave(saveId);
  }, []);

  const setSettings = useCallback(async (settings: Record<string, any>) => {
    await puterService.setSettings(settings);
  }, []);

  const getSettings = useCallback(async <T = Record<string, any>,>(): Promise<T | null> => {
    return await puterService.getSettings<T>();
  }, []);

  const uploadFile = useCallback(async (path: string, content: Blob | File | string) => {
    setLoadingMessage('Uploading file...');
    return await puterService.uploadFile(path, content);
  }, []);

  const downloadFile = useCallback(async (path: string) => {
    setLoadingMessage('Downloading file...');
    return await puterService.downloadFile(path);
  }, []);

  const listFiles = useCallback(async (path?: string) => {
    return await puterService.listFiles(path);
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    await puterService.deleteFile(path);
  }, []);

  const clearAllData = useCallback(async () => {
    setLoadingMessage('Clearing data...');
    await puterService.clearAllData();
  }, []);

  const value: PuterContextType = {
    isReady,
    isLoading,
    isAvailable,
    error,
    isSignedIn,
    user,
    retry,
    signIn,
    signOut,
    set,
    get,
    del,
    setCache,
    getCache,
    saveGame,
    loadGame,
    listSaves,
    deleteSave,
    setSettings,
    getSettings,
    uploadFile,
    downloadFile,
    listFiles,
    deleteFile,
    clearAllData
  };

  return (
    <PuterContext.Provider value={value}>
      <PuterLoader isLoading={isLoading} message={loadingMessage} />
      {children}
    </PuterContext.Provider>
  );
}

export function usePuter() {
  const context = useContext(PuterContext);
  if (!context) {
    throw new Error('usePuter must be used within a PuterProvider');
  }
  return context;
}

export default PuterContext;
