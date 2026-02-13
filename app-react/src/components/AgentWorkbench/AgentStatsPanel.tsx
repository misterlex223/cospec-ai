import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { BarChart, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { fetchAgentHistory, fetchConversations } from '../../store/slices/agentSlice';
import './AgentStatsPanel.css';

export function AgentStatsPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector((state: RootState) => state.agent.stats);
  const conversations = useSelector((state: RootState) => state.agent.conversations);
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  // Fetch stats and conversations on mount
  useEffect(() => {
    if (!stats) {
      dispatch(fetchAgentHistory({} as any));
    }
    if (conversations.length === 0) {
      dispatch(fetchConversations() as any);
    }
  }, [dispatch]);

  // Calculate conversation stats
  const conversationStats = {
    total: conversations.length,
    today: conversations.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.updatedAt).toDateString() === today;
    }).length,
    thisWeek: conversations.filter(c => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(c.updatedAt) > weekAgo;
    }).length,
  };

  if (isLoading && !stats) {
    return <div className="stats-loading">載入中...</div>;
  }

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        {/* Conversations */}
        <div className="stat-card">
          <div className="stat-icon">
            <MessageSquare size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{conversationStats.total}</div>
            <div className="stat-label">對話數量</div>
          </div>
        </div>

        {/* Today */}
        <div className="stat-card">
          <div className="stat-icon today">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{conversationStats.today}</div>
            <div className="stat-label">今日對話</div>
          </div>
        </div>

        {/* This Week */}
        <div className="stat-card">
          <div className="stat-icon week">
            <BarChart size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{conversationStats.thisWeek}</div>
            <div className="stat-label">本週對話</div>
          </div>
        </div>

        {/* Execution Stats */}
        {stats && (
          <>
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {stats.avgDuration ? Math.round(stats.avgDuration / 1000) + 's' : '-'}
                </div>
                <div className="stat-label">平均時間</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon success">
                <CheckCircle size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {stats.successRate ? Math.round(stats.successRate * 100) + '%' : '-'}
                </div>
                <div className="stat-label">成功率</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
