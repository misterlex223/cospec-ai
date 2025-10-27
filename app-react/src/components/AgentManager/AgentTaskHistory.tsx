// agentTaskHistory.js - Component to display agent task history
import React, { useState, useEffect } from 'react';

export function AgentTaskHistory({ onTaskSelect }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, failed, running

  // Fetch task history
  useEffect(() => {
    fetchTaskHistory();
  }, [filter]);

  const fetchTaskHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = '/api/agent/tasks';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Error fetching task history:', err);
      setError('無法獲取任務歷史');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  // Get status display text
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'running': return '執行中';
      case 'completed': return '已完成';
      case 'failed': return '失敗';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div style={{ padding: '16px', color: '#dc2626' }}>
        錯誤: {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '0 16px'
      }}>
        <h3 style={{ fontWeight: 'bold', fontSize: '16px' }}>任務歷史</h3>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '14px',
            }}
          >
            <option value="all">所有任務</option>
            <option value="completed">已完成</option>
            <option value="failed">失敗</option>
            <option value="running">執行中</option>
            <option value="pending">等待中</option>
          </select>
          <button
            onClick={fetchTaskHistory}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            重新整理
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          載入中...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          沒有找到任務記錄
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '0 16px 16px 16px'
        }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
              }}
              onClick={() => onTaskSelect && onTaskSelect(task)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                    {task.description || `任務 ${task.id.substring(0, 8)}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    ID: {task.id}
                  </div>
                </div>
                <span className={getStatusColor(task.status)} style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {getStatusText(task.status)}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <div>創建: {formatDate(task.createdAt)}</div>
                <div>更新: {formatDate(task.updatedAt)}</div>
              </div>

              {task.status === 'running' && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>進度</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: '#8b5cf6',
                      width: `${task.progress}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}