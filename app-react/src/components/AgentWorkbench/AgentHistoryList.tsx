import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchAgentHistory, deleteAgentExecution } from '../../store/slices/agentSlice';
import { Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import './AgentHistoryList.css';

export function AgentHistoryList() {
  const dispatch = useDispatch<AppDispatch>();
  const executions = useSelector((state: RootState) => state.agent.executions);
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  useEffect(() => {
    dispatch(fetchAgentHistory({}));
  }, [dispatch]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此記錄？')) return;

    try {
      await dispatch(deleteAgentExecution(id)).unwrap();
      toast.success('已刪除');
    } catch (error: any) {
      toast.error(error.message || '刪除失敗');
    }
  };

  const navigateToResult = (id: string) => {
    window.location.hash = `#/agent/result/${id}`;
  };

  if (isLoading) {
    return <div className="history-loading">載入中...</div>;
  }

  if (executions.length === 0) {
    return <div className="history-empty">尚無執行記錄</div>;
  }

  return (
    <div className="history-list">
      {executions.map(execution => (
        <div key={execution.id} className="history-item">
          <div className="history-item-header">
            <div className="history-item-title">
              <span className={`agent-type-badge ${execution.agentType}`}>
                {execution.agentType}
              </span>
              <span className="execution-time">
                {new Date(execution.startTime).toLocaleString('zh-TW')}
              </span>
            </div>
            <div className="history-item-actions">
              <button
                className="pe-btn pe-btn-icon"
                onClick={() => navigateToResult(execution.id)}
                title="查看詳情"
              >
                <ExternalLink size={16} />
              </button>
              <button
                className="pe-btn pe-btn-icon"
                onClick={() => handleDelete(execution.id)}
                title="刪除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="history-item-body">
            <div className="execution-files">
              {execution.targetFiles.map(file => (
                <span key={file} className="file-tag">{file}</span>
              ))}
            </div>

            {execution.summary && (
              <div className="execution-summary">
                {execution.summary}
              </div>
            )}

            <div className={`execution-status ${execution.status}`}>
              {execution.status === 'success' ? '✓ 成功' :
               execution.status === 'failed' ? '✗ 失敗' :
               execution.status === 'running' ? '⟳ 執行中' : '等待中'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
