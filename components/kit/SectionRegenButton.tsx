"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Lock, Crown, Loader2 } from "lucide-react";

interface SectionRegenButtonProps {
  section: string;
  regenCount: number;
  maxRegens: number;
  onRegenerate: () => void;
  isPaid: boolean;
  isLoading?: boolean;
}

export function SectionRegenButton({
  regenCount,
  maxRegens,
  onRegenerate,
  isPaid,
  isLoading = false
}: SectionRegenButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const remaining = isPaid ? 'unlimited' : Math.max(0, maxRegens - regenCount);
  const isLimitReached = !isPaid && regenCount >= maxRegens;

  const handleRegenerate = async () => {
    if (isLimitReached || isRegenerating || isLoading) return;
    
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isPaid) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={handleRegenerate}
        disabled={isRegenerating || isLoading}
        className="flex items-center gap-2 h-7 px-3 text-xs"
      >
        {isRegenerating || isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RotateCcw className="h-3 w-3" />
        )}
        {isRegenerating || isLoading ? 'Regenerating...' : 'Regenerate'}
        <Crown className="h-3 w-3 text-yellow-500" />
      </Button>
    );
  }

  if (isLimitReached) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled
          className="flex items-center gap-2 h-7 px-3 text-xs opacity-50"
        >
          <Lock className="h-3 w-3" />
          Limit Reached
        </Button>
        <span className="text-xs text-gray-500">
          0/{maxRegens}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={handleRegenerate}
        disabled={isRegenerating || isLoading}
        className="flex items-center gap-2 h-7 px-3 text-xs hover:bg-blue-50 hover:border-blue-200"
      >
        {isRegenerating || isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RotateCcw className="h-3 w-3" />
        )}
        {isRegenerating || isLoading ? 'Regenerating...' : 'Regenerate'}
      </Button>
      <span className="text-xs text-gray-500">
        {remaining}/{maxRegens}
      </span>
    </div>
  );
}