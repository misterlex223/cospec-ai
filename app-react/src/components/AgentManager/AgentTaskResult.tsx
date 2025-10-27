// agentTaskResult.js - Component to display agent task results
import React from 'react';

export function AgentTaskResult({ task, onBack }) {
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>任務結果</div>
        <button
          onClick={onBack}
          style={{
            padding: '4px 8px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ← 返回
        </button>
      </div>

      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: '#fafafa',
      }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                {task.description || `任務 ${task.id.substring(0, 8)}`}
              </h3>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                ID: {task.id}
              </div>
            </div>
            <span className={getStatusColor(task.status)} style={{
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {getStatusText(task.status)}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>創建時間</div>
              <div style={{ fontSize: '14px' }}>{formatDate(task.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>更新時間</div>
              <div style={{ fontSize: '14px' }}>{formatDate(task.updatedAt)}</div>
            </div>
          </div>

          {task.status === 'running' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span>進度</span>
                <span>{task.progress}%</span>
              </div>
              <div style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: '#8b5cf6',
                  width: `${task.progress}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              {task.message && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                  {task.message}
                </div>
              )}
            </div>
          )}

          {task.result && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>結果</h4>
              <div style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {typeof task.result === 'string'
                  ? task.result
                  : JSON.stringify(task.result, null, 2)}
              </div>
            </div>
          )}

          {task.error && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>錯誤</h4>
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#991b1b',
                whiteSpace: 'pre-wrap'
              }}>
                {task.error}
              </div>
            </div>
          )}

          {task.status === 'completed' && !task.result && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              任務已完成，但沒有返回結果
            </div>
          )}
        </div>
      </div>
    </div>
  );
}