"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Globe, 
  MessageSquare, 
  Award, 
  Users, 
  ShieldCheck,
  Target,
  CheckCircle,
  Download,
  Loader2,
  Lock,
  Eye
} from "lucide-react";
import type { KitArtifacts, Scorecard, JobPost, InterviewStages, WorkSample, ReferenceCheck, ProcessMap, EEOGuidelines } from "@/types";

interface KitPreviewProps {
  artifacts: KitArtifacts | null;
  isGenerating: boolean;
  hasGenerated: boolean;
  onUnlock: () => void;
  editedArtifacts?: Partial<KitArtifacts> | null;
  isRegenerating?: Record<string, boolean>;
}

export function KitPreview({ 
  artifacts, 
  isGenerating, 
  hasGenerated, 
  onUnlock, 
  editedArtifacts,
  isRegenerating = {} 
}: KitPreviewProps) {
  const [activeTab, setActiveTab] = useState("scorecard");
  
  // Merge edited artifacts with original artifacts for display
  const displayArtifacts = artifacts ? {
    ...artifacts,
    ...editedArtifacts,
  } : null;

  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1F4B99] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generating Your Hiring Kit</h3>
          <p className="text-gray-600">This usually takes 30-60 seconds...</p>
        </div>
      </div>
    );
  }

  if (!hasGenerated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Preview Your Kit</h3>
          <p className="text-gray-600 mb-4">
            Fill out the form on the left and click &quot;Generate&quot; to see your complete hiring kit preview.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">What you&apos;ll get:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Role Scorecard
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Job Post
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Interview Pack
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Work Sample
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reference Script
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                EEO Guidelines
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kit Preview</h2>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Lock className="h-3 w-3 mr-1" />
            Gated Preview
          </Badge>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap relative ${
                activeTab === tab.id
                  ? "bg-[#1F4B99] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {isRegenerating[tab.id] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative">
          {/* Watermark overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 opacity-20">
              <div className="bg-gray-800 text-white px-8 py-2 text-2xl font-bold rounded">
                PREVIEW
              </div>
            </div>
          </div>

          {/* Content with copy protection */}
          <div 
            className="select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              showPaywallModal();
            }}
            onCopy={(e) => {
              e.preventDefault();
              showPaywallModal();
            }}
          >
            <PreviewContent 
              artifacts={displayArtifacts} 
              activeTab={activeTab} 
              isRegenerating={isRegenerating[activeTab]} 
            />
          </div>

          {/* Gradient fade overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>

        {/* Unlock CTA */}
        <div className="mt-8 text-center">
          <Card className="border-[#1F4B99] bg-blue-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Unlock Your Complete Kit</h3>
              <p className="text-gray-600 mb-4">
                This preview shows truncated content with watermarks. Get the full, professional kit with:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Complete content (no truncation)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Professional PDF export
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Editable sections
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  ZIP with separate PDFs
                </div>
              </div>
              <Button onClick={onUnlock} size="lg" className="bg-[#1F4B99] hover:brightness-110">
                <Download className="h-4 w-4 mr-2" />
                Unlock Full Kit - $49
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Money-back guarantee • Instant download
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ 
  artifacts, 
  activeTab, 
  isRegenerating 
}: { 
  artifacts: KitArtifacts | null; 
  activeTab: string; 
  isRegenerating?: boolean; 
}) {
  if (!artifacts) return <div>No preview available</div>;

  // Show regenerating overlay for the active section
  if (isRegenerating) {
    return (
      <div className="relative">
        <div className="opacity-50">
          {renderSectionContent(artifacts, activeTab)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F4B99] mx-auto mb-2" />
            <p className="text-sm text-gray-600">Regenerating section...</p>
          </div>
        </div>
      </div>
    );
  }

  return renderSectionContent(artifacts, activeTab);
}

function renderSectionContent(artifacts: KitArtifacts, activeTab: string) {
  switch (activeTab) {
    case "scorecard":
      return <ScorecardPreview scorecard={artifacts.scorecard} />;
    case "job_post":
      return <JobPostPreview jobPost={artifacts.job_post} />;
    case "interview":
      return <InterviewPreview interview={artifacts.interview} />;
    case "work_sample":
      return <WorkSamplePreview workSample={artifacts.work_sample} />;
    case "reference":
      return <ReferencePreview reference={artifacts.reference_check} />;
    case "process_map":
      return <ProcessMapPreview processMap={artifacts.process_map} />;
    case "eeo":
      return <EEOPreview eeo={artifacts.eeo} />;
    default:
      return <div>Select a section to preview</div>;
  }
}

function ScorecardPreview({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Role Scorecard</h3>
        <p className="text-gray-600">Define success metrics and key outcomes</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Mission</h4>
        <p className="text-gray-700">{truncateText(scorecard?.mission || "", 15)} <span className="text-blue-600 text-sm">... unlock full</span></p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Key Outcomes</h4>
        <ul className="list-disc list-inside space-y-1">
          {scorecard?.outcomes?.slice(0, 3).map((outcome: string, i: number) => (
            <li key={i} className="text-gray-700">
              {truncateText(outcome, 12)} <span className="text-blue-600 text-sm">... unlock full</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Core Competencies</h4>
        <div className="space-y-2">
          {scorecard?.competencies?.core?.slice(0, 2).map((comp: string, i: number) => (
            <div key={i} className="text-gray-700">
              • {truncateText(comp, 10)} <span className="text-blue-600 text-sm">... unlock full</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Success Metrics</h4>
        <div className="text-sm text-gray-600">
          <div><strong>90 days:</strong> {truncateText(scorecard?.success?.d90 || "", 8)} <span className="text-blue-600">... unlock full</span></div>
          <div><strong>180 days:</strong> [Blurred content] <Lock className="h-3 w-3 inline ml-1" /></div>
          <div><strong>365 days:</strong> [Blurred content] <Lock className="h-3 w-3 inline ml-1" /></div>
        </div>
      </div>
    </div>
  );
}

function JobPostPreview({ jobPost }: { jobPost: JobPost }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Job Post</h3>
        <p className="text-gray-600">Professional, bias-aware job description</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Introduction</h4>
        <p className="text-gray-700">{truncateText(jobPost?.intro || "", 20)} <span className="text-blue-600 text-sm">... unlock full</span></p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">What You&apos;ll Do</h4>
        <ul className="list-disc list-inside space-y-1">
          {jobPost?.responsibilities?.slice(0, 3).map((resp: string, i: number) => (
            <li key={i} className="text-gray-700">
              {truncateText(resp, 15)} <span className="text-blue-600 text-sm">... unlock full</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-green-800">Must-Have</h4>
          <ul className="space-y-1 text-sm">
            {jobPost?.must?.slice(0, 2).map((req: string, i: number) => (
              <li key={i} className="text-gray-700">
                • {truncateText(req, 8)} <span className="text-blue-600">... unlock</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-800">Nice-to-Have</h4>
          <div className="text-sm text-gray-500">[Blurred content] <Lock className="h-3 w-3 inline ml-1" /></div>
        </div>
      </div>
    </div>
  );
}

function InterviewPreview({ interview }: { interview: InterviewStages }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">3-Stage Interview Pack</h3>
        <p className="text-gray-600">Structured questions with scoring rubrics</p>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Stage 1: Screening</h4>
        <div className="space-y-3">
          {interview?.stage1?.questions?.slice(0, 2).map((q, i: number) => (
            <div key={i} className="border-l-4 border-blue-200 pl-4">
              <p className="font-medium">{i + 1}. {truncateText(q.question || "", 12)} <span className="text-blue-600 text-sm">... unlock full</span></p>
              {q.purpose && (
                <p className="text-sm text-gray-600 mt-1">Purpose: {truncateText(q.purpose, 8)} <span className="text-blue-600 text-sm">... unlock</span></p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium mb-2">Scoring Rubric (Sample)</h5>
          <div className="text-sm">
            <div className="bg-green-100 p-2 rounded mb-2">
              <strong>3 = Meets Expectations:</strong> Provides clear examples with specific metrics and outcomes...
            </div>
            <div className="bg-gray-200 p-2 rounded opacity-50">
              <Lock className="h-4 w-4 inline mr-2" />
              [Other scoring levels unlocked in full version]
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Stages 2 & 3</h4>
        <p className="text-gray-600">Deep-dive technical questions and culture alignment interviews with complete rubrics.</p>
        <Button variant="secondary" size="sm" className="mt-2">
          <Lock className="h-3 w-3 mr-1" />
          Unlock to View
        </Button>
      </div>
    </div>
  );
}

function WorkSamplePreview({ workSample }: { workSample: WorkSample }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Work Sample</h3>
        <p className="text-gray-600">1-hour practical exercise with scoring guide</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Scenario</h4>
        <p className="text-gray-700">{truncateText(workSample?.scenario || "", 25)} <span className="text-blue-600 text-sm">... unlock full</span></p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Instructions</h4>
        <ul className="list-disc list-inside space-y-1">
          {workSample?.instructions?.slice(0, 2).map((instruction: string, i: number) => (
            <li key={i} className="text-gray-700">
              {truncateText(instruction, 12)} <span className="text-blue-600 text-sm">... unlock full</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Scoring Criteria</h4>
        <div className="text-sm text-gray-600">
          <div className="mb-2">
            <strong>Strategic Thinking (30%):</strong> {truncateText("Evaluates ability to...", 6)} <span className="text-blue-600">... unlock</span>
          </div>
          <div className="text-gray-400">
            <Lock className="h-3 w-3 inline mr-1" />
            [Additional criteria unlocked in full version]
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferencePreview({ reference }: { reference: ReferenceCheck }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Reference Check Script</h3>
        <p className="text-gray-600">Structured questions for meaningful insights</p>
      </div>

      <div className="space-y-3">
        {reference?.questions?.slice(0, 3).map((question: string, i: number) => (
          <div key={i} className="border-l-4 border-green-200 pl-4">
            <p className="font-medium">{i + 1}. {truncateText(question, 15)} <span className="text-blue-600 text-sm">... unlock full</span></p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Additional Questions</h4>
        <p className="text-gray-600">Follow-up questions and notes section included in full version.</p>
      </div>
    </div>
  );
}

function ProcessMapPreview({ processMap }: { processMap: ProcessMap }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Hiring Process Map</h3>
        <p className="text-gray-600">Timeline and steps for your complete workflow</p>
      </div>

      <div className="space-y-3">
        {processMap?.steps?.slice(0, 3).map((step, i: number) => (
          <div key={i} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-[#1F4B99] text-white rounded-full flex items-center justify-center text-sm font-medium">
              {i + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{step.name}</h4>
              <p className="text-sm text-gray-600">{truncateText(step.description || "", 10)} <span className="text-blue-600">... unlock</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-gray-600">Complete timeline with durations, owners, and detailed instructions unlocked in full version.</p>
      </div>
    </div>
  );
}

function EEOPreview({ eeo }: { eeo: EEOGuidelines }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">EEO & Bias Guidelines</h3>
        <p className="text-gray-600">Fair hiring practices and compliance guardrails</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Key Principles</h4>
        <ul className="list-disc list-inside space-y-1">
          {eeo?.principles?.slice(0, 3).map((principle: string, i: number) => (
            <li key={i} className="text-gray-700">
              {truncateText(principle, 12)} <span className="text-blue-600 text-sm">... unlock full</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h4 className="font-semibold mb-2 text-red-800">Legal Disclaimer</h4>
        <p className="text-sm text-gray-600">{truncateText(eeo?.disclaimer || "", 20)} <span className="text-blue-600">... unlock full</span></p>
      </div>
    </div>
  );
}

// Helper function to truncate text and add ellipsis
function truncateText(text: string, words: number): string {
  const wordArray = text.split(" ");
  if (wordArray.length <= words) return text;
  return wordArray.slice(0, words).join(" ");
}

// Function to show paywall modal (placeholder)
function showPaywallModal() {
  alert("Full content unlocks after purchase. This preview is protected to ensure fair value.");
}

const tabs = [
  { id: "scorecard", label: "Scorecard", icon: Target },
  { id: "job_post", label: "Job Post", icon: Globe },
  { id: "interview", label: "Interview", icon: MessageSquare },
  { id: "work_sample", label: "Work Sample", icon: Award },
  { id: "reference", label: "Reference", icon: Users },
  { id: "process_map", label: "Process", icon: FileText },
  { id: "eeo", label: "EEO", icon: ShieldCheck },
];