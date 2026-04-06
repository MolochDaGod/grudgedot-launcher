/**
 * Simple structured logger for Grudge Studio server services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export function createLogger(context: string) {
  return {
    debug: (msgOrObj: any, ...args: any[]) => console.debug(formatMessage('debug', context, typeof msgOrObj === 'string' ? msgOrObj : JSON.stringify(msgOrObj)), ...args),
    info: (msgOrObj: any, ...args: any[]) => console.log(formatMessage('info', context, typeof msgOrObj === 'string' ? msgOrObj : JSON.stringify(msgOrObj)), ...args),
    warn: (msgOrObj: any, ...args: any[]) => console.warn(formatMessage('warn', context, typeof msgOrObj === 'string' ? msgOrObj : JSON.stringify(msgOrObj)), ...args),
    error: (msgOrObj: any, ...args: any[]) => console.error(formatMessage('error', context, typeof msgOrObj === 'string' ? msgOrObj : JSON.stringify(msgOrObj)), ...args),
  };
}

export default createLogger;
