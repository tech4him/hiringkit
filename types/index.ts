export interface Organization {
  id: string
  name: string
  brand_logo_url?: string
  brand_colors?: BrandColors
  created_at: string
}

export interface BrandColors {
  primary: string
  neutral: string
  accent: string
  font_heading: string
  font_body: string
}

export interface User {
  id: string
  email: string
  name: string
  org_id?: string
  role: 'user' | 'admin'
}

export interface Plan {
  id: string
  name: string
  features_json: Record<string, any>
  price_cents: number
}

export type OrderStatus = 'draft' | 'awaiting_payment' | 'paid' | 'qa_pending' | 'ready' | 'delivered'

export interface Order {
  id: string
  org_id: string
  user_id: string
  kit_id: string
  status: OrderStatus
  stripe_session_id?: string
  total_cents: number
  created_at: string
}

export type KitStatus = 'draft' | 'generating' | 'generated' | 'editing' | 'published'

export interface Kit {
  id: string
  org_id?: string
  user_id: string
  title: string
  status: KitStatus
  intake_json: IntakeData
  artifacts_json?: KitArtifacts
  edited_json?: KitArtifacts
  qa_required: boolean
  qa_notes?: string
  regen_counts?: Record<string, number>
  edited_at?: string
  order_id?: string
  created_at: string
  updated_at: string
}

export interface IntakeData {
  role_title: string
  organization: string
  reports_to?: string
  department?: string
  location?: string
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship'
  mission: string
  outcomes: string[]
  responsibilities: string[]
  core_skills: string[]
  behavioral_competencies: string[]
  values: string[]
  success_metrics: {
    d90: string
    d180: string
    d365: string
  }
  job_post_intro?: string
  job_post_summary?: string
  must_have: string[]
  nice_to_have: string[]
  compensation?: string
  how_to_apply?: string
  work_sample_scenario?: string
}

export interface KitArtifacts {
  scorecard: Scorecard
  job_post: JobPost
  interview: InterviewStages
  work_sample: WorkSample
  reference_check: ReferenceCheck
  process_map: ProcessMap
  eeo: EEOGuidelines
}

export interface Scorecard {
  mission: string
  outcomes: string[]
  responsibilities: string[]
  competencies: {
    core: string[]
    behavioral: string[]
    values: string[]
  }
  success: {
    d90: string
    d180: string
    d365: string
  }
}

export interface JobPost {
  intro: string
  summary: string
  responsibilities: string[]
  must: string[]
  nice: string[]
  comp: string
  apply: string
}

export interface InterviewQuestion {
  question: string
  purpose?: string
  ideal_response?: string
}

export interface RubricRow {
  level: 1 | 2 | 3 | 4 | 5
  label: string
  description: string
}

export interface InterviewStage {
  questions: InterviewQuestion[]
  rubric: RubricRow[]
}

export interface InterviewStages {
  stage1: InterviewStage
  stage2: InterviewStage
  stage3: InterviewStage
}

export interface WorkSample {
  scenario: string
  instructions: string[]
  scoring: ScoringCriteria[]
}

export interface ScoringCriteria {
  criteria: string
  weight: number
  description: string
}

export interface ReferenceCheck {
  questions: string[]
}

export interface ProcessMap {
  steps: ProcessStep[]
  pacing: string[]
}

export interface ProcessStep {
  name: string
  description: string
  duration?: string
  owner?: string
}

export interface EEOGuidelines {
  principles: string[]
  disclaimer: string
}

export type ExportKind = 'combined_pdf' | 'zip'

export interface Export {
  id: string
  kit_id: string
  kind: ExportKind
  url: string
  created_at: string
}

export type ArtifactType = 
  | 'scorecard' 
  | 'job_post' 
  | 'interview_stage1' 
  | 'interview_stage2' 
  | 'interview_stage3' 
  | 'work_sample' 
  | 'reference_check' 
  | 'process_map' 
  | 'eeo'

export interface ExportAsset {
  id: string
  export_id: string
  artifact: ArtifactType
  url: string
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string
  kit_id?: string
  action: string
  payload_json?: Record<string, any>
  created_at: string
}