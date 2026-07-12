import { EventEmitter } from 'events';
import { aiService } from './ai';
import createLogger from '../lib/logger';
const aiLogger = createLogger('AIWorker');

/**
 * Types for frontend monitoring data
 */
export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface FrontendState {
  url: string;
  timestamp: number;
  userAgent: string;
  viewport: { width: number; height: number };
  performance?: {
    domContentLoaded?: number;
    loadComplete?: number;
    memoryUsage?: number;
  };
}

export interface WorkerMessage {
  type: 'console' | 'error' | 'state' | 'chat' | 'health';
  data: any;
  sessionId: string;
  timestamp: number;
}

export interface AIWorkerSession {
  id: string;
  startTime: number;
  lastActivity: number;
  logs: ConsoleLog[];
  states: FrontendState[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * AI Worker Service
 * 
 * Monitors frontend applications in real-time, collecting:
 * - Console logs and errors
 * - Performance metrics
 * - User interactions
 * - Application state
 * 
 * Provides AI-powered debugging and assistance using Grok API
 */
class AIWorkerService extends EventEmitter {
  private sessions: Map<string, AIWorkerSession> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_LOGS_PER_SESSION = 1000;
  private readonly HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    super();
    this.startHealthCheck();
  }

  /**
   * Initialize or get a session
   */
  getOrCreateSession(sessionId: string): AIWorkerSession {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        id: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        logs: [],
        states: [],
        conversationHistory: [],
      };
      this.sessions.set(sessionId, session);
      aiLogger.info({ sessionId }, 'New AI worker session created');
    }
    
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Handle incoming messages from frontend
   */
  async handleMessage(message: WorkerMessage): Promise<any> {
    const session = this.getOrCreateSession(message.sessionId);

    switch (message.type) {
      case 'console':
        return this.handleConsoleLog(session, message.data);
      
      case 'error':
        return this.handleError(session, message.data);
      
      case 'state':
        return this.handleStateUpdate(session, message.data);
      
      case 'chat':
        return this.handleChatMessage(session, message.data);
      
      case 'health':
        return this.handleHealthCheck(session);
      
      default:
        aiLogger.warn({ type: message.type }, 'Unknown message type');
        return { error: 'Unknown message type' };
    }
  }

  /**
   * Handle console logs from frontend
   */
  private handleConsoleLog(session: AIWorkerSession, log: ConsoleLog): void {
    session.logs.push(log);
    
    // Limit log size
    if (session.logs.length > this.MAX_LOGS_PER_SESSION) {
      session.logs = session.logs.slice(-this.MAX_LOGS_PER_SESSION);
    }

    // Auto-analyze errors
    if (log.level === 'error') {
      this.emit('error-detected', { session, log });
      // Optionally auto-analyze critical errors
      this.autoAnalyzeError(session, log).catch(err => {
        aiLogger.error({ err }, 'Failed to auto-analyze error');
      });
    }
  }

  /**
   * Handle errors from frontend
   */
  private async handleError(session: AIWorkerSession, error: ConsoleLog): Promise<any> {
    this.handleConsoleLog(session, { ...error, level: 'error' });
    
    // Provide immediate AI analysis for errors
    return this.analyzeError(session, error);
  }

  /**
   * Handle state updates from frontend
   */
  private handleStateUpdate(session: AIWorkerSession, state: FrontendState): void {
    session.states.push(state);
    
    // Keep only last 50 states
    if (session.states.length > 50) {
      session.states = session.states.slice(-50);
    }
  }

  /**
   * Handle chat messages from user
   */
  private async handleChatMessage(session: AIWorkerSession, message: { content: string }): Promise<any> {
    try {
      session.conversationHistory.push({
        role: 'user',
        content: message.content,
      });

      const context = this.buildContextForSession(session);
      const prompt = `${context}\n\nUser question: ${message.content}`;

      const response = await aiService.generateText(prompt, {
        provider: 'grok',
        systemPrompt: `You are an AI development assistant monitoring a live web application. 
You have access to console logs, errors, and application state. 
Provide helpful debugging advice, code suggestions, and explanations.
Be concise but thorough. If you see patterns in the errors, mention them.`,
        temperature: 0.7,
        maxTokens: 1000,
      });

      session.conversationHistory.push({
        role: 'assistant',
        content: response,
      });

      return { response, timestamp: Date.now() };
    } catch (error) {
      aiLogger.error({ err: error }, 'Failed to handle chat message');
      throw error;
    }
  }

  /**
   * Handle health check
   */
  private handleHealthCheck(session: AIWorkerSession): any {
    return {
      sessionId: session.id,
      uptime: Date.now() - session.startTime,
      logsCount: session.logs.length,
      errorsCount: session.logs.filter(l => l.level === 'error').length,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Auto-analyze errors (called every minute or on critical errors)
   */
  private async autoAnalyzeError(session: AIWorkerSession, log: ConsoleLog): Promise<void> {
    try {
      // Only analyze if we have enough context
      const recentErrors = session.logs
        .filter(l => l.level === 'error')
        .slice(-5);

      if (recentErrors.length < 2) return;

      const context = this.buildContextForSession(session);
      const prompt = `${context}\n\nAnalyze these errors and provide a brief summary of the issue and potential fixes.`;

      const analysis = await aiService.generateText(prompt, {
        provider: 'grok',
        systemPrompt: 'You are a debugging assistant. Analyze errors and provide concise insights.',
        temperature: 0.5,
        maxTokens: 500,
      });

      this.emit('auto-analysis', { session, analysis, log });
      aiLogger.info({ sessionId: session.id }, 'Auto-analysis completed');
    } catch (error) {
      aiLogger.error({ err: error }, 'Auto-analysis failed');
    }
  }

  /**
   * Analyze a specific error
   */
  private async analyzeError(session: AIWorkerSession, error: ConsoleLog): Promise<any> {
    try {
      const context = this.buildContextForSession(session);
      const errorDetails = `
Error: ${error.message}
Level: ${error.level}
Timestamp: ${new Date(error.timestamp).toISOString()}
${error.stack ? `Stack: ${error.stack}` : ''}
${error.metadata ? `Metadata: ${JSON.stringify(error.metadata)}` : ''}
      `.trim();

      const prompt = `${context}\n\n${errorDetails}\n\nAnalyze this error and suggest fixes.`;

      const analysis = await aiService.generateText(prompt, {
        provider: 'grok',
        systemPrompt: 'You are an expert debugger. Analyze the error and provide actionable solutions.',
        temperature: 0.5,
        maxTokens: 800,
      });

      return { analysis, timestamp: Date.now() };
    } catch (error) {
      aiLogger.error({ err: error }, 'Error analysis failed');
      throw error;
    }
  }

  /**
   * Build context string from session data
   */
  private buildContextForSession(session: AIWorkerSession): string {
    const recentLogs = session.logs.slice(-20);
    const recentState = session.states[session.states.length - 1];
    const errorCount = session.logs.filter(l => l.level === 'error').length;

    return `
Session Context:
- Session ID: ${session.id}
- Duration: ${Math.round((Date.now() - session.startTime) / 1000)}s
- Total Logs: ${session.logs.length}
- Total Errors: ${errorCount}
${recentState ? `- Current URL: ${recentState.url}` : ''}
${recentState?.viewport ? `- Viewport: ${recentState.viewport.width}x${recentState.viewport.height}` : ''}

Recent Console Logs (last 20):
${recentLogs.map(log => `[${log.level.toUpperCase()}] ${log.message}`).join('\n')}
    `.trim();
  }

  /**
   * Start periodic health check (runs every minute)
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all sessions
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => now - s.lastActivity < this.SESSION_TIMEOUT);

    // Clean up old sessions
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (now - session.lastActivity >= this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        aiLogger.info({ sessionId }, 'Session expired and removed');
      }
    }

    // Log health status
    aiLogger.info({
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
    }, 'Worker health check completed');

    this.emit('health-check', {
      timestamp: now,
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
    });
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): AIWorkerSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AIWorkerSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values())
      .filter(s => now - s.lastActivity < this.SESSION_TIMEOUT);
  }

  /**
   * Shutdown worker
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.sessions.clear();
    aiLogger.info('AI Worker service shut down');
  }
}

// Export singleton instance
export const aiWorker = new AIWorkerService();
