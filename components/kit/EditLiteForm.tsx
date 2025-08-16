"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestionChips } from "./SuggestionChips";
import { SectionRegenButton } from "./SectionRegenButton";
import { PresetDropdowns } from "./PresetDropdowns";
import { Edit3, Lock, Crown } from "lucide-react";
import type { IntakeData, Kit } from "@/types";
import { useDebouncedCallback } from 'use-debounce';

interface EditLiteFormProps {
  kit: Kit;
  onInputUpdate: (updates: Partial<IntakeData>) => void;
  onSectionRegenerate: (section: string, styleSettings?: Record<string, string>) => void;
  isUpdating: boolean;
  isPaid: boolean;
  onUnlock?: () => void;
}


export function EditLiteForm({
  kit,
  onInputUpdate,
  onSectionRegenerate,
  isPaid,
  onUnlock
}: EditLiteFormProps) {
  const [localData, setLocalData] = useState<IntakeData>(kit.intake_json);
  const [styleSettings, setStyleSettings] = useState<Record<string, string>>({
    industry: 'general',
    seniority: 'manager', 
    style: 'plain_english'
  });

  // Debounced update to prevent excessive API calls
  const debouncedUpdate = useDebouncedCallback(
    (updates: Partial<IntakeData>) => {
      onInputUpdate(updates);
    },
    500
  );

  const updateField = useCallback((field: keyof IntakeData, value: string | string[]) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
  }, [debouncedUpdate]);

  const updateArrayField = useCallback((field: keyof IntakeData, value: string, limit?: number) => {
    const items = value.split('\n').filter(item => item.trim());
    const trimmed = limit ? items.slice(0, limit) : items;
    updateField(field, trimmed);
  }, [updateField]);

  const handleSuggestionSelect = useCallback((field: keyof IntakeData, suggestion: string) => {
    const currentValues = localData[field] as string[] || [];
    const newValues = [...currentValues, suggestion];
    updateField(field, newValues);
  }, [localData, updateField]);


  const getArrayFieldValue = (field: keyof IntakeData): string => {
    const value = localData[field] as string[];
    return Array.isArray(value) ? value.join('\n') : '';
  };

  if (!isPaid) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit-Lite Mode
            </h2>
            <div className="flex items-center gap-2 text-orange-600">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Preview Mode</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Make focused edits to key fields and see live preview updates. Full editing unlocks after purchase.
          </p>
        </div>

        {/* Style Settings */}
        <div className="p-6 border-b bg-gray-50">
          <PresetDropdowns
            styleSettings={styleSettings}
            onStyleChange={setStyleSettings}
            className="mb-4"
          />
        </div>

        {/* Edit Sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Role Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Role Basics
                <SectionRegenButton
                  section="scorecard"
                  regenCount={kit.regen_counts?.scorecard || 0}
                  maxRegens={3}
                  onRegenerate={() => onSectionRegenerate('scorecard', styleSettings)}
                  isPaid={isPaid}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="role_title">Role Title</Label>
                <Input
                  id="role_title"
                  value={localData.role_title || ""}
                  onChange={(e) => updateField("role_title", e.target.value)}
                  className="mt-1"
                  maxLength={100}
                />
              </div>
              
              <div>
                <Label htmlFor="mission">Mission Statement</Label>
                <Textarea
                  id="mission"
                  value={localData.mission || ""}
                  onChange={(e) => updateField("mission", e.target.value)}
                  className="mt-1 h-20"
                  maxLength={1000}
                  placeholder="Describe the primary purpose and impact of this role..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Outcomes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Key Outcomes
                <span className="text-xs text-gray-500">
                  {(localData.outcomes?.length || 0)}/3 items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="outcomes">Outcomes (one per line, max 3)</Label>
                <Textarea
                  id="outcomes"
                  value={getArrayFieldValue('outcomes')}
                  onChange={(e) => updateArrayField('outcomes', e.target.value, 3)}
                  className="mt-1 h-20"
                  placeholder="Increase team productivity by 25%
Launch 3 successful campaigns per quarter
Improve customer satisfaction scores"
                />
              </div>

              <SuggestionChips
                fieldType="outcomes"
                onSuggestionSelect={(suggestion) => handleSuggestionSelect('outcomes', suggestion)}
                currentValues={localData.outcomes || []}
                roleTitle={localData.role_title}
                industry={styleSettings.industry}
              />
            </CardContent>
          </Card>

          {/* Key Responsibilities */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Key Responsibilities
                <span className="text-xs text-gray-500">
                  {(localData.responsibilities?.length || 0)}/5 items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="responsibilities">Responsibilities (one per line, max 5)</Label>
                <Textarea
                  id="responsibilities"
                  value={getArrayFieldValue('responsibilities')}
                  onChange={(e) => updateArrayField('responsibilities', e.target.value, 5)}
                  className="mt-1 h-24"
                  placeholder="Develop and execute comprehensive strategies
Manage cross-functional team collaboration
Analyze performance metrics and KPIs"
                />
              </div>

              <SuggestionChips
                fieldType="responsibilities"
                onSuggestionSelect={(suggestion) => handleSuggestionSelect('responsibilities', suggestion)}
                currentValues={localData.responsibilities || []}
                roleTitle={localData.role_title}
                industry={styleSettings.industry}
              />
            </CardContent>
          </Card>

          {/* Job Post Requirements */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Job Post Requirements
                <SectionRegenButton
                  section="job_post"
                  regenCount={kit.regen_counts?.job_post || 0}
                  maxRegens={3}
                  onRegenerate={() => onSectionRegenerate('job_post', styleSettings)}
                  isPaid={isPaid}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="must_have">Must-Have Requirements (max 5)</Label>
                <Textarea
                  id="must_have"
                  value={getArrayFieldValue('must_have')}
                  onChange={(e) => updateArrayField('must_have', e.target.value, 5)}
                  className="mt-1 h-20"
                  placeholder="3+ years of relevant experience
Bachelor's degree in related field
Strong analytical and communication skills"
                />
              </div>

              <SuggestionChips
                fieldType="must_have"
                onSuggestionSelect={(suggestion) => handleSuggestionSelect('must_have', suggestion)}
                currentValues={localData.must_have || []}
                roleTitle={localData.role_title}
                industry={styleSettings.industry}
              />

              <div>
                <Label htmlFor="nice_to_have">Nice-to-Have (max 5)</Label>
                <Textarea
                  id="nice_to_have"
                  value={getArrayFieldValue('nice_to_have')}
                  onChange={(e) => updateArrayField('nice_to_have', e.target.value, 5)}
                  className="mt-1 h-20"
                  placeholder="Advanced certifications
Previous startup experience
Additional language skills"
                />
              </div>

              <SuggestionChips
                fieldType="nice_to_have"
                onSuggestionSelect={(suggestion) => handleSuggestionSelect('nice_to_have', suggestion)}
                currentValues={localData.nice_to_have || []}
                roleTitle={localData.role_title}
                industry={styleSettings.industry}
              />
            </CardContent>
          </Card>

          {/* Work Sample */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Work Sample Scenario
                <SectionRegenButton
                  section="work_sample"
                  regenCount={kit.regen_counts?.work_sample || 0}
                  maxRegens={3}
                  onRegenerate={() => onSectionRegenerate('work_sample', styleSettings)}
                  isPaid={isPaid}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="work_sample_scenario">Scenario Description</Label>
                <Textarea
                  id="work_sample_scenario"
                  value={localData.work_sample_scenario || ""}
                  onChange={(e) => updateField("work_sample_scenario", e.target.value)}
                  className="mt-1 h-20"
                  maxLength={1000}
                  placeholder="Describe a realistic 1-hour work scenario that tests core competencies..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Prompt */}
          <Card className="border-[#1F4B99] bg-blue-50">
            <CardContent className="p-6 text-center">
              <Crown className="h-8 w-8 text-[#1F4B99] mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Unlock Full Editing</h3>
              <p className="text-gray-600 mb-4">
                Purchase your kit to unlock unlimited regenerations, interview questions editing, and complete customization.
              </p>
              <Button 
                size="lg" 
                className="bg-[#1F4B99] text-white hover:brightness-110"
                onClick={onUnlock}
              >
                Unlock Full Kit - $49
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full editing mode for paid users would be much more extensive
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Crown className="h-12 w-12 text-[#1F4B99] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Full Editing Mode</h3>
        <p className="text-gray-600">
          Complete editing interface with unlimited regenerations coming soon!
        </p>
      </div>
    </div>
  );
}