"use client";

import { useState, useEffect } from "react";
import { IntakeForm } from "@/components/kit/IntakeForm";
import { KitPreview } from "@/components/kit/KitPreview";
import { useRouter, useSearchParams } from "next/navigation";
import type { IntakeData, Kit, KitArtifacts } from "@/types";

export default function KitPage() {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

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
        throw new Error("Failed to generate kit");
      }

      const result = await response.json();
      setKit(result.kit);
      setArtifacts(result.artifacts);
      setIntakeData(result.intake); // Update with AI-filled data
      setHasGenerated(true);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate kit. Please try again.");
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
        throw new Error("Failed to generate kit");
      }

      const result = await response.json();
      setKit(result.kit);
      setArtifacts(result.artifacts);
      setHasGenerated(true);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate kit. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                  onClick={() => router.push(`/kit/${kit?.id}/checkout`)}
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
          {/* Left Pane - Intake Form */}
          <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden">
            <IntakeForm
              data={intakeData}
              onChange={handleIntakeChange}
              onExpressGenerate={handleExpressGenerate}
              onFullGenerate={handleFullGenerate}
              isGenerating={isGenerating}
              hasGenerated={hasGenerated}
            />
          </div>

          {/* Right Pane - Preview */}
          <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden">
            <KitPreview
              artifacts={artifacts}
              isGenerating={isGenerating}
              hasGenerated={hasGenerated}
              onUnlock={() => router.push(`/kit/${kit?.id}/checkout`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}