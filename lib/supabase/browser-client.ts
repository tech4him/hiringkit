'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/config/env';

// Create a Supabase client for browser with proper cookie handling
export const supabase = createBrowserClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);