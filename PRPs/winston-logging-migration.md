name: "Winston Logging Migration - Replace Pino to Fix Worker Threads Issues"
description: |

## Purpose
Replace Pino with Winston for server-side logging to eliminate worker_threads requirements and ensure full compatibility with Vercel and other serverless Node.js environments while maintaining existing logging functionality.

## Core Principles
1. **Context is King**: Preserve existing logging patterns and helper functions
2. **Validation Loops**: Provide executable tests to ensure migration success
3. **Information Dense**: Use proven Winston patterns for serverless
4. **Progressive Success**: Migrate incrementally with validation at each step
5. **Global rules**: Follow all rules in CLAUDE.md

---

## Goal
Replace the current Pino-based logging system with Winston to eliminate worker_threads dependencies that cause deployment issues on Vercel and other serverless platforms, while maintaining all existing logging functionality and improving structured logging capabilities.

## Why
- **Business Critical**: Current Pino logger causes worker_threads errors preventing proper logging in production
- **Evidence**: Already commented out in `/app/api/stripe/webhook/route.ts:25` and `/lib/auth/middleware.ts:5` with "worker_threads issues" notes
- **Serverless Compatibility**: Winston works reliably without worker_threads on Vercel/Serverless
- **Enhanced Features**: Better JSON structured logging and redaction capabilities

## What
A drop-in Winston replacement that:
- Maintains existing helper function signatures (`logRequest`, `logError`, `logSecurity`, etc.)
- Adds safe error serialization with sensitive data redaction
- Provides context helpers for request/user tracking
- Uses only console transport (no files) for serverless compatibility
- Supports environment-based log level configuration

### Success Criteria
- [ ] Winston logger replaces Pino without breaking existing API routes
- [ ] All helper functions maintain backward compatibility
- [ ] Structured JSON logging with sensitive data redaction works
- [ ] Context helpers provide request/user correlation
- [ ] No worker_threads errors in serverless environments
- [ ] Performance comparable or better than current Pino setup

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://github.com/winstonjs/winston
  why: Official Winston documentation for configuration and transports
  
- url: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-winston-and-morgan-to-log-node-js-applications/
  why: Winston best practices for Node.js applications
  
- url: https://www.dash0.com/guides/winston-production-logging-nodejs
  why: Production logging patterns and serverless optimization

- file: /home/lucast/projects/hiringkit/lib/logger/index.ts
  why: Current Pino implementation patterns to preserve
  
- file: /home/lucast/projects/hiringkit/lib/config/env.ts
  why: Environment configuration patterns and isDevelopment() helper
  
- file: /home/lucast/projects/hiringkit/app/api/stripe/webhook/route.ts
  why: Example of worker_threads issue and Node.js runtime configuration
  
- file: /home/lucast/projects/hiringkit/0.2.2-winston-logging.md
  why: Complete feature specification with implementation example
```

### Current Codebase Structure
```bash
hiringkit/
├── lib/
│   ├── logger/
│   │   └── index.ts          # Current Pino logger to be replaced
│   ├── config/
│   │   └── env.ts            # Environment config with isDevelopment()
│   └── ...
├── app/api/                  # API routes using Node.js runtime
│   ├── stripe/webhook/route.ts    # Has commented logger import
│   ├── admin/kits/[id]/approve/route.ts
│   └── ...
├── components/               # Frontend components
├── package.json             # Contains pino@9.9.0 and pino-pretty@13.1.1
└── ...
```

### Desired Codebase Structure
```bash
hiringkit/
├── lib/
│   ├── logger/
│   │   └── index.ts          # New Winston logger with same API surface
│   └── ...
├── package.json             # Replace pino with winston
└── ...
```

### Known Gotchas & Current Patterns
```typescript
// CRITICAL: Current logger usage patterns in codebase
// 1. Helper functions: logRequest(), logError(), logSecurity(), logPerformance(), 
//    logWebhook(), logUserAction(), logAdminAction()
// 2. Child logger creation: createLogger(context)
// 3. Environment-based configuration using isDevelopment()
// 4. Base fields injection: { env: process.env.NODE_ENV, service: 'hiringkit-api' }

// CRITICAL: Node.js runtime configuration in API routes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CRITICAL: Current issue evidence
// File: app/api/stripe/webhook/route.ts:25
// "// Removed logger import to prevent worker_threads error"
// File: lib/auth/middleware.ts:5
// "// Removed logger import to prevent worker_threads issues"

// CRITICAL: Winston requirements for serverless
// - Console transport only (no file transports)
// - JSON format for structured logging
// - Environment-based log levels
// - No worker_threads dependency
```

## Implementation Blueprint

### Package Dependencies
Update package.json to replace Pino with Winston:
```json
{
  "dependencies": {
    "winston": "^3.11.0"
  }
}
```
Remove: `"pino": "^9.9.0"` and `"pino-pretty": "^13.1.1"`

### Task List - Complete Implementation Order

```yaml
Task 1 - Install Winston and Remove Pino:
MODIFY package.json:
  - REMOVE: "pino": "^9.9.0" 
  - REMOVE: "pino-pretty": "^13.1.1"
  - ADD: "winston": "^3.11.0"
RUN: npm install

Task 2 - Implement Winston Logger:
REPLACE lib/logger/index.ts:
  - PRESERVE: All existing helper function signatures
  - PRESERVE: Environment configuration integration
  - REPLACE: Pino with Winston implementation
  - ADD: Safe error serialization with redaction
  - ADD: Context helpers (withContext function)
  - KEEP: TypeScript types and exports

Task 3 - Re-enable Logger Imports:
MODIFY app/api/stripe/webhook/route.ts:
  - UNCOMMENT: Logger import on line 25
  - ADD: Proper logging statements for webhook events

MODIFY lib/auth/middleware.ts:
  - UNCOMMENT: Logger import on line 5
  - REPLACE: console.warn with proper logger calls

Task 4 - Validation and Testing:
RUN: npm run lint (fix any issues)
RUN: npm run build (ensure no build errors)
TEST: Manual verification of logging in development
TEST: Deploy test to verify no worker_threads errors
```

### Detailed Implementation - Winston Logger

Based on the feature specification, implement this exact Winston configuration:

```typescript
// lib/logger/index.ts - New Winston Implementation
import winston from 'winston';
import { isDevelopment } from '@/lib/config/env';

export type LogContext = Record<string, unknown> & {
  reqId?: string;
  userId?: string;
  route?: string;
};

// Safe error serialization - prevents stack trace leaks in production
export function safeError(err: unknown) {
  if (!err || typeof err !== 'object') return { message: String(err) };
  const e = err as any;
  return {
    name: e.name,
    message: e.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : e.stack,
  };
}

// Redaction for sensitive data
function redact(obj: any): any {
  const SENSITIVE = ['authorization', 'password', 'token', 'apiKey', 'secret'];
  if (!obj || typeof obj !== 'object') return obj;
  const copy: Record<string, unknown> = Array.isArray(obj) ? [...obj] as any : { ...obj };
  for (const k of Object.keys(copy)) {
    const v = (copy as any)[k];
    if (SENSITIVE.includes(k.toLowerCase())) {
      (copy as any)[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      (copy as any)[k] = redact(v);
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
    error: (msg: string, meta?: any) => logger.error(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
    warn:  (msg: string, meta?: any) => logger.warn(msg,  { ...ctx, ...(meta ? redact(meta) : {}) }),
    info:  (msg: string, meta?: any) => logger.info(msg,  { ...ctx, ...(meta ? redact(meta) : {}) }),
    debug: (msg: string, meta?: any) => logger.debug(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
    http:  (msg: string, meta?: any) => logger.http ? (logger as any).http(msg, { ...ctx, ...(meta ? redact(meta) : {}) }) : logger.info(msg, { ...ctx, ...(meta ? redact(meta) : {}) }),
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
```

### Integration Points
```yaml
PACKAGE_DEPENDENCIES:
  - remove: pino, pino-pretty
  - add: winston@^3.11.0
  
API_ROUTES:
  - restore: logger imports in webhook and middleware files
  - pattern: "import { withContext, safeError } from '@/lib/logger';"
  
ENVIRONMENT:
  - support: LOG_LEVEL environment variable
  - default: info in production, debug in development
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Install dependencies first
npm install

# Run these FIRST - fix any errors before proceeding
npm run lint                 # Next.js linting
npx tsc --noEmit             # TypeScript compilation check

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Build Verification
```bash
# Ensure the application builds successfully
npm run build

# Expected: Successful build with no errors
# If failing: Check for import/export issues, missing dependencies
```

### Level 3: Development Testing
```bash
# Start development server
npm run dev

# Test logging in development:
# 1. Visit any API route (e.g., /api/test-pdf)
# 2. Check console for structured JSON logs
# 3. Verify sensitive data is redacted
# 4. Ensure no worker_threads errors

# Test specific routes that were broken:
# 1. Stripe webhook endpoint
# 2. Auth middleware functionality
```

### Level 4: Production Simulation
```bash
# Build for production
NODE_ENV=production npm run build

# Start in production mode
NODE_ENV=production npm start

# Test that:
# 1. Logs are properly formatted JSON
# 2. Stack traces are hidden in production
# 3. Log levels respect production settings
# 4. No worker_threads errors occur
```

## Final Validation Checklist
- [ ] All dependencies updated: `npm install` successful
- [ ] No lint errors: `npm run lint` passes
- [ ] No type errors: `npx tsc --noEmit` passes
- [ ] Build successful: `npm run build` passes
- [ ] Development logging works with structured JSON output
- [ ] Production logging hides stack traces and sensitive data
- [ ] Webhook route logging restored and functional
- [ ] Auth middleware logging restored and functional
- [ ] No worker_threads errors in any environment
- [ ] Performance comparable to previous Pino setup
- [ ] All existing helper functions maintain backward compatibility

---

## Anti-Patterns to Avoid
- ❌ Don't change existing helper function signatures - maintain backward compatibility
- ❌ Don't add file transports - console only for serverless
- ❌ Don't expose sensitive data in logs - use redaction
- ❌ Don't skip the incremental validation steps
- ❌ Don't assume Winston works the same as Pino - test thoroughly
- ❌ Don't ignore TypeScript errors - Winston has different type signatures

## Implementation Confidence Score: 9/10

**High confidence rationale:**
- Clear problem statement with evidence in codebase
- Comprehensive Winston research and best practices
- Detailed preservation of existing API surface
- Step-by-step migration plan with validation gates
- Existing patterns well understood
- Feature specification provides exact implementation
- All necessary context and gotchas documented