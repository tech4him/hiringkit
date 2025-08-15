import { NextRequest } from 'next/server';
import { 
  getCurrentUser, 
  requireAuthentication,
  requireAdminAccess,
  requireOrganizationAccess,
  requireResourceOwnership,
} from './middleware';
import { 
  unauthorizedResponse, 
  forbiddenResponse, 
} from '@/lib/validation/helpers';
import type { User } from '@/types';

// Result type for auth operations
type AuthResult<T> = {
  success: true;
  user: T;
} | {
  success: false;
  response: Response;
};

// Safe wrapper for getting current user
export async function safeGetCurrentUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error('safeGetCurrentUser error:', error);
    return null;
  }
}

// Safe wrapper for authentication requirement
export async function safeRequireAuth(request: NextRequest): Promise<AuthResult<User>> {
  try {
    const user = await requireAuthentication(request);
    return { success: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return { 
      success: false, 
      response: unauthorizedResponse(message) 
    };
  }
}

// Safe wrapper for admin requirement
export async function safeRequireAdmin(request: NextRequest): Promise<AuthResult<User>> {
  try {
    const user = await requireAdminAccess(request);
    return { success: true, user };
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return { 
        success: false, 
        response: unauthorizedResponse() 
      };
    }
    return { 
      success: false, 
      response: forbiddenResponse('Admin access required') 
    };
  }
}

// Safe wrapper for organization access requirement
export async function safeRequireOrgAccess(
  request: NextRequest, 
  orgId: string
): Promise<AuthResult<User>> {
  try {
    const user = await requireOrganizationAccess(request, orgId);
    return { success: true, user };
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return { 
        success: false, 
        response: unauthorizedResponse() 
      };
    }
    return { 
      success: false, 
      response: forbiddenResponse('Organization access denied') 
    };
  }
}

// Safe wrapper for resource ownership requirement
export async function safeRequireOwnership(
  request: NextRequest,
  resourceUserId: string,
  resourceType: string = 'resource'
): Promise<AuthResult<User>> {
  try {
    const user = await requireResourceOwnership(request, resourceUserId, resourceType);
    return { success: true, user };
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return { 
        success: false, 
        response: unauthorizedResponse() 
      };
    }
    return { 
      success: false, 
      response: forbiddenResponse(`${resourceType} access denied`) 
    };
  }
}

// Helper to extract user ID from URL params
export function extractUserIdFromUrl(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for a UUID pattern in the path
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  for (const segment of pathSegments) {
    if (uuidRegex.test(segment)) {
      return segment;
    }
  }
  
  return null;
}

// Helper to check if request is from authenticated user
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

// Helper to get organization ID from various sources
export async function getOrganizationId(
  request: NextRequest,
  user?: User
): Promise<string | null> {
  // Try to get from user if provided
  if (user?.org_id) {
    return user.org_id;
  }

  // Try to get from current user
  const currentUser = await safeGetCurrentUser();
  if (currentUser?.org_id) {
    return currentUser.org_id;
  }

  // Try to get from URL parameters
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org_id');
  if (orgId) {
    return orgId;
  }

  return null;
}

// Helper to check resource ownership from database
export async function checkResourceOwnership(
  resourceType: 'kit' | 'order' | 'export',
  resourceId: string,
  userId: string
): Promise<boolean> {
  try {
    const { createAuthenticatedClient } = await import('./middleware');
    const supabase = await createAuthenticatedClient();
    
    const { data, error } = await supabase
      .from(resourceType === 'kit' ? 'kits' : resourceType === 'order' ? 'orders' : 'exports')
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === userId;
  } catch (error) {
    console.error('checkResourceOwnership error:', error, { 
      context: 'checkResourceOwnership',
      resourceType,
      resourceId,
      userId,
    });
    return false;
  }
}

// Helper to get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { createAuthenticatedClient } = await import('./middleware');
    const supabase = await createAuthenticatedClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('getUserByEmail error:', error, { context: 'getUserByEmail', email });
    return null;
  }
}

// Supabase auth user interface
interface SupabaseAuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

// Helper to create or update user from auth
export async function upsertUserFromAuth(authUser: SupabaseAuthUser): Promise<User | null> {
  try {
    const { createAuthenticatedClient } = await import('./middleware');
    const supabase = await createAuthenticatedClient();
    
    const userData = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email.split('@')[0],
      role: isAdminEmail(authUser.email) ? 'admin' : 'user',
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('upsertUserFromAuth error:', error.message, { 
        context: 'upsertUserFromAuth',
        authUserId: authUser.id,
      });
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('upsertUserFromAuth error:', error, { 
      context: 'upsertUserFromAuth',
      authUserId: authUser.id,
    });
    return null;
  }
}

// Helper function to check if user has admin privileges
export async function hasAdminPrivileges(user?: User): Promise<boolean> {
  if (!user) {
    const currentUser = await safeGetCurrentUser();
    if (!currentUser) return false;
    user = currentUser;
  }

  return user.role === 'admin' || isAdminEmail(user.email);
}

// Import isAdminEmail for use in this module
import { isAdminEmail } from '@/lib/config/env';