import winston from 'winston';

export type LogContext = Record<string, unknown> & {
  reqId?: string;
  userId?: string;
  route?: string;
};

// Safe error serialization - prevents stack trace leaks in production
export function safeError(err: unknown) {
  if (!err || typeof err !== 'object') return { message: String(err) };
  const e = err as Error;
  return {
    name: e.name,
    message: e.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : e.stack,
  };
}

// Redaction for sensitive data
function redact(obj: unknown): Record<string, unknown> {
  const SENSITIVE = ['authorization', 'password', 'token', 'apiKey', 'secret'];
  if (!obj || typeof obj !== 'object') return {};
  if (Array.isArray(obj)) {
    return obj.map(item => redact(item)) as unknown as Record<string, unknown>;
  }
  const copy: Record<string, unknown> = { ...obj as Record<string, unknown> };
  for (const k of Object.keys(copy)) {
    const v = copy[k];
    if (SENSITIVE.includes(k.toLowerCase())) {
      copy[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      copy[k] = redact(v);
    }
  }
  return copy;
}

// Winston format configuration
const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const entry = {
      ts: timestamp,
      level,
      msg: typeof message === 'string' ? message : JSON.stringify(message),
      env: process.env.NODE_ENV,
      service: 'hiringkit-api',
      ...meta,
    };
    return JSON.stringify(redact(entry));
  })
);

// Main logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: baseFormat,
  transports: [new winston.transports.Console()],
});

// Context helper for request-scoped logging
export function withContext(ctx: LogContext) {
  return {
    error: (msg: string, meta?: Record<string, unknown>) => logger.error(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
    warn:  (msg: string, meta?: Record<string, unknown>) => logger.warn(msg,  { ...ctx, ...(meta ? redact(meta) : {}) }),
    info:  (msg: string, meta?: Record<string, unknown>) => logger.info(msg,  { ...ctx, ...(meta ? redact(meta) : {}) }),
    debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
    http:  (msg: string, meta?: Record<string, unknown>) => logger.http ? logger.http(msg, { ...ctx, ...(meta ? redact(meta) : {}) }) : logger.info(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
  };
}

// PRESERVE EXISTING HELPER FUNCTIONS for backward compatibility

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export function logRequest(req: Request, context?: Record<string, unknown>) {
  const url = new URL(req.url);
  const requestContext = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: req.headers.get('user-agent'),
    ...context,
  };
  logger.info('API request', redact(requestContext));
  return logger.child(requestContext);
}

export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error('Error occurred', {
    error: safeError(error),
    ...redact(context || {}),
  });
}

export function logSecurity(event: string, context?: Record<string, unknown>) {
  logger.warn(`Security event: ${event}`, {
    securityEvent: event,
    ...redact(context || {}),
  });
}

export function logPerformance(operation: string, duration: number, context?: Record<string, unknown>) {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    performance: {
      operation,
      duration,
      unit: 'ms',
    },
    ...redact(context || {}),
  });
}

export function logWebhook(event: string, eventId: string, context?: Record<string, unknown>) {
  logger.info(`Webhook: ${event}`, {
    webhook: {
      event,
      eventId,
    },
    ...redact(context || {}),
  });
}

export function logUserAction(action: string, userId?: string, context?: Record<string, unknown>) {
  logger.info(`User action: ${action}`, {
    userAction: {
      action,
      userId,
    },
    ...redact(context || {}),
  });
}

export function logAdminAction(action: string, adminEmail: string, context?: Record<string, unknown>) {
  logger.warn(`Admin action: ${action}`, {
    adminAction: {
      action,
      adminEmail,
    },
    ...redact(context || {}),
  });
}

// Default export
export default logger;