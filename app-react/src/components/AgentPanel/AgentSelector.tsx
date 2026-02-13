/**
 * Agent Selector Component
 *
 * Allows user to select agent type
 */

import React from 'react';
import { FileText, Code, FileCheck, Tag } from 'lucide-react';
import type { AgentType } from '../../types/agent';

interface AgentSelectorProps {
  selectedAgent: AgentType | null;
  onAgentChange: (agent: AgentType) => void;
}

const AGENT_OPTIONS: Array<{
  type: AgentType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    type: 'prd-analyzer',
    label: 'PRD Analyzer',
    icon: <FileText size={20} />,
    description: '分析 PRD 的完整性、清晰度、可行性'
  },
  {
    type: 'code-reviewer',
    label: 'Code Reviewer',
    icon: <Code size={20} />,
    description: '代碼審查（安全性、品質、效能）'
  },
  {
    type: 'doc-generator',
    label: 'Doc Generator',
    icon: <FileCheck size={20} />,
    description: '從程式碼生成 API 文檔、使用指南'
  },
  {
    type: 'version-advisor',
    label: 'Version Advisor',
    icon: <Tag size={20} />,
    description: '根據 SemVer 建議版本號和發布策略'
  }
];

export function AgentSelector({ selectedAgent, onAgentChange }: AgentSelectorProps) {
  return (
    <div className="agent-selector">
      <label className="pe-label">選擇 Agent 類型</label>
      <div className="agent-options">
        {AGENT_OPTIONS.map(option => (
          <button
            key={option.type}
            className={`agent-option ${selectedAgent === option.type ? 'selected' : ''}`}
            onClick={() => onAgentChange(option.type)}
          >
            <div className="agent-option-icon">{option.icon}</div>
            <div className="agent-option-content">
              <div className="agent-option-label">{option.label}</div>
              <div className="agent-option-description">{option.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
