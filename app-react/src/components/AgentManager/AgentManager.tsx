// AgentManager.tsx - Component to manage and display agent tasks
import React, { useState, useEffect, useCallback } from 'react';

interface AgentTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  description: string;
  result: any;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export function AgentManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/agent/tasks');
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch task status
  const fetchTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/agent/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }
      const data = await response.json();
      return data.task;
    } catch (error) {
      console.error('Error fetching task status:', error);
      return null;
    }
  }, []);

  // Create a file processing task
  const createFileProcessingTask = async (filePath: string, operation: string, description: string) => {
    try {
      const response = await fetch('/api/agent/tasks/file-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          operation,
          description
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const data = await response.json();
      // Refresh tasks list
      fetchTasks();
      return data.task;
    } catch (error) {
      console.error('Error creating file processing task:', error);
      throw error;
    }
  };

  // Create a content analysis task
  const createContentAnalysisTask = async (content: string, analysisType: string, description: string) => {
    try {
      const response = await fetch('/api/agent/tasks/content-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          analysisType,
          description
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const data = await response.json();
      // Refresh tasks list
      fetchTasks();
      return data.task;
    } catch (error) {
      console.error('Error creating content analysis task:', error);
      throw error;
    }
  };

  // Toggle panel visibility
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Fetch tasks when opening the panel
      fetchTasks();
    }
  };

  // View task details
  const viewTaskDetails = async (taskId: string) => {
    const task = await fetchTaskStatus(taskId);
    if (task) {
      setSelectedTask(task);
    }
  };

  // Cancel a task
  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/agent/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel task: ${response.status}`);
      }

      // Refresh tasks list
      fetchTasks();
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  // Close task details
  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  // Refresh tasks
  const handleRefresh = () => {
    fetchTasks();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  // Get status display text
  const getStatusText = (status: string) => {
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
  const getStatusColor = (status: string) => {
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
    <>
      <button
        onClick={togglePanel}
        className="agent-manager-toggle"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        🤖
      </button>

      {isOpen && !selectedTask && (
        <div
          className="agent-manager-panel"
          style={{
            position: 'fixed',
            bottom: '170px',
            right: '20px',
            width: '500px',
            height: '600px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>Agent 任務管理</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                style={{
                  padding: '4px 8px',
                  backgroundColor: isLoading ? '#93c5fd' : '#e0f2fe',
                  border: '1px solid #7dd3fc',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                {isLoading ? '刷新中...' : '刷新'}
              </button>
              <button
                onClick={togglePanel}
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
          </div>

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: '#fafafa',
            }}
          >
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px' }}>
                {isLoading ? '載入中...' : '目前沒有 Agent 任務'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    onClick={() => viewTaskDetails(task.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {task.description || `任務 ${task.id.substring(0, 8)}`}
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

                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <div>創建時間: {formatDate(task.createdAt)}</div>
                      <div>更新時間: {formatDate(task.updatedAt)}</div>
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
                    {task.status === 'running' && (
                      <div style={{ marginTop: '8px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelTask(task.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f87171',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          取消任務
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Task creation form */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' }}>創建新任務</h3>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>文件路徑:</label>
                  <input
                    type="text"
                    id="filePath"
                    placeholder="輸入文件路徑，例如: /example.md"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>操作類型:</label>
                  <select
                    id="operationType"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="analyze">分析文件</option>
                    <option value="format">格式化文件</option>
                    <option value="summarize">摘要文件</option>
                    <option value="wordcount">字數統計</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>任務描述:</label>
                  <input
                    type="text"
                    id="taskDescription"
                    placeholder="輸入任務描述"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <button
                  onClick={() => {
                    const filePath = (document.getElementById('filePath') as HTMLInputElement).value;
                    const operation = (document.getElementById('operationType') as HTMLSelectElement).value;
                    const description = (document.getElementById('taskDescription') as HTMLInputElement).value ||
                                      `${operation} 操作於 ${filePath}`;

                    if (filePath) {
                      createFileProcessingTask(filePath, operation, description);
                    } else {
                      alert('請輸入文件路徑');
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginRight: '8px',
                  }}
                >
                  創建文件處理任務
                </button>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>內容分析:</label>
                  <textarea
                    id="contentAnalysis"
                    placeholder="輸入要分析的內容"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>分析類型:</label>
                  <select
                    id="analysisType"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="summarize">內容摘要</option>
                    <option value="sentiment">情感分析</option>
                    <option value="keywords">關鍵詞提取</option>
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>分析描述:</label>
                  <input
                    type="text"
                    id="analysisDescription"
                    placeholder="輸入分析任務描述"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <button
                  onClick={() => {
                    const content = (document.getElementById('contentAnalysis') as HTMLTextAreaElement).value;
                    const analysisType = (document.getElementById('analysisType') as HTMLSelectElement).value;
                    const description = (document.getElementById('analysisDescription') as HTMLInputElement).value ||
                                      `內容${analysisType}分析`;

                    if (content) {
                      createContentAnalysisTask(content, analysisType, description);
                    } else {
                      alert('請輸入要分析的內容');
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  創建內容分析任務
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && selectedTask && (
        <div
          className="agent-task-details-panel"
          style={{
            position: 'fixed',
            bottom: '170px',
            right: '20px',
            width: '500px',
            height: '600px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>任務詳情</div>
            <button
              onClick={closeTaskDetails}
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

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                    {selectedTask.description || `任務 ${selectedTask.id.substring(0, 8)}`}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    ID: {selectedTask.id}
                  </div>
                </div>
                <span className={getStatusColor(selectedTask.status)} style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  {getStatusText(selectedTask.status)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>創建時間</div>
                  <div style={{ fontSize: '14px' }}>{formatDate(selectedTask.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>更新時間</div>
                  <div style={{ fontSize: '14px' }}>{formatDate(selectedTask.updatedAt)}</div>
                </div>
              </div>

              {selectedTask.status === 'running' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span>進度</span>
                    <span>{selectedTask.progress}%</span>
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
                      width: `${selectedTask.progress}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}

              {selectedTask.result && (
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
                    {typeof selectedTask.result === 'string'
                      ? selectedTask.result
                      : JSON.stringify(selectedTask.result, null, 2)}
                  </div>
                </div>
              )}

              {selectedTask.message && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>訊息</h4>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#e0f2fe',
                    borderRadius: '6px',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedTask.message}
                  </div>
                </div>
              )}

              {selectedTask.error && (
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
                    {selectedTask.error}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}