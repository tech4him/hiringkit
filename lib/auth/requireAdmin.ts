import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase-server';
import { withContext, logSecurity, safeError } from '@/lib/logger';
import { isAdminEmail } from '@/lib/config/env';
import type { User } from '@/types';

// Result type for admin requirement
export interface AdminGuardResult {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User;
}

// Server-side admin guard for page components
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  // Check authentication
  if (authError || !authUser) {
    logSecurity('ADMIN_ACCESS_UNAUTHENTICATED', {
      context: 'requireAdmin',
      error: safeError(authError),
    });
    redirect('/login');
  }

  // Get user record from database to check role
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  let finalUserRecord = userRecord;

  if (userError || !userRecord) {
    // If user doesn't exist in database, create a basic record
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
      const log = withContext({ context: 'requireAdmin' });
      log.error('Failed to create user record', { 
        error: safeError(createError), 
        userId: authUser.id 
      });
      redirect('/login');
    }

    finalUserRecord = createdUser;
  }

  const user = finalUserRecord as User;
  
  // Check admin privileges
  const isAdmin = user.role === 'admin' || isAdminEmail(user.email);
  
  if (!isAdmin) {
    logSecurity('ADMIN_ACCESS_DENIED', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      context: 'requireAdmin',
    });
    
    // For pages, we redirect to unauthorized instead of throwing
    redirect('/unauthorized');
  }

  // Log successful admin access
  logSecurity('ADMIN_ACCESS_GRANTED', {
    userId: user.id,
    userEmail: user.email,
    context: 'requireAdmin',
  });

  return { supabase, user };
}

// API route version that throws errors instead of redirecting
export async function requireAdminAPI(): Promise<AdminGuardResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  // Check authentication
  if (authError || !authUser) {
    logSecurity('ADMIN_API_ACCESS_UNAUTHENTICATED', {
      context: 'requireAdminAPI',
      error: safeError(authError),
    });
    throw new Error('UNAUTHORIZED');
  }

  // Get user record from database to check role
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  let finalUserRecord = userRecord;

  if (userError || !userRecord) {
    // If user doesn't exist in database, create a basic record
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
      const log = withContext({ context: 'requireAdminAPI' });
      log.error('Failed to create user record', { 
        error: safeError(createError), 
        userId: authUser.id 
      });
      throw new Error('UNAUTHORIZED');
    }

    finalUserRecord = createdUser;
  }

  const user = finalUserRecord as User;
  
  // Check admin privileges
  const isAdmin = user.role === 'admin' || isAdminEmail(user.email);
  
  if (!isAdmin) {
    logSecurity('ADMIN_API_ACCESS_DENIED', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      context: 'requireAdminAPI',
    });
    
    throw new Error('FORBIDDEN');
  }

  // Log successful admin access
  logSecurity('ADMIN_API_ACCESS_GRANTED', {
    userId: user.id,
    userEmail: user.email,
    context: 'requireAdminAPI',
  });

  return { supabase, user };
}