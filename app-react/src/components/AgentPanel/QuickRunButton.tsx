/**
 * Quick Run Button Component
 *
 * Button to execute agent with loading state
 */

import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Play } from 'lucide-react';

interface QuickRunButtonProps {
  selectedAgent: string | null;
  targetFile: string | null;
  onRun: () => void;
  disabled?: boolean;
}

export function QuickRunButton({ selectedAgent, targetFile, onRun, disabled }: QuickRunButtonProps) {
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  const canRun = selectedAgent && targetFile && !isLoading && !disabled;

  return (
    <button
      className={`pe-btn pe-btn-primary ${canRun ? '' : 'disabled'}`}
      onClick={onRun}
      disabled={!canRun}
    >
      <Play size={18} />
      {isLoading ? '執行中...' : '執行 Agent'}
    </button>
  );
}
