/**
 * Conversations List Component
 *
 * Displays both agent executions and conversations with type indicators
 */

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchAgentHistory, deleteAgentExecution, fetchConversations, deleteConversation, setCurrentConversation } from '../../store/slices/agentSlice';
import type { AgentExecution, Conversation } from '../../services/api';
import { Trash2, ExternalLink, MessageSquare, Play } from 'lucide-react';
import { toast } from 'react-toastify';
import './agent-history-list.css';

interface ConversationsListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  onSelectExecution?: (execution: AgentExecution) => void;
}

type ListItem = AgentExecution | Conversation;

export function ConversationsList({ onSelectConversation, onSelectExecution }: ConversationsListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const executions = useSelector((state: RootState) => state.agent.executions);
  const conversations = useSelector((state: RootState) => state.agent.conversations);
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  useEffect(() => {
    dispatch(fetchAgentHistory({} as any));
    dispatch(fetchConversations() as any);
  }, [dispatch]);

  const isExecution = (item: ListItem): item is AgentExecution => {
    return 'targetFiles' in item;
  };

  const isConversation = (item: ListItem): item is Conversation => {
    return 'messages' in item;
  };

  const handleDeleteExecution = async (id: string) => {
    if (!window.confirm('確定要刪除此執行記錄？')) return;

    try {
      await dispatch(deleteAgentExecution(id)).unwrap();
      toast.success('已刪除');
    } catch (error: any) {
      toast.error(error.message || '刪除失敗');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!window.confirm('確定要刪除此對話？')) return;

    try {
      await dispatch(deleteConversation(id)).unwrap();
      toast.success('已刪除對話');
    } catch (error: any) {
      toast.error(error.message || '刪除失敗');
    }
  };

  const handleSelectExecution = (item: AgentExecution) => {
    onSelectExecution?.(item);
  };

  const handleSelectConversation = (item: Conversation) => {
    dispatch(setCurrentConversation(item as any));
    onSelectConversation?.(item);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const getStatusDisplay = (item: ListItem) => {
    if (isExecution(item)) {
      return item.status === 'success' ? '成功' :
             item.status === 'failed' ? '失敗' :
             item.status === 'running' ? '執行中' : '等待中';
    }
    if (isConversation(item)) {
      const lastMsg = item.messages[item.messages.length - 1];
      if (lastMsg) {
        return lastMsg.content.slice(0, 30) + '...';
      }
      return '尚未開始';
    }
    return '';
  };

  const getIcon = (item: ListItem) => {
    if (isExecution(item)) {
      return <Play size={18} />;
    }
    if (isConversation(item)) {
      return <MessageSquare size={18} />;
    }
    return null;
  };

  const getTypeDisplay = (item: ListItem) => {
    if (isExecution(item)) {
      return item.agentType || 'Unknown';
    }
    if (isConversation(item)) {
      return item.agentType || 'General';
    }
    return '';
  };

  const getSummary = (item: ListItem) => {
    if (isExecution(item)) {
      return item.summary;
    }
    if (isConversation(item)) {
      return item.messages?.length > 0
        ? `${item.messages.length} 則訊息`
        : '尚未開始';
    }
    return '';
  };

  if (isLoading) {
    return <div className="history-loading">載入中...</div>;
  }

  const hasItems = executions.length > 0 || conversations.length > 0;

  return (
    <div className="history-list">
      <div className="history-list-header">
        <h3>記錄列表</h3>
        <div className="list-type-filters">
          <button className={`type-filter ${!hasItems ? 'active' : ''}`}>
            全部
          </button>
        </div>
      </div>

      {!hasItems ? (
        <div className="history-empty">
          <MessageSquare size={48} />
          <p>尚無記錄</p>
          <p className="empty-hint">開始 Agent 對話或執行任務</p>
        </div>
      ) : (
        <div className="history-items">
          {[...conversations, ...executions].map((item) => {
            const id = isExecution(item) ? item.id : (item as Conversation).id;
            const typeClass = isExecution(item) ? 'execution' : 'conversation';

            return (
              <div key={id} className={`history-item ${typeClass}`}>
                <div className="item-header">
                  <div className="item-icon">
                    {getIcon(item)}
                  </div>
                  <div className="item-info">
                    <div className="item-title-row">
                      <span className="item-type">{getTypeDisplay(item)}</span>
                      <span className="item-time">
                        {isExecution(item) ? (
                          new Date((item as AgentExecution).startTime).toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          formatTime((item as Conversation).updatedAt)
                        )}
                      </span>
                    </div>
                    <div className="item-summary">{getSummary(item)}</div>
                  </div>
                  <div className="item-actions">
                    {isExecution(item) ? (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => handleSelectExecution(item as AgentExecution)}
                          title="查看詳情"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteExecution(item.id)}
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => handleSelectConversation(item as Conversation)}
                          title="查看對話"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteConversation((item as Conversation).id)}
                          title="刪除對話"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExecution(item) && (
                  <div className="item-body">
                    <div className="execution-files">
                      {(item as AgentExecution).targetFiles.map(file => (
                        <span key={file} className="file-tag">{file}</span>
                      ))}
                    </div>
                    {(item as AgentExecution).summary && (
                      <div className="execution-summary">
                        {(item as AgentExecution).summary}
                      </div>
                    )}
                  </div>
                )}

                <div className={`item-status ${ (item as AgentExecution).status || (item as Conversation).status}`}>
                  {getStatusDisplay(item)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
