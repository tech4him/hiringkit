"use client";

import { useState, useCallback } from "react";
import type { IntakeData } from "@/types";

interface UseEditLiteOptions {
  kitId: string;
  initialData: IntakeData;
}

interface EditLiteState {
  data: IntakeData;
  isUpdating: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useEditLite({ kitId, initialData }: UseEditLiteOptions) {
  const [state, setState] = useState<EditLiteState>({
    data: initialData,
    isUpdating: false,
    error: null,
    lastUpdated: null,
  });

  const updateInputs = useCallback(async (updates: Partial<IntakeData>) => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const response = await fetch(`/api/kits/${kitId}/inputs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_updates: updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update inputs');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        data: result.data.intake_data,
        isUpdating: false,
        lastUpdated: new Date(),
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, [kitId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Optimistic local updates for better UX
  const updateLocalData = useCallback((updates: Partial<IntakeData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates }
    }));
  }, []);

  return {
    data: state.data,
    isUpdating: state.isUpdating,
    error: state.error,
    lastUpdated: state.lastUpdated,
    updateInputs,
    updateLocalData,
    clearError,
  };
}