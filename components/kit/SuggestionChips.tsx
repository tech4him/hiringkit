"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus } from "lucide-react";

interface SuggestionChipsProps {
  fieldType: 'outcomes' | 'responsibilities' | 'must_have' | 'nice_to_have' | 'questions';
  onSuggestionSelect: (suggestion: string) => void;
  currentValues?: string[];
  roleTitle?: string;
  industry?: string;
  className?: string;
}

export function SuggestionChips({
  fieldType,
  onSuggestionSelect,
  currentValues = [],
  roleTitle = '',
  className
}: SuggestionChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const suggestions = getSuggestions(fieldType, roleTitle);
  
  // Filter out suggestions that are already used
  const availableSuggestions = suggestions.filter(suggestion => 
    !currentValues.some(value => 
      value.toLowerCase().includes(suggestion.toLowerCase()) ||
      suggestion.toLowerCase().includes(value.toLowerCase())
    )
  );

  const displaySuggestions = isExpanded 
    ? availableSuggestions 
    : availableSuggestions.slice(0, 3);

  if (availableSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Suggestions</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {displaySuggestions.map((suggestion, index) => (
          <Chip
            key={index}
            variant="secondary"
            size="sm"
            className="cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
            onClick={() => onSuggestionSelect(suggestion)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Chip>
        ))}
        
        {availableSuggestions.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-xs"
          >
            {isExpanded ? 'Show less' : `+${availableSuggestions.length - 3} more`}
          </Button>
        )}
      </div>
    </div>
  );
}

function getSuggestions(
  fieldType: string, 
  roleTitle: string
): string[] {
  const normalizedRole = roleTitle.toLowerCase();
  const isManager = normalizedRole.includes('manager') || normalizedRole.includes('director') || normalizedRole.includes('lead');
  const isTech = normalizedRole.includes('engineer') || normalizedRole.includes('developer') || normalizedRole.includes('technical');
  const isMarketing = normalizedRole.includes('marketing') || normalizedRole.includes('content') || normalizedRole.includes('brand');
  const isSales = normalizedRole.includes('sales') || normalizedRole.includes('business development') || normalizedRole.includes('account');

  switch (fieldType) {
    case 'outcomes':
      const outcomeBase = [
        'Increase team productivity by 25%',
        'Improve customer satisfaction scores',
        'Reduce operational costs by 15%',
        'Launch 3 successful initiatives per quarter',
        'Establish efficient workflows and processes'
      ];

      if (isMarketing) {
        return [
          'Increase brand awareness by 30%',
          'Generate 50+ qualified leads monthly',
          'Launch 3 successful campaigns per quarter',
          'Improve conversion rates by 20%',
          'Establish thought leadership content strategy',
          ...outcomeBase
        ];
      }
      
      if (isSales) {
        return [
          'Exceed sales targets by 15%',
          'Increase deal closure rate to 85%',
          'Expand client base by 40%',
          'Reduce sales cycle time by 30%',
          'Build strategic partnerships',
          ...outcomeBase
        ];
      }

      if (isTech) {
        return [
          'Reduce system downtime by 90%',
          'Improve application performance by 40%',
          'Implement automated testing coverage',
          'Reduce technical debt by 30%',
          'Launch 2 major feature releases',
          ...outcomeBase
        ];
      }

      return outcomeBase;

    case 'responsibilities':
      const responsibilityBase = [
        'Collaborate with cross-functional teams',
        'Monitor performance metrics and KPIs',
        'Provide regular status updates to leadership',
        'Ensure compliance with company policies',
        'Mentor and support team members'
      ];

      if (isMarketing) {
        return [
          'Develop and execute marketing strategies',
          'Manage digital marketing campaigns',
          'Create compelling content for various channels',
          'Analyze campaign performance and ROI',
          'Coordinate with sales team on lead generation',
          ...responsibilityBase
        ];
      }

      if (isTech) {
        return [
          'Design and implement scalable solutions',
          'Write clean, maintainable code',
          'Participate in code reviews',
          'Troubleshoot and resolve technical issues',
          'Document technical specifications',
          ...responsibilityBase
        ];
      }

      return responsibilityBase;

    case 'must_have':
      const mustHaveBase = [
        'Bachelor\'s degree in relevant field',
        'Excellent communication skills',
        'Strong analytical and problem-solving abilities',
        'Proven track record of success',
        'Ability to work in fast-paced environment'
      ];

      if (isManager) {
        return [
          '3+ years of management experience',
          'Experience building and leading teams',
          'Strong leadership and decision-making skills',
          'Budget management experience',
          'Performance management experience',
          ...mustHaveBase
        ];
      }

      if (isTech) {
        return [
          '3+ years of programming experience',
          'Proficiency in relevant programming languages',
          'Experience with version control systems',
          'Understanding of software development lifecycle',
          'Experience with testing methodologies',
          ...mustHaveBase
        ];
      }

      return mustHaveBase;

    case 'nice_to_have':
      return [
        'Master\'s degree or relevant certifications',
        'Previous startup or high-growth company experience',
        'Industry-specific knowledge',
        'Additional language proficiency',
        'Public speaking or presentation experience',
        'Open source contributions',
        'Technical writing experience',
        'Cross-functional project experience'
      ];

    case 'questions':
      if (fieldType === 'questions') {
        return [
          'Tell me about a time when you exceeded expectations',
          'How do you prioritize competing deadlines?',
          'Describe your approach to problem-solving',
          'What motivates you in your work?',
          'How do you handle constructive feedback?',
          'Describe a challenging project you led',
          'How do you stay current with industry trends?',
          'Tell me about a time you disagreed with a decision'
        ];
      }
      return [];

    default:
      return [];
  }
}