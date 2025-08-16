import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { withContext, logSecurity, safeError } from '@/lib/logger';
import { isAdminEmail } from '@/lib/config/env';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirect = url.searchParams.get('redirect') || '/admin';
  const log = withContext({ context: 'auth_callback' });

  if (!code) {
    log.warn('Auth callback missing code parameter', { url: request.url });
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    
    // Exchange code for session
    const { data: { user: authUser }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !authUser) {
      log.error('Failed to exchange code for session', { 
        error: safeError(exchangeError),
        code: code.substring(0, 10) + '...' // Log partial code for debugging
      });
      return NextResponse.redirect(new URL('/login?error=invalid_code', request.url));
    }

    // Check if user exists in database, create if not
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    let user: User;

    if (fetchError || !existingUser) {
      // Create user record
      const newUser: Partial<User> = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
        role: isAdminEmail(authUser.email!) ? 'admin' : 'user',
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError || !createdUser) {
        log.error('Failed to create user record', { 
          error: safeError(createError), 
          userId: authUser.id,
          userEmail: authUser.email
        });
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url));
      }

      user = createdUser as User;
      log.info('Created new user record', { userId: user.id, userEmail: user.email });
    } else {
      user = existingUser as User;
    }

    // Check if user has admin access
    const isAdmin = user.role === 'admin' || isAdminEmail(user.email);

    if (!isAdmin && redirect.startsWith('/admin')) {
      logSecurity('AUTH_CALLBACK_NON_ADMIN_REDIRECT', {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        attemptedRedirect: redirect,
      });
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Log successful authentication
    logSecurity('AUTH_CALLBACK_SUCCESS', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      isAdmin,
      redirectTo: redirect,
    });

    // Redirect to the intended page
    return NextResponse.redirect(new URL(redirect, request.url));

  } catch (error) {
    log.error('Auth callback error', { 
      error: safeError(error),
      url: request.url,
    });
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}