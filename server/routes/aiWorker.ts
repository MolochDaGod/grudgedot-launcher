import { Router, Request, Response } from 'express';
import { aiWorker } from '../services/aiWorker';
import createLogger from '../lib/logger';
const aiLogger = createLogger('AIWorkerRoute');

const router = Router();

/**
 * POST /api/ai-worker/message
 * Send a message to the AI worker (console logs, errors, state updates, chat)
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const message = req.body;

    if (!message.type || !message.sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: type, sessionId',
      });
    }

    const result = await aiWorker.handleMessage(message);
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to handle worker message');
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-worker/session/:sessionId
 * Get session data
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = aiWorker.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        logsCount: session.logs.length,
        errorsCount: session.logs.filter(l => l.level === 'error').length,
        statesCount: session.states.length,
        conversationLength: session.conversationHistory.length,
      },
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to get session');
    res.status(500).json({
      error: 'Failed to get session',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-worker/session/:sessionId/logs
 * Get session logs
 */
router.get('/session/:sessionId/logs', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { limit = '50', level } = req.query;
    const session = aiWorker.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
      });
    }

    let logs = session.logs;
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    const limitNum = parseInt(limit as string, 10);
    logs = logs.slice(-limitNum);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to get logs');
    res.status(500).json({
      error: 'Failed to get logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-worker/session/:sessionId/conversation
 * Get conversation history
 */
router.get('/session/:sessionId/conversation', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = aiWorker.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      data: session.conversationHistory,
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to get conversation');
    res.status(500).json({
      error: 'Failed to get conversation',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-worker/sessions
 * Get all active sessions
 */
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const sessions = aiWorker.getActiveSessions();
    
    const summaries = sessions.map(session => ({
      id: session.id,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      logsCount: session.logs.length,
      errorsCount: session.logs.filter(l => l.level === 'error').length,
    }));

    res.json({
      success: true,
      data: summaries,
      count: summaries.length,
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to get sessions');
    res.status(500).json({
      error: 'Failed to get sessions',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai-worker/chat
 * Send a chat message to the AI
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, message',
      });
    }

    const result = await aiWorker.handleMessage({
      type: 'chat',
      data: { content: message },
      sessionId,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    aiLogger.error({ err: error }, 'Failed to handle chat');
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message,
    });
  }
});

/**
 * GET /api/ai-worker/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const sessions = aiWorker.getActiveSessions();
  
  res.json({
    success: true,
    status: 'healthy',
    activeSessions: sessions.length,
    timestamp: Date.now(),
  });
});

export default router;
