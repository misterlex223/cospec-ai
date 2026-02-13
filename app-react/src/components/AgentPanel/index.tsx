/**
 * Agent Panel Component
 *
 * Main panel for agent execution and chat conversation
 * Supports both execution mode and conversation mode
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { X } from 'lucide-react';
import { AgentSelector } from './AgentSelector';
import { QuickRunButton } from './QuickRunButton';
import { closePanel, sendAgentChat, fetchAgentSuggestions, setCurrentConversation } from '../../store/slices/agentSlice';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import { AgentPrompt } from './AgentPrompt';
import { MessageSquare } from 'lucide-react';
import './agent-panel.css';

export type AgentMode = 'execution' | 'chat';

export function AgentPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { '*': filePath } = useParams();
  const isPanelOpen = useSelector((state: RootState) => state.agent.isPanelOpen);
  const currentExecution = useSelector((state: RootState) => state.agent.currentExecution);
  const currentConversation = useSelector((state: RootState) => state.agent.currentConversation);
  const currentSuggestions = useSelector((state: RootState) => state.agent.currentSuggestions);

  // Agent mode and conversation state
  const [agentMode, setAgentMode] = useState<AgentMode>('execution');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Auto-switch to chat mode when a conversation is selected
  useEffect(() => {
    if (currentConversation && agentMode === 'execution') {
      setAgentMode('chat');
    }
  }, [currentConversation, agentMode]);

  // Clear conversation when switching to execution mode
  useEffect(() => {
    if (agentMode === 'execution') {
      dispatch(setCurrentConversation(null as any));
    }
  }, [agentMode, dispatch]);

  // Fetch suggestions when file or mode changes
  useEffect(() => {
    if (agentMode === 'execution' && filePath) {
      dispatch(fetchAgentSuggestions(filePath) as any);
    }
  }, [dispatch, filePath, agentMode]);

  if (!isPanelOpen) return null;

  const handleRun = async () => {
    if (!selectedAgent || !filePath) return;

    try {
      const result = await dispatch(sendAgentChat({
        message: `分析並處理文件：${filePath}`,
        contextFiles: [filePath],
        agentType: selectedAgent,
        conversationId: undefined // Always create new conversation for execution mode
      })).unwrap();

      toast.success('Agent 已啟動');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Agent 執行失敗';
      toast.error(errMsg);
    }
  };

  const handleSwitchMode = (mode: AgentMode) => {
    setAgentMode(mode);
    setShowPrompt(false);
  };

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>AI Agent 面板</h3>
        <div className="agent-panel-header-right">
          <button
            className={`mode-switch ${agentMode === 'chat' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('chat')}
            title="對話模式"
          >
            <MessageSquare size={18} />
            對話
          </button>
          <button
            className={`mode-switch ${agentMode === 'execution' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('execution')}
            title="執行模式"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 4 10 4 4 12" />
              <polyline points="4 12 10 12 10 20" />
              <polyline points="8 12 20 12" />
            </svg>
            執行
          </button>
          <button
            className="pe-btn pe-btn-icon"
            onClick={() => dispatch(closePanel())}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="agent-panel-content">
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentChange={(agent) => setSelectedAgent(agent)}
        />

        <div className="agent-panel-actions">
          {agentMode === 'chat' ? (
            <div className="mode-actions-chat">
              {currentConversation && (
                <div className="current-conversation-info">
                  <span className="conversation-label">當前對話：</span>
                  <span className="conversation-name">
                    {currentConversation.agentType || 'General'}
                  </span>
                </div>
              )}
              <QuickRunButton
                selectedAgent={selectedAgent || null}
                targetFile={filePath || null}
                inputMessage={undefined}
                conversationId={currentConversation?.id}
                mode="chat"
              />
            </div>
          ) : (
            <div className="mode-actions-execution">
              <button
                className="pe-btn pe-btn-secondary"
                onClick={() => setShowPrompt(!showPrompt)}
                disabled={!filePath}
              >
                {showPrompt ? '返回編輯器' : '手動提示'}
              </button>
              <QuickRunButton
                selectedAgent={selectedAgent || null}
                targetFile={filePath || null}
                onRun={handleRun}
                mode="execution"
              />
            </div>
          )}
        </div>

        {agentMode === 'execution' && currentExecution && (
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

        {showPrompt && filePath && (
          <AgentPrompt
            targetFile={filePath}
            onExecute={() => {
              // Execute with custom prompt
              handleRun();
              setShowPrompt(false);
            }}
            onReturn={() => {
              // Close the panel completely
              dispatch(closePanel());
            }}
          />
        )}
      </div>

      {agentMode === 'chat' && (
        <div className="agent-panel-chat-section">
          <AgentPrompt
            targetFile={filePath || null}
            onReturn={() => {
              // In chat mode, return button clears current conversation
              dispatch(setCurrentConversation(null as any));
            }}
          />
        </div>
      )}
    </div>
  );
}
