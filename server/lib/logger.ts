/**
 * Simple structured logger for server-side AI services.
 * Supports both createLogger(context) factory (default export)
 * and named logger/aiLogger instances.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

function formatMeta(meta?: Record<string, any>): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return '';
  }
}

export function createLogger(context: string) {
  return {
    debug: (msgOrObj: any, ...args: any[]) => {
      if (process.env.NODE_ENV === 'production' && typeof msgOrObj !== 'string' && !args.length) {
        // still log debug in non-prod only when string form; keep parity with callers
      }
      const msg = typeof msgOrObj === 'string' ? msgOrObj : JSON.stringify(msgOrObj);
      if (process.env.NODE_ENV !== 'production' || args.length) {
        console.debug(formatMessage('debug', context, msg), ...args);
      }
    },
    info: (msgOrObj: any, ...args: any[]) => {
      if (typeof msgOrObj === 'string') {
        console.log(formatMessage('info', context, msgOrObj), ...args);
      } else if (typeof args[0] === 'string') {
        // pino-style: info({ meta }, 'message')
        console.log(formatMessage('info', context, args[0]) + formatMeta(msgOrObj));
      } else {
        console.log(formatMessage('info', context, JSON.stringify(msgOrObj)), ...args);
      }
    },
    warn: (msgOrObj: any, ...args: any[]) => {
      if (typeof msgOrObj === 'string') {
        console.warn(formatMessage('warn', context, msgOrObj), ...args);
      } else if (typeof args[0] === 'string') {
        console.warn(formatMessage('warn', context, args[0]) + formatMeta(msgOrObj));
      } else {
        console.warn(formatMessage('warn', context, JSON.stringify(msgOrObj)), ...args);
      }
    },
    error: (msgOrObj: any, ...args: any[]) => {
      if (typeof msgOrObj === 'string') {
        console.error(formatMessage('error', context, msgOrObj), ...args);
      } else if (typeof args[0] === 'string') {
        console.error(formatMessage('error', context, args[0]) + formatMeta(msgOrObj));
      } else {
        console.error(formatMessage('error', context, JSON.stringify(msgOrObj)), ...args);
      }
    },
  };
}

export const aiLogger = createLogger('ai');
export const logger = createLogger('server');
export default createLogger;
