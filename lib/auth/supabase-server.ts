import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/config/env';
import { withContext, logError, safeError } from '@/lib/logger';

// Create server-side Supabase client for page components
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors (e.g., during server-side rendering)
            const log = withContext({ context: 'cookie_management' });
            log.warn('Failed to set cookie in SSR', { cookieName: name, error: safeError(error) });
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors
            const log = withContext({ context: 'cookie_management' });
            log.warn('Failed to remove cookie in SSR', { cookieName: name, error: safeError(error) });
          }
        },
      },
    }
  );
}

// Get current user from server context
export async function getServerUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    logError(error as Error, { context: 'getServerUser' });
    return null;
  }
}

// Check if current server-side user is authenticated
export async function isServerAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}

// Helper to get user role from database in server context
export async function getServerUserRole(): Promise<'user' | 'admin' | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // Get user role from database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return null;
    }

    return userRecord.role as 'user' | 'admin';
  } catch (error) {
    logError(error as Error, { context: 'getServerUserRole' });
    return null;
  }
}

// Check if current server-side user is admin
export async function isServerAdmin(): Promise<boolean> {
  const role = await getServerUserRole();
  return role === 'admin';
}