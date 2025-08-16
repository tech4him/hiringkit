"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuggestionChips } from "./SuggestionChips";
import { SectionRegenButton } from "./SectionRegenButton";
import { PresetDropdowns } from "./PresetDropdowns";
import { 
  Edit3, 
  Lock, 
  Crown, 
  ArrowRight, 
  ArrowLeft, 
  Target,
  Globe,
  MessageSquare,
  Award,
  Users,
  ShieldCheck,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import type { IntakeData, Kit, KitArtifacts } from "@/types";
import { useDebouncedCallback } from 'use-debounce';

interface ImprovedKitBuilderProps {
  kit: Kit;
  artifacts: KitArtifacts | null;
  onInputUpdate: (updates: Partial<IntakeData>) => void;
  onSectionRegenerate: (section: string, styleSettings?: Record<string, string>) => void;
  isUpdating: boolean;
  isPaid: boolean;
  onUnlock?: () => void;
  editedArtifacts?: Partial<KitArtifacts> | null;
  isRegenerating?: Record<string, boolean>;
}

const sections = [
  { id: 'basics', name: 'Role Basics', icon: Target, description: 'Role title, mission, and core information' },
  { id: 'scorecard', name: 'Scorecard', icon: Target, description: 'Key outcomes and responsibilities' },
  { id: 'job_post', name: 'Job Post', icon: Globe, description: 'Requirements and job description' },
  { id: 'interview', name: 'Interview Pack', icon: MessageSquare, description: '3-stage interview questions' },
  { id: 'work_sample', name: 'Work Sample', icon: Award, description: '1-hour practical exercise' },
  { id: 'reference', name: 'Reference Check', icon: Users, description: 'Reference call script' },
  { id: 'process', name: 'Process Map', icon: Users, description: 'Hiring workflow steps' },
  { id: 'eeo', name: 'EEO Guidelines', icon: ShieldCheck, description: 'Legal compliance guide' }
];

export function ImprovedKitBuilder({
  kit,
  artifacts,
  onInputUpdate,
  onSectionRegenerate,
  isPaid,
  onUnlock,
  editedArtifacts,
  isRegenerating = {}
}: ImprovedKitBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [localData, setLocalData] = useState<IntakeData>(kit.intake_json);
  const [styleSettings, setStyleSettings] = useState<Record<string, string>>({
    industry: 'general',
    seniority: 'manager', 
    style: 'plain_english'
  });

  // Merge edited artifacts with original artifacts for display
  const displayArtifacts = artifacts ? {
    ...artifacts,
    ...editedArtifacts,
  } : null;

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

  const getArrayFieldValue = (field: keyof IntakeData): string => {
    const value = localData[field] as string[];
    return Array.isArray(value) ? value.join('\n') : '';
  };

  const nextStep = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderBasicsStep = () => (
    <div className="space-y-6">
      {/* Style Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PresetDropdowns
            styleSettings={styleSettings}
            onStyleChange={setStyleSettings}
          />
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Information</CardTitle>
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
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              value={localData.organization || ""}
              onChange={(e) => updateField("organization", e.target.value)}
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
    </div>
  );

  const renderScorecardStep = () => (
    <div className="space-y-6">
      {/* Edit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Edit Scorecard
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
            <Label htmlFor="outcomes">Key Outcomes (one per line, max 3)</Label>
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
            onSuggestionSelect={(suggestion) => updateField('outcomes', [...(localData.outcomes || []), suggestion])}
            currentValues={localData.outcomes || []}
            roleTitle={localData.role_title}
            industry={styleSettings.industry}
          />

          <div>
            <Label htmlFor="responsibilities">Key Responsibilities (one per line, max 5)</Label>
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
            onSuggestionSelect={(suggestion) => updateField('responsibilities', [...(localData.responsibilities || []), suggestion])}
            currentValues={localData.responsibilities || []}
            roleTitle={localData.role_title}
            industry={styleSettings.industry}
          />
        </CardContent>
      </Card>

      {/* Live Preview */}
      {displayArtifacts?.scorecard && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">✓ Generated Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Mission</h4>
              <p className="text-sm mb-4">{displayArtifacts.scorecard.mission}</p>
              
              <h4 className="font-semibold mb-2">Key Outcomes</h4>
              <ul className="text-sm space-y-1 mb-4">
                {displayArtifacts.scorecard.outcomes?.slice(0, 3).map((outcome, i) => (
                  <li key={i}>• {outcome}</li>
                ))}
              </ul>
              
              <h4 className="font-semibold mb-2">Responsibilities</h4>
              <ul className="text-sm space-y-1">
                {displayArtifacts.scorecard.responsibilities?.slice(0, 3).map((resp, i) => (
                  <li key={i}>• {resp}</li>
                ))}
              </ul>
              
              {displayArtifacts.scorecard.outcomes?.length > 3 && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Lock className="h-4 w-4 inline mr-1" />
                    +{displayArtifacts.scorecard.outcomes.length - 3} more items in full version
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderJobPostStep = () => (
    <div className="space-y-6">
      {/* Edit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Edit Job Requirements
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
        </CardContent>
      </Card>

      {/* Live Preview */}
      {displayArtifacts?.job_post && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">✓ Generated Job Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Role Summary</h4>
              <p className="text-sm mb-4">{displayArtifacts.job_post.summary?.slice(0, 200)}...</p>
              
              <h4 className="font-semibold mb-2">Must-Have Requirements</h4>
              <ul className="text-sm space-y-1 mb-4">
                {displayArtifacts.job_post.must?.slice(0, 3).map((req, i) => (
                  <li key={i}>• {req}</li>
                ))}
              </ul>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Full job post with introduction, complete requirements, and nice-to-haves available in full version
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderPreviewOnlyStep = (sectionName: string, sectionData: any) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            {sectionName}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSectionRegenerate(sectionName.toLowerCase(), styleSettings)}
              disabled={isRegenerating[sectionName.toLowerCase()]}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              This section is automatically generated. Use the regenerate button to create new content.
            </p>
            
            {sectionData && (
              <div className="bg-white p-3 rounded border">
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(sectionData, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <Crown className="h-4 w-4 inline mr-1" />
                Full editing capabilities available after purchase
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    const section = sections[currentStep];
    
    switch (section.id) {
      case 'basics':
        return renderBasicsStep();
      case 'scorecard':
        return renderScorecardStep();
      case 'job_post':
        return renderJobPostStep();
      case 'interview':
        return renderPreviewOnlyStep('Interview Pack', displayArtifacts?.interview);
      case 'work_sample':
        return renderPreviewOnlyStep('Work Sample', displayArtifacts?.work_sample);
      case 'reference':
        return renderPreviewOnlyStep('Reference Check', displayArtifacts?.reference_check);
      case 'process':
        return renderPreviewOnlyStep('Process Map', displayArtifacts?.process_map);
      case 'eeo':
        return renderPreviewOnlyStep('EEO Guidelines', displayArtifacts?.eeo);
      default:
        return <div>Section not implemented</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Kit Builder</h1>
          {!isPaid && (
            <Button onClick={onUnlock} className="bg-[#1F4B99] text-white hover:brightness-110">
              <Crown className="h-4 w-4 mr-2" />
              Unlock Full Kit - $49
            </Button>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentStep(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentStep === index
                  ? "bg-[#1F4B99] text-white"
                  : currentStep > index
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === index
                  ? "bg-white text-[#1F4B99]"
                  : currentStep > index
                  ? "bg-green-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}>
                {currentStep > index ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span className="hidden sm:inline">{section.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          {(() => {
            const IconComponent = sections[currentStep].icon;
            return <IconComponent className="h-6 w-6 text-[#1F4B99]" />;
          })()}
          <div>
            <h2 className="text-xl font-semibold">{sections[currentStep].name}</h2>
            <p className="text-gray-600 text-sm">{sections[currentStep].description}</p>
          </div>
        </div>
        
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm text-gray-500">
          {currentStep + 1} of {sections.length}
        </span>
        
        <Button
          onClick={nextStep}
          disabled={currentStep === sections.length - 1}
          className="flex items-center gap-2 bg-[#1F4B99] text-white hover:brightness-110"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}