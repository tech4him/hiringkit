"use client";

import { useState, useCallback } from "react";
import type { ArtifactType, KitArtifacts } from "@/types";

interface UseRegenLimitsOptions {
  kitId: string;
  initialCounts: Record<string, number>;
  isPaid: boolean;
  maxRegens?: number;
}

interface RegenerationState {
  counts: Record<string, number>;
  isRegenerating: Record<string, boolean>;
  errors: Record<string, string | null>;
  lastRegenerated: Record<string, Date | null>;
}

export function useRegenLimits({ 
  kitId, 
  initialCounts, 
  isPaid, 
  maxRegens = 3 
}: UseRegenLimitsOptions) {
  const [state, setState] = useState<RegenerationState>({
    counts: initialCounts,
    isRegenerating: {},
    errors: {},
    lastRegenerated: {},
  });

  const canRegenerate = useCallback((section: string): boolean => {
    if (isPaid) return true;
    const currentCount = state.counts[section] || 0;
    return currentCount < maxRegens;
  }, [state.counts, isPaid, maxRegens]);

  const getRemainingRegens = useCallback((section: string): number | 'unlimited' => {
    if (isPaid) return 'unlimited';
    const currentCount = state.counts[section] || 0;
    return Math.max(0, maxRegens - currentCount);
  }, [state.counts, isPaid, maxRegens]);

  const regenerateSection = useCallback(async (
    section: ArtifactType,
    styleSettings?: any
  ): Promise<{ section: any; regen_count: number; remaining_regens: number | 'unlimited' }> => {
    if (!canRegenerate(section)) {
      throw new Error('Regeneration limit exceeded');
    }

    setState(prev => ({
      ...prev,
      isRegenerating: { ...prev.isRegenerating, [section]: true },
      errors: { ...prev.errors, [section]: null },
    }));

    try {
      const response = await fetch(`/api/kits/${kitId}/sections/${section}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intake_overrides: {},
          style_settings: styleSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to regenerate section');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        counts: { ...prev.counts, [section]: result.data.regen_count },
        isRegenerating: { ...prev.isRegenerating, [section]: false },
        lastRegenerated: { ...prev.lastRegenerated, [section]: new Date() },
      }));

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isRegenerating: { ...prev.isRegenerating, [section]: false },
        errors: { ...prev.errors, [section]: errorMessage },
      }));
      
      throw error;
    }
  }, [kitId, canRegenerate]);

  const clearError = useCallback((section: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [section]: null },
    }));
  }, []);

  const getRegenCount = useCallback((section: string): number => {
    return state.counts[section] || 0;
  }, [state.counts]);

  const isRegenerating = useCallback((section: string): boolean => {
    return state.isRegenerating[section] || false;
  }, [state.isRegenerating]);

  const getError = useCallback((section: string): string | null => {
    return state.errors[section] || null;
  }, [state.errors]);

  const getLastRegenerated = useCallback((section: string): Date | null => {
    return state.lastRegenerated[section] || null;
  }, [state.lastRegenerated]);

  // Check if user should be prompted to upgrade
  const shouldPromptUpgrade = useCallback((section: string): boolean => {
    if (isPaid) return false;
    const currentCount = state.counts[section] || 0;
    return currentCount >= maxRegens;
  }, [state.counts, isPaid, maxRegens]);

  return {
    canRegenerate,
    getRemainingRegens,
    regenerateSection,
    clearError,
    getRegenCount,
    isRegenerating,
    getError,
    getLastRegenerated,
    shouldPromptUpgrade,
    counts: state.counts,
    maxRegens: isPaid ? 'unlimited' : maxRegens,
  };
}