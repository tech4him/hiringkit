"use client";

import { useState, useEffect, Suspense } from "react";
import { IntakeForm } from "@/components/kit/IntakeForm";
import { KitPreview } from "@/components/kit/KitPreview";
import { EditLiteForm } from "@/components/kit/EditLiteForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditLite } from "@/hooks/useEditLite";
import { useRegenLimits } from "@/hooks/useRegenLimits";
import type { IntakeData, Kit, KitArtifacts, ArtifactType } from "@/types";

// Component that uses useSearchParams - must be wrapped in Suspense
function KitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleFromUrl = searchParams.get("role");

  const [intakeData, setIntakeData] = useState<Partial<IntakeData>>(() => {
    // Initialize with role from URL if provided
    const initial: Partial<IntakeData> = {};
    if (roleFromUrl) {
      initial.role_title = roleFromUrl;
    }
    return initial;
  });

  const [kit, setKit] = useState<Kit | null>(null);
  const [artifacts, setArtifacts] = useState<KitArtifacts | null>(null);
  const [editedArtifacts, setEditedArtifacts] = useState<Partial<KitArtifacts> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showEditLite, setShowEditLite] = useState(false);

  // Edit-lite hooks (always call hooks unconditionally)
  const editLite = useEditLite({
    kitId: kit?.id || '',
    initialData: kit?.intake_json || {} as IntakeData
  });

  const regenLimits = useRegenLimits({
    kitId: kit?.id || '',
    initialCounts: kit?.regen_counts || {},
    isPaid: Boolean(kit?.order_id)
  });

  // Auto-save intake to localStorage
  useEffect(() => {
    localStorage.setItem("hiring-kit-intake", JSON.stringify(intakeData));
  }, [intakeData]);

  // Load saved intake on mount
  useEffect(() => {
    const saved = localStorage.getItem("hiring-kit-intake");
    if (saved && !roleFromUrl) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          setIntakeData(parsed);
        }
      } catch (e) {
        console.warn("Failed to parse saved intake data:", e);
      }
    }
  }, [roleFromUrl]);

  const handleIntakeChange = (data: Partial<IntakeData>) => {
    setIntakeData(prev => ({ ...prev, ...data }));
  };

  const handleExpressGenerate = async () => {
    if (!intakeData.role_title) return;

    setIsGenerating(true);
    try {
      // Call the AI generation API
      const response = await fetch("/api/kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role_title: intakeData.role_title,
          organization: intakeData.organization || "",
          mission: intakeData.mission || "",
          express_mode: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.details && response.status === 400) {
          const messages = errorData.error.details.map((d: { message: string }) => d.message).join(", ");
          throw new Error(`Please provide: ${messages}`);
        }
        throw new Error("Failed to generate kit");
      }

      const result = await response.json();
      setKit(result.data.kit);
      setArtifacts(result.data.artifacts);
      setIntakeData(result.data.intake); // Update with AI-filled data
      setHasGenerated(true);
      setShowEditLite(true); // Show edit-lite after generation
    } catch (error) {
      console.error("Generation error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate kit. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFullGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...intakeData,
          express_mode: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.details && response.status === 400) {
          const messages = errorData.error.details.map((d: { message: string }) => d.message).join(", ");
          throw new Error(`Please provide: ${messages}`);
        }
        throw new Error("Failed to generate kit");
      }

      const result = await response.json();
      setKit(result.data.kit);
      setArtifacts(result.data.artifacts);
      setHasGenerated(true);
      setShowEditLite(true); // Show edit-lite after generation
    } catch (error) {
      console.error("Generation error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate kit. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit-lite handlers
  const handleInputUpdate = async (updates: Partial<IntakeData>) => {
    if (!kit || !editLite) return;
    try {
      await editLite.updateInputs(updates);
    } catch (error) {
      console.error('Input update error:', error);
      alert('Failed to update inputs. Please try again.');
    }
  };

  const handleSectionRegenerate = async (section: string, styleSettings?: Record<string, string>) => {
    if (!kit || !regenLimits) return;
    try {
      const result = await regenLimits.regenerateSection(section as ArtifactType, styleSettings);
      
      // Update edited artifacts with the new section
      setEditedArtifacts(prev => ({
        ...prev,
        [section]: result.section
      }));
    } catch (error) {
      console.error('Section regeneration error:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate section. Please try again.');
    }
  };

  return (
    <div className="kit-builder-page min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Home
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {intakeData.role_title ? `${intakeData.role_title} Hiring Kit` : "New Hiring Kit"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {hasGenerated && (
                <button
                  onClick={() => {
                    if (!kit?.id) {
                      console.error('No kit ID available for checkout');
                      alert('Please generate a kit first before proceeding to checkout.');
                      return;
                    }
                    router.push(`/kit/${kit.id}/checkout`);
                  }}
                  className="bg-[#1F4B99] text-white px-4 py-2 rounded-lg hover:brightness-110 text-sm font-medium"
                >
                  Unlock Full Kit - $49
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          {/* Left Pane - Conditional Form */}
          <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden">
            {!showEditLite ? (
              <IntakeForm
                data={intakeData}
                onChange={handleIntakeChange}
                onExpressGenerate={handleExpressGenerate}
                onFullGenerate={handleFullGenerate}
                isGenerating={isGenerating}
                hasGenerated={hasGenerated}
              />
            ) : kit ? (
              <EditLiteForm
                kit={kit}
                onInputUpdate={handleInputUpdate}
                onSectionRegenerate={handleSectionRegenerate}
                isUpdating={editLite?.isUpdating || false}
                isPaid={Boolean(kit.order_id)}
                onUnlock={() => {
                  if (!kit?.id) {
                    console.error('No kit ID available for checkout');
                    alert('Please generate a kit first before proceeding to checkout.');
                    return;
                  }
                  router.push(`/kit/${kit.id}/checkout`);
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Loading edit interface...</p>
              </div>
            )}
          </div>

          {/* Right Pane - Preview */}
          <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden">
            <KitPreview
              artifacts={artifacts}
              editedArtifacts={editedArtifacts}
              isRegenerating={regenLimits ? {
                scorecard: regenLimits.isRegenerating('scorecard'),
                job_post: regenLimits.isRegenerating('job_post'),
                interview_stage1: regenLimits.isRegenerating('interview_stage1'),
                interview_stage2: regenLimits.isRegenerating('interview_stage2'),
                interview_stage3: regenLimits.isRegenerating('interview_stage3'),
                work_sample: regenLimits.isRegenerating('work_sample'),
                reference_check: regenLimits.isRegenerating('reference_check'),
                process_map: regenLimits.isRegenerating('process_map'),
                eeo: regenLimits.isRegenerating('eeo'),
              } : {}}
              isGenerating={isGenerating}
              hasGenerated={hasGenerated}
              onUnlock={() => {
                if (!kit?.id) {
                  console.error('No kit ID available for checkout');
                  alert('Please generate a kit first before proceeding to checkout.');
                  return;
                }
                router.push(`/kit/${kit.id}/checkout`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary wrapper
export default function KitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kit builder...</p>
        </div>
      </div>
    }>
      <KitPageContent />
    </Suspense>
  );
}