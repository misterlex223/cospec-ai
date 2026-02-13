import React from 'react';
import { AgentStatsPanel } from './AgentStatsPanel';
import { AgentHistoryList } from './AgentHistoryList';
import './agent-workbench-page.css';

export function AgentWorkbenchPage() {
  return (
    <div className="agent-workbench-page">
      <div className="workbench-container">
        <header className="workbench-header">
          <h1>AI Agent 工作台</h1>
          <p className="workbench-subtitle">管理 Agent 執行記錄和統計資訊</p>
        </header>

        <AgentStatsPanel />

        <section className="history-section">
          <h2>執行記錄</h2>
          <AgentHistoryList />
        </section>
      </div>
    </div>
  );
}
