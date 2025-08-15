import { z } from 'zod';

// Environment variable schema with validation
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Resend
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // PDFShift
  PDFSHIFT_API_KEY: z.string().min(1, 'PDFSHIFT_API_KEY is required'),
  ENABLE_REAL_PDF_GENERATION: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required'),

  // Admin
  ADMIN_EMAILS: z.string()
    .min(1, 'ADMIN_EMAILS is required')
    .transform(emails => emails.split(',').map(email => email.trim())),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}\n\n` +
        'Please check your environment variables and .env.local file.'
      );
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Helper to check if admin email
export function isAdminEmail(email: string): boolean {
  return env.ADMIN_EMAILS.includes(email);
}

// Helper to get database URL for migrations
export function getDatabaseUrl(): string {
  return env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://').replace('.supabase.co', '.supabase.co:5432/postgres');
}

// Helper to determine if we're in production
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

// Helper to determine if we're in development
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

// Helper to determine if real PDF generation should be used
export function shouldUseRealPDFGeneration(): boolean {
  return isProduction() || env.ENABLE_REAL_PDF_GENERATION === 'true';
}