import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { env, isAdminEmail } from '@/lib/config/env';
import { logSecurity, logUserAction } from '@/lib/logger';
import type { User, Organization } from '@/types';

// Create authenticated Supabase client using cookies
export async function createAuthenticatedClient() {
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
            console.warn('Failed to set cookie:', name, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors
            console.warn('Failed to remove cookie:', name, error);
          }
        },
      },
    }
  );
}

// Get current authenticated user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createAuthenticatedClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user details from database
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      // If user doesn't exist in database, create a basic record
      const newUser: Partial<User> = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!.split('@')[0],
        role: isAdminEmail(user.email!) ? 'admin' : 'user',
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user record:', createError);
        return null;
      }

      return createdUser as User;
    }

    return userRecord as User;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || (user?.email && isAdminEmail(user.email)) || false;
}

// Get user's organization
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  try {
    const supabase = await createAuthenticatedClient();
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.org_id) {
      return null;
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.org_id)
      .single();

    if (orgError) {
      return null;
    }

    return organization;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

// Middleware for checking authentication
export async function requireAuthentication(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (!user) {
    logSecurity('UNAUTHORIZED_ACCESS', {
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });
    
    throw new Error('Authentication required');
  }

  logUserAction('AUTHENTICATED_REQUEST', user.id, {
    path: request.nextUrl.pathname,
    method: request.method,
    userEmail: user.email,
  });

  return user;
}

// Middleware for checking admin access
export async function requireAdminAccess(request: NextRequest) {
  const user = await requireAuthentication(request);
  
  const isAdmin = user.role === 'admin' || isAdminEmail(user.email);
  
  if (!isAdmin) {
    logSecurity('ADMIN_ACCESS_DENIED', {
      userId: user.id,
      userEmail: user.email,
      path: request.nextUrl.pathname,
      method: request.method,
    });
    
    throw new Error('Admin access required');
  }

  logUserAction('ADMIN_ACCESS', user.id, {
    path: request.nextUrl.pathname,
    method: request.method,
    userEmail: user.email,
  });

  return user;
}

// Middleware for checking organization access
export async function requireOrganizationAccess(request: NextRequest, orgId: string) {
  const user = await requireAuthentication(request);
  
  // Admins can access any organization
  if (user.role === 'admin' || isAdminEmail(user.email)) {
    return user;
  }

  // Check if user belongs to the organization
  if (user.org_id !== orgId) {
    logSecurity('ORG_ACCESS_DENIED', {
      userId: user.id,
      userEmail: user.email,
      userOrgId: user.org_id,
      requestedOrgId: orgId,
      path: request.nextUrl.pathname,
    });
    
    throw new Error('Organization access denied');
  }

  return user;
}

// Check if user owns a resource
export async function requireResourceOwnership(
  request: NextRequest, 
  resourceUserId: string,
  resourceType: string = 'resource'
) {
  const user = await requireAuthentication(request);
  
  // Admins can access any resource
  if (user.role === 'admin' || isAdminEmail(user.email)) {
    return user;
  }

  // Check if user owns the resource
  if (user.id !== resourceUserId) {
    logSecurity('RESOURCE_ACCESS_DENIED', {
      userId: user.id,
      userEmail: user.email,
      resourceUserId,
      resourceType,
      path: request.nextUrl.pathname,
    });
    
    throw new Error(`${resourceType} access denied`);
  }

  return user;
}