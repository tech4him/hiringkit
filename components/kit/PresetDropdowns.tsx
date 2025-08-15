"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

interface PresetDropdownsProps {
  styleSettings: {
    industry?: string;
    seniority?: string;
    style?: string;
  };
  onStyleChange: (settings: Record<string, string>) => void;
  className?: string;
}

export function PresetDropdowns({
  styleSettings,
  onStyleChange,
  className
}: PresetDropdownsProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const industries = [
    { value: 'general', label: 'General Business', description: 'Professional language for various industries' },
    { value: 'nonprofit', label: 'Nonprofit', description: 'Mission-driven, impact-focused language' },
    { value: 'education', label: 'Education', description: 'Learning outcomes and student success focus' },
    { value: 'faith_based', label: 'Faith-Based', description: 'Values-based, community-focused language' },
    { value: 'smb', label: 'Small Business', description: 'Practical, results-oriented approach' },
  ];

  const seniorities = [
    { value: 'coordinator', label: 'Coordinator', description: 'Focus on execution and collaboration' },
    { value: 'manager', label: 'Manager', description: 'Leadership and team management focus' },
    { value: 'director', label: 'Director', description: 'Strategic thinking and vision-setting' },
  ];

  const styles = [
    { value: 'formal', label: 'Formal', description: 'Traditional business language' },
    { value: 'plain_english', label: 'Plain English', description: 'Clear, jargon-free communication' },
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable tone' },
  ];

  const DropdownButton = ({ 
    label, 
    value, 
    options, 
    field 
  }: { 
    label: string; 
    value: string; 
    options: Array<{ value: string; label: string; description: string }>; 
    field: string;
  }) => {
    const isOpen = openDropdown === field;
    const selectedOption = options.find(opt => opt.value === value);

    return (
      <div className="relative">
        <Label className="text-sm font-medium text-gray-700 mb-1 block">
          {label}
        </Label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpenDropdown(isOpen ? null : field)}
          className="w-full justify-between h-8 text-sm"
        >
          {selectedOption?.label || 'Select...'}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setOpenDropdown(null)}
            />
            
            {/* Dropdown */}
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              {options.map((option) => (
                <button
                  key={option.value}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-md last:rounded-b-md"
                  onClick={() => {
                    onStyleChange({
                      ...styleSettings,
                      [field]: option.value
                    });
                    setOpenDropdown(null);
                  }}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Generation Style Settings</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <DropdownButton
          label="Industry"
          value={styleSettings.industry || 'general'}
          options={industries}
          field="industry"
        />
        
        <DropdownButton
          label="Seniority"
          value={styleSettings.seniority || 'manager'}
          options={seniorities}
          field="seniority"
        />
        
        <DropdownButton
          label="Style"
          value={styleSettings.style || 'plain_english'}
          options={styles}
          field="style"
        />
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        These settings influence how AI regenerates sections to match your context and tone.
      </p>
    </div>
  );
}