import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: {
    anonymous: 10, // 10 requests per 15 min for anonymous users
    authenticated: 100, // 100 requests per 15 min for authenticated users
    admin: 1000, // 1000 requests per 15 min for admin users
  },
};

// In-memory store for rate limiting (Edge Runtime compatible)
const requestCounts = new Map<string, { count: number; resetTime: number; lastRequest: number }>();

// Clean up old entries periodically
function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (remoteAddr) {
    return remoteAddr.trim();
  }
  
  return 'unknown';
}

// Check if user is authenticated and get their role
async function getUserRole(request: NextRequest): Promise<'anonymous' | 'authenticated' | 'admin'> {
  try {
    // Create Supabase client for middleware
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return 'anonymous';
    }

    // Check if admin email
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    if (adminEmails.includes(user.email || '')) {
      return 'admin';
    }

    return 'authenticated';
  } catch (error) {
    return 'anonymous';
  }
}

// Rate limiting logic
async function checkRateLimit(request: NextRequest): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip = getClientIP(request);
  const userRole = await getUserRole(request);
  const now = Date.now();
  
  // Clean up old entries every 100 requests
  if (requestCounts.size % 100 === 0) {
    cleanupOldEntries();
  }

  const key = `${ip}:${userRole}`;
  const maxRequests = RATE_LIMIT_CONFIG.maxRequests[userRole];
  
  let requestData = requestCounts.get(key);
  
  if (!requestData || now > requestData.resetTime) {
    // Create new window
    requestData = {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      lastRequest: now,
    };
    requestCounts.set(key, requestData);
    return { allowed: true };
  }

  // Check if within rate limit
  if (requestData.count >= maxRequests) {
    const resetIn = Math.ceil((requestData.resetTime - now) / 1000);
    
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            details: {
              limit: maxRequests,
              windowMs: RATE_LIMIT_CONFIG.windowMs,
              resetIn,
            },
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(requestData.resetTime / 1000).toString(),
          },
        }
      ),
    };
  }

  // Increment counter
  requestData.count++;
  requestData.lastRequest = now;
  requestCounts.set(key, requestData);

  return { allowed: true };
}

// CORS configuration
const CORS_CONFIG = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Handle CORS preflight requests
function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: CORS_CONFIG,
    });
  }
  return null;
}

// Main middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  const corsResponse = handleCORS(request);
  if (corsResponse) {
    return corsResponse;
  }

  // Check admin routes protection BEFORE rate limiting
  const adminRoutes = [/^\/admin(\/.*)?$/, /^\/api\/admin\//];
  const isAdminRoute = adminRoutes.some(pattern => pattern.test(pathname));
  
  if (isAdminRoute) {
    // Check if user has auth session using Supabase SSR client
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Pass the response with updated cookies
    return response;
  }

  // Skip rate limiting for certain paths
  const skipRateLimit = [
    '/api/stripe/webhook', // Stripe webhooks should not be rate limited
    '/_next', // Next.js static files
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ];

  const shouldSkip = skipRateLimit.some(path => pathname.startsWith(path));

  if (!shouldSkip && pathname.startsWith('/api/')) {
    // Apply rate limiting to API routes
    const rateLimitResult = await checkRateLimit(request);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }
  }

  // Create response with CORS headers
  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  Object.entries(CORS_CONFIG).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};