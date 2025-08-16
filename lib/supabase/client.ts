import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

// Client-side Supabase client (for client components)
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side client with authentication (recommended for API routes)
export async function createAuthenticatedClient() {
  // Dynamic import to avoid SSR issues
  const { createServerClient: createSSRClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  
  const cookieStore = await cookies();
  
  return createSSRClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie setting errors during SSR
            console.warn('Failed to set cookie during SSR', { cookieName: name });
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Handle cookie removal errors during SSR
            console.warn('Failed to remove cookie during SSR', { cookieName: name });
          }
        },
      },
    }
  );
}

// DEPRECATED: Server-side client with service role key
// Use createAuthenticatedClient() instead for better security
// Only use this for admin operations that bypass RLS
export const createServerClient = () => {
  // Use console instead of logger to avoid worker thread issues
  console.warn('DEPRECATED: createServerClient() with service role is deprecated. Use createAuthenticatedClient() instead.');
  
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Admin client for operations that need to bypass RLS
// Use sparingly and only for legitimate admin operations
export const createAdminClient = () => {
  // Note: Using service role key for admin operations
  
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Helper to get database client with proper auth context
export async function getDatabase() {
  return createAuthenticatedClient();
}

// Helper to check if RLS is enabled on a table
export async function checkRLSStatus(tableName: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .rpc('pg_get_rls_status', { table_name: tableName });
    
    if (error) {
      console.error('Failed to check RLS status', { tableName, error });
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Error checking RLS status', { tableName, error });
    return false;
  }
}