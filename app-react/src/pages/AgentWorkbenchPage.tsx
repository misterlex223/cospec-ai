import { ConversationsList } from '../components/AgentWorkbench/ConversationsList';
import { AgentHistoryList } from '../components/AgentWorkbench/AgentHistoryList';
import { AgentStatsPanel } from '../components/AgentWorkbench/AgentStatsPanel';
import './agent-workbench-page.css';
import { useState } from 'react';
import './agent-workbench-page.css';

export function AgentWorkbenchPage() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'history'>('conversations');

  return (
    <div className="agent-workbench-page">
      <div className="workbench-container">
        <header className="workbench-header">
          <h1>AI Agent 工作台</h1>
          <p className="workbench-subtitle">管理對話、執行記錄和統計資訊</p>
        </header>

        <div className="workbench-tabs">
          <button
            className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            對話記錄
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            執行歷史
          </button>
        </div>

        <div className="workbench-content">
          <div className="stats-section">
            <AgentStatsPanel />
          </div>

          {activeTab === 'conversations' ? (
            <section className="tab-section">
              <h2>對話記錄</h2>
              <ConversationsList />
            </section>
          ) : (
            <section className="tab-section">
              <h2>執行歷史</h2>
              <AgentHistoryList />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
