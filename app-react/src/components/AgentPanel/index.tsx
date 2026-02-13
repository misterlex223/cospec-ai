/**
 * Agent Panel Component
 *
 * Main panel for agent execution in editor
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { X } from 'lucide-react';
import { AgentSelector } from './AgentSelector';
import { QuickRunButton } from './QuickRunButton';
import { closePanel, executeAgent } from '../../store/slices/agentSlice';
import type { AgentType } from '../../types/agent';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import { AgentPrompt } from './AgentPrompt';
import './agent-panel.css';

export function AgentPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { '*': filePath } = useParams();
  const isPanelOpen = useSelector((state: RootState) => state.agent.isPanelOpen);
  const currentExecution = useSelector((state: RootState) => state.agent.currentExecution);

  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  if (!isPanelOpen) return null;

  const handleRun = async () => {
    if (!selectedAgent || !filePath) return;

    try {
      const result = await dispatch(executeAgent({
        agentType: selectedAgent,
        targetFiles: [filePath!],
      })).unwrap();

      toast.success('Agent 已啟動');
      // Optional: Navigate to result page
      // window.location.hash = `#/agent/result/${result.executionId}`;
    } catch (error: any) {
      toast.error(error.message || 'Agent 執行失敗');
    }
  };

  const handlePromptExecute = async (prompt: string) => {
    if (!filePath) return;

    try {
      const result = await dispatch(executeAgent({
        agentType: selectedAgent || 'general',
        targetFiles: [filePath!],
        customPrompt: prompt
      })).unwrap();

      toast.success('Agent 已啟動');
      setShowPrompt(false);
    } catch (error: any) {
      toast.error(error.message || 'Agent 執行失敗');
    }
  };

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>AI Agent Panel</h3>
        <button
          className="pe-btn pe-btn-icon"
          onClick={() => dispatch(closePanel())}
        >
          <X size={20} />
        </button>
      </div>

      <div className="agent-panel-content">
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />

        <div className="agent-panel-actions">
          {showPrompt ? (
            <button
              className="pe-btn pe-btn-primary"
              onClick={() => setShowPrompt(false)}
            >
              返回
            </button>
          ) : (
            <>
              <button
                className="pe-btn pe-btn-ghost"
                onClick={() => setShowPrompt(true)}
              >
                對手模式
              </button>
              <QuickRunButton
                selectedAgent={selectedAgent}
                targetFile={filePath || null}
                onRun={handleRun}
              />
            </>
          )}
        </div>

        {currentExecution && (
          <div className="current-execution">
            <div className="execution-status">
              <span className={`status-badge ${currentExecution.status}`}>
                {currentExecution.status === 'running' ? '執行中' :
                 currentExecution.status === 'success' ? '成功' :
                 currentExecution.status === 'failed' ? '失敗' : '等待中'}
              </span>
            </div>
            {currentExecution.summary && (
              <div className="execution-summary">
                {currentExecution.summary}
              </div>
            )}
          </div>
        )}
      </div>

      {showPrompt && filePath && (
        <AgentPrompt
          targetFile={filePath}
          onExecute={handlePromptExecute}
        />
      )}
    </div>
  );
}
