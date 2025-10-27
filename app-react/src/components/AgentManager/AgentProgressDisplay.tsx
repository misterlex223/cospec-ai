// agentProgressDisplay.js - Component to display agent task progress in real-time
import React, { useState, useEffect, useRef } from 'react';

export function AgentProgressDisplay({ taskId, onClose }) {
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to agent progress WebSocket');
      // Subscribe to task progress updates
      socket.send(JSON.stringify({
        type: 'subscribe-to-task',
        taskId: taskId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'task-progress':
            if (data.taskId === taskId) {
              setTask(prevTask => ({
                ...prevTask,
                progress: data.progress,
                message: data.message,
                status: data.status,
                updatedAt: data.updatedAt
              }));
            }
            break;

          case 'task-completed':
            if (data.taskId === taskId) {
              setTask(prevTask => ({
                ...prevTask,
                status: 'completed',
                result: data.result,
                updatedAt: data.updatedAt
              }));
            }
            break;

          case 'task-failed':
            if (data.taskId === taskId) {
              setTask(prevTask => ({
                ...prevTask,
                status: 'failed',
                error: data.error,
                updatedAt: data.updatedAt
              }));
              setError(data.error);
            }
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('Agent progress WebSocket error:', err);
      setError('WebSocket 連接錯誤');
    };

    socket.onclose = () => {
      console.log('Agent progress WebSocket closed');
    };

    // Fetch initial task status
    fetchTaskStatus();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        // Unsubscribe from task progress updates
        socketRef.current.send(JSON.stringify({
          type: 'unsubscribe-from-task',
          taskId: taskId
        }));
        socketRef.current.close();
      }
    };
  }, [taskId]);

  // Fetch task status
  const fetchTaskStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agent/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }
      const data = await response.json();
      setTask(data.task);
    } catch (err) {
      console.error('Error fetching task status:', err);
      setError('無法獲取任務狀態');
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
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
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
          <div>Agent 任務錯誤</div>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px', color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  if (isLoading && !task) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          fontWeight: 'bold',
        }}>
          Agent 任務進度
        </div>
        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
          載入中...
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      fontFamily: 'system-ui, -apple-system, sans-serif',
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
        <div>Agent 任務進度</div>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '16px' }}>
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

        {(task.status === 'running' || task.status === 'pending') && (
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

        {task.status === 'completed' && task.result && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>結果</h4>
            <div style={{
              padding: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {typeof task.result === 'string'
                ? task.result
                : JSON.stringify(task.result, null, 2)}
            </div>
          </div>
        )}

        {task.status === 'failed' && task.error && (
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

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={fetchTaskStatus}
            style={{
              padding: '8px 16px',
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
    </div>
  );
}