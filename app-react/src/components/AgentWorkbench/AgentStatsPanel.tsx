import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { BarChart, Clock, CheckCircle } from 'lucide-react';
import './AgentStatsPanel.css';

export function AgentStatsPanel() {
  const stats = useSelector((state: RootState) => state.agent.stats);

  if (!stats) {
    return <div className="stats-loading">載入中...</div>;
  }

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-icon">
          <BarChart size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalExecutions}</div>
          <div className="stat-label">總執行次數</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon success">
          <CheckCircle size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{Math.round(stats.successRate * 100)}%</div>
          <div className="stat-label">成功率</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <Clock size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{Math.round(stats.avgDuration / 1000)}s</div>
          <div className="stat-label">平均時間</div>
        </div>
      </div>
    </div>
  );
}
