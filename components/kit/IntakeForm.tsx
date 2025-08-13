"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Zap } from "lucide-react";
import type { IntakeData } from "@/types";

interface IntakeFormProps {
  data: Partial<IntakeData>;
  onChange: (data: Partial<IntakeData>) => void;
  onExpressGenerate: () => void;
  onFullGenerate: () => void;
  isGenerating: boolean;
  hasGenerated: boolean;
}

export function IntakeForm({
  data,
  onChange,
  onExpressGenerate,
  onFullGenerate,
  isGenerating,
  hasGenerated
}: IntakeFormProps) {
  const [mode, setMode] = useState<"express" | "detailed">("express");

  const updateField = (field: keyof IntakeData, value: string | string[]) => {
    onChange({ [field]: value });
  };

  const updateArrayField = (field: keyof IntakeData, value: string) => {
    const items = value.split("\n").filter(item => item.trim());
    onChange({ [field]: items });
  };

  const canExpressGenerate = data.role_title?.trim();
  const canFullGenerate = data.role_title?.trim() && data.organization?.trim() && data.mission?.trim();

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold mb-4">Role Information</h2>
        
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === "express" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("express")}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Express Mode
          </Button>
          <Button
            variant={mode === "detailed" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("detailed")}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Detailed
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {mode === "express" ? (
          <ExpressMode
            data={data}
            updateField={updateField}
            onGenerate={onExpressGenerate}
            canGenerate={canExpressGenerate}
            isGenerating={isGenerating}
            hasGenerated={hasGenerated}
          />
        ) : (
          <DetailedMode
            data={data}
            updateField={updateField}
            updateArrayField={updateArrayField}
            onGenerate={onFullGenerate}
            canGenerate={canFullGenerate}
            isGenerating={isGenerating}
            hasGenerated={hasGenerated}
          />
        )}
      </div>
    </div>
  );
}

function ExpressMode({
  data,
  updateField,
  onGenerate,
  canGenerate,
  isGenerating,
  hasGenerated
}: {
  data: Partial<IntakeData>;
  updateField: (field: keyof IntakeData, value: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
  hasGenerated: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Express Mode
        </CardTitle>
        <p className="text-sm text-gray-600">
          Just provide the role title and we&apos;ll generate a complete hiring kit for you to review and customize.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="role_title">Role Title *</Label>
          <Input
            id="role_title"
            value={data.role_title || ""}
            onChange={(e) => updateField("role_title", e.target.value)}
            placeholder="e.g., Marketing Manager, Program Coordinator, Youth Pastor"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="organization">Organization (optional)</Label>
          <Input
            id="organization"
            value={data.organization || ""}
            onChange={(e) => updateField("organization", e.target.value)}
            placeholder="e.g., Acme Inc, Local Community Center"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="mission">Mission (optional)</Label>
          <Textarea
            id="mission"
            value={data.mission || ""}
            onChange={(e) => updateField("mission", e.target.value)}
            placeholder="e.g., Drive brand awareness and lead generation through integrated marketing campaigns"
            className="mt-1 h-20"
          />
        </div>

        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-[#1F4B99] hover:brightness-110"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Kit...
            </>
          ) : hasGenerated ? (
            "Regenerate Kit"
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Complete Kit
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          AI will pre-fill all sections based on the role title. You can edit everything after generation.
        </p>
      </CardContent>
    </Card>
  );
}

function DetailedMode({
  data,
  updateField,
  updateArrayField,
  onGenerate,
  canGenerate,
  isGenerating,
  hasGenerated
}: {
  data: Partial<IntakeData>;
  updateField: (field: keyof IntakeData, value: string) => void;
  updateArrayField: (field: keyof IntakeData, value: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
  hasGenerated: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="role_title_detailed">Role Title *</Label>
            <Input
              id="role_title_detailed"
              value={data.role_title || ""}
              onChange={(e) => updateField("role_title", e.target.value)}
              placeholder="e.g., Marketing Manager"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="organization_detailed">Organization *</Label>
            <Input
              id="organization_detailed"
              value={data.organization || ""}
              onChange={(e) => updateField("organization", e.target.value)}
              placeholder="e.g., Acme Inc"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reports_to">Reports To</Label>
              <Input
                id="reports_to"
                value={data.reports_to || ""}
                onChange={(e) => updateField("reports_to", e.target.value)}
                placeholder="e.g., VP Marketing"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={data.department || ""}
                onChange={(e) => updateField("department", e.target.value)}
                placeholder="e.g., Marketing"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Definition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mission_detailed">Mission Statement *</Label>
            <Textarea
              id="mission_detailed"
              value={data.mission || ""}
              onChange={(e) => updateField("mission", e.target.value)}
              placeholder="What is the primary purpose of this role?"
              className="mt-1 h-20"
            />
          </div>

          <div>
            <Label htmlFor="outcomes">Key Outcomes (one per line)</Label>
            <Textarea
              id="outcomes"
              value={data.outcomes?.join("\n") || ""}
              onChange={(e) => updateArrayField("outcomes", e.target.value)}
              placeholder="Increase brand awareness by 25%
Launch 3 successful campaigns per quarter
Generate 100 qualified leads monthly"
              className="mt-1 h-24"
            />
          </div>

          <div>
            <Label htmlFor="responsibilities">Key Responsibilities (one per line)</Label>
            <Textarea
              id="responsibilities"
              value={data.responsibilities?.join("\n") || ""}
              onChange={(e) => updateArrayField("responsibilities", e.target.value)}
              placeholder="Develop and execute marketing campaigns
Manage social media presence
Collaborate with sales team"
              className="mt-1 h-24"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills & Competencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="core_skills">Core Skills (one per line)</Label>
            <Textarea
              id="core_skills"
              value={data.core_skills?.join("\n") || ""}
              onChange={(e) => updateArrayField("core_skills", e.target.value)}
              placeholder="Digital marketing expertise
Data analysis and reporting
Project management"
              className="mt-1 h-20"
            />
          </div>

          <div>
            <Label htmlFor="must_have">Must-Have Requirements (one per line)</Label>
            <Textarea
              id="must_have"
              value={data.must_have?.join("\n") || ""}
              onChange={(e) => updateArrayField("must_have", e.target.value)}
              placeholder="3+ years marketing experience
Bachelor's degree in Marketing or related field
Experience with Google Analytics"
              className="mt-1 h-20"
            />
          </div>

          <div>
            <Label htmlFor="nice_to_have">Nice-to-Have (one per line)</Label>
            <Textarea
              id="nice_to_have"
              value={data.nice_to_have?.join("\n") || ""}
              onChange={(e) => updateArrayField("nice_to_have", e.target.value)}
              placeholder="Marketing automation experience
Previous startup experience
Additional language skills"
              className="mt-1 h-20"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full bg-[#1F4B99] hover:brightness-110"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Kit...
          </>
        ) : hasGenerated ? (
          "Regenerate Kit"
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Complete Kit
          </>
        )}
      </Button>
    </div>
  );
}