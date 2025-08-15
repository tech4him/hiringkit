import { z } from 'zod';

// Common validators
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const nonEmptyString = z.string().min(1);

// Employment type enum
export const EmploymentTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'internship']);

// Order status enum
export const OrderStatusSchema = z.enum(['draft', 'awaiting_payment', 'paid', 'qa_pending', 'ready', 'delivered']);

// Kit status enum
export const KitStatusSchema = z.enum(['draft', 'generating', 'generated', 'editing', 'published']);

// Export kind enum
export const ExportKindSchema = z.enum(['combined_pdf', 'zip']);

// Artifact type enum
export const ArtifactTypeSchema = z.enum([
  'scorecard', 
  'job_post', 
  'interview_stage1', 
  'interview_stage2', 
  'interview_stage3', 
  'work_sample', 
  'reference_check', 
  'process_map', 
  'eeo'
]);

// BrandColors schema
export const BrandColorsSchema = z.object({
  primary: nonEmptyString,
  neutral: nonEmptyString,
  accent: nonEmptyString,
  font_heading: nonEmptyString,
  font_body: nonEmptyString,
});

// Organization schema
export const OrganizationSchema = z.object({
  id: uuidSchema,
  name: nonEmptyString.max(100),
  brand_logo_url: z.string().url().optional(),
  brand_colors: BrandColorsSchema.optional(),
  created_at: z.string().datetime(),
});

// User schema
export const UserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: nonEmptyString.max(100),
  org_id: uuidSchema.optional(),
  role: z.enum(['user', 'admin']),
});

// IntakeData schema - main validation for kit generation
export const IntakeDataSchema = z.object({
  role_title: nonEmptyString.min(2).max(100),
  organization: nonEmptyString.min(2).max(100),
  reports_to: nonEmptyString.max(100).optional(),
  department: nonEmptyString.max(100).optional(),
  location: nonEmptyString.max(100).optional(),
  employment_type: EmploymentTypeSchema.optional(),
  mission: nonEmptyString.min(10).max(1000),
  outcomes: z.array(nonEmptyString.max(200)).min(1).max(10),
  responsibilities: z.array(nonEmptyString.max(200)).min(1).max(15),
  core_skills: z.array(nonEmptyString.max(100)).min(1).max(15),
  behavioral_competencies: z.array(nonEmptyString.max(100)).min(1).max(10),
  values: z.array(nonEmptyString.max(100)).min(1).max(10),
  success_metrics: z.object({
    d90: nonEmptyString.max(300),
    d180: nonEmptyString.max(300),
    d365: nonEmptyString.max(300),
  }),
  job_post_intro: nonEmptyString.max(500).optional(),
  job_post_summary: nonEmptyString.max(1000).optional(),
  must_have: z.array(nonEmptyString.max(200)).min(1).max(15),
  nice_to_have: z.array(nonEmptyString.max(200)).min(0).max(15),
  compensation: nonEmptyString.max(500).optional(),
  how_to_apply: nonEmptyString.max(500).optional(),
  work_sample_scenario: nonEmptyString.max(1000).optional(),
});

// API Request/Response Schemas

// Kit generation request
export const GenerateKitRequestSchema = z.object({
  express_mode: z.boolean().optional().default(false),
  role_title: nonEmptyString.min(2).max(100),
  organization: z.string().max(100).optional(),
  mission: z.string().max(1000).optional(),
  // For detailed mode, require full intake data
}).superRefine((data, ctx) => {
  if (!data.express_mode) {
    // In detailed mode, require additional fields
    if (!data.organization || data.organization.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization is required for detailed mode",
        path: ['organization'],
      });
    }
    if (!data.mission || data.mission.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mission is required for detailed mode",
        path: ['mission'],
      });
    }
  }
});

// Checkout request
export const CheckoutRequestSchema = z.object({
  kit_id: uuidSchema,
  plan_type: z.enum(['solo', 'pro']).default('solo'),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

// Admin query parameters
export const AdminOrdersQuerySchema = z.object({
  status: OrderStatusSchema.or(z.literal('all')).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  org_id: z.string().uuid().optional(),
});

// Kit export request
export const ExportRequestSchema = z.object({
  export_type: ExportKindSchema.default('combined_pdf'),
});

// Webhook event tracking
export const WebhookEventSchema = z.object({
  event_id: nonEmptyString,
  event_type: nonEmptyString,
  processed_at: z.date().default(() => new Date()),
  metadata: z.record(z.any()).optional(),
});

// Stripe webhook body validation
export const StripeWebhookSchema = z.object({
  id: nonEmptyString,
  type: nonEmptyString,
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number().optional(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }).optional(),
});

// API Response helpers
export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema]);

// Type exports for TypeScript
export type GenerateKitRequest = z.infer<typeof GenerateKitRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type AdminOrdersQuery = z.infer<typeof AdminOrdersQuerySchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type StripeWebhook = z.infer<typeof StripeWebhookSchema>;
export type ApiSuccess<T = unknown> = Omit<z.infer<typeof ApiSuccessSchema>, 'data'> & { data: T };
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;