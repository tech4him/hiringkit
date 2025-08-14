import pino, { type Logger } from 'pino';
import { isDevelopment } from '@/lib/config/env';

// Create the logger instance
const logger = pino({
  level: isDevelopment() ? 'debug' : 'info',
  
  // Use pretty printing in development
  ...(isDevelopment() && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Production configuration
  ...(!isDevelopment() && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),

  // Base fields for all logs
  base: {
    env: process.env.NODE_ENV,
    service: 'hiringkit-api',
  },
});

// Helper to create child logger with context
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

// Helper to log API requests
export function logRequest(req: Request, context?: Record<string, unknown>): Logger {
  const url = new URL(req.url);
  return createLogger({
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: req.headers.get('user-agent'),
    ...context,
  });
}

// Helper to log errors with stack traces
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, 'Error occurred');
}

// Helper to log security events
export function logSecurity(event: string, context?: Record<string, unknown>) {
  logger.warn({
    securityEvent: event,
    ...context,
  }, `Security event: ${event}`);
}

// Helper to log performance metrics
export function logPerformance(operation: string, duration: number, context?: Record<string, unknown>) {
  logger.info({
    performance: {
      operation,
      duration,
      unit: 'ms',
    },
    ...context,
  }, `Performance: ${operation} took ${duration}ms`);
}

// Helper to log webhook events
export function logWebhook(event: string, eventId: string, context?: Record<string, unknown>) {
  logger.info({
    webhook: {
      event,
      eventId,
    },
    ...context,
  }, `Webhook: ${event}`);
}

// Helper to log user actions
export function logUserAction(action: string, userId?: string, context?: Record<string, unknown>) {
  logger.info({
    userAction: {
      action,
      userId,
    },
    ...context,
  }, `User action: ${action}`);
}

// Helper to log admin actions
export function logAdminAction(action: string, adminEmail: string, context?: Record<string, unknown>) {
  logger.warn({
    adminAction: {
      action,
      adminEmail,
    },
    ...context,
  }, `Admin action: ${action}`);
}

// Default export
export default logger;