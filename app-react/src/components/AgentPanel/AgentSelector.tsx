/**
 * Agent Selector Component
 *
 * Dynamically loads and displays available agent types
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FileText, Code, FileCheck, Tag, Loader2 } from 'lucide-react';
import type { RootState, AppDispatch } from '../../store';
import { fetchAgentTypes } from '../../store/slices/agentSlice';
import type { AgentType } from '../../services/api';

interface AgentSelectorProps {
  selectedAgent: string | null;
  onAgentChange: (agent: string) => void;
}

// Icon mapping for agent types
const AGENT_ICONS: Record<string, React.ReactNode> = {
  'general': <Tag size={20} />,
  'prd-analyzer': <FileText size={20} />,
  'code-reviewer': <Code size={20} />,
  'doc-generator': <FileCheck size={20} />,
  'version-advisor': <Tag size={20} />,
  'bot': <Tag size={20} />,
  'file-text': <FileText size={20} />,
  'file-output': <FileCheck size={20} />,
};

export function AgentSelector({ selectedAgent, onAgentChange }: AgentSelectorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const agentTypes = useSelector((state: RootState) => state.agent.agentTypes);
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  // Fetch agent types on mount
  useEffect(() => {
    if (agentTypes.length === 0) {
      dispatch(fetchAgentTypes());
    }
  }, [dispatch]);

  return (
    <div className="agent-selector">
      <label className="pe-label">選擇 Agent 類型</label>
      <div className="agent-options">
        {isLoading ? (
          <div className="agent-loading">
            <Loader2 size={16} className="spin-icon" />
            載入中...
          </div>
        ) : agentTypes.length === 0 ? (
          <div className="agent-empty">無可用的 Agent 類型</div>
        ) : (
          agentTypes.map((agent) => (
            <button
              key={agent.id}
              className={`agent-option ${selectedAgent === agent.id ? 'selected' : ''}`}
              onClick={() => onAgentChange(agent.id)}
              title={agent.description}
            >
              <div className="agent-option-icon">
                {AGENT_ICONS[agent.icon] || AGENT_ICONS[agent.id] || <Tag size={20} />}
              </div>
              <div className="agent-option-content">
                <div className="agent-option-label">{agent.name}</div>
                <div className="agent-option-description">{agent.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
