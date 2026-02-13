/**
 * Agent Output Viewer Component
 *
 * Displays agent execution results or conversation messages
 * Supports both execution output and conversation viewing
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import type { AgentExecution, Conversation } from '../../services/api';
import './output-viewer.css';

export function AgentOutputViewer() {
  const { id } = useParams<{ id: string }>();
  const execution = useSelector((state: RootState) =>
    state.agent.executions.find(e => e.id === id)
  );
  const conversation = useSelector((state: RootState) =>
    state.agent.conversations.find(c => c.id === id)
  );

  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (execution?.outputFilePath) {
      loadOutput();
    }
  }, [execution]);

  // For conversations, load messages as output
  useEffect(() => {
    if (conversation && !output) {
      const messagesText = conversation.messages
        .map(msg => {
          const roleLabel = msg.role === 'user' ? '您' : 'AI';
          const timestamp = new Date(msg.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
          return `[${timestamp}] ${roleLabel}: ${msg.content}`;
        })
        .join('\n\n');
      setOutput(messagesText);
    }
  }, [conversation]);

  const loadOutput = async () => {
    if (execution?.outputFilePath) {
      setIsLoading(true);
      try {
        const response = await fetch(`./api/files/${execution.outputFilePath}`);
        if (response.ok) {
          const text = await response.text();
          setOutput(text);
        }
      } catch (error) {
        console.error('Failed to load output:', error);
        toast.error('載入輸出失敗');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExport = async (format: 'markdown' | 'pdf') => {
    if (!output && !execution) return;

    try {
      const response = await fetch(`/api/agent/export/${id}?format=${format}`);
      const data = await response.json();

      if (data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `agent-result-${id}.${format === 'markdown' ? 'md' : 'pdf'}`;
        a.click();
      }
    } catch (error) {
      toast.error('匯出失敗');
    }
  };

  const getTypeDisplay = () => {
    if (execution) {
      return execution.agentType || 'Unknown';
    }
    if (conversation) {
      return conversation.agentType || 'General';
    }
    return '';
  };

  const getStatusDisplay = () => {
    if (execution) {
      return execution.status === 'success' ? '成功' :
             execution.status === 'failed' ? '失敗' :
             execution.status === 'running' ? '執行中' : '等待中';
    }
    if (conversation) {
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      if (lastMsg?.role === 'user') {
        return '進行中';
      }
      return '已完成';
    }
    return '';
  };

  const getTargetDisplay = () => {
    if (execution) {
      return execution.targetFiles?.join(', ') || '無';
    }
    if (conversation) {
      return conversation.contextFiles?.join(', ') || '無';
    }
    return '';
  };

  const getMessageCount = () => {
    if (conversation) {
      return conversation.messages?.length || 0;
    }
    return 0;
  };

  if (!execution && !conversation) {
    return <div className="output-viewer-loading">找不到記錄</div>;
  }

  const title = execution ? 'Agent 執行結果' : '對話記錄';

  return (
    <div className="output-viewer">
      <div className="output-viewer-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          <ArrowLeft size={20} />
          返回
        </button>

        <h1>{title}</h1>

        <div className="output-metadata">
          <div className="metadata-row">
            <span className="metadata-label">類型：</span>
            <span className="metadata-value">
              {conversation ? '對話' : 'Agent 執行'}
            </span>
          </div>

          {execution && (
            <div className="metadata-row">
              <span className="metadata-label">Agent 類型：</span>
              <span className="metadata-value">{execution.agentType}</span>
            </div>
          )}

          {conversation && (
            <div className="metadata-row">
              <span className="metadata-label">訊息數量：</span>
              <span className="metadata-value">{getMessageCount()}</span>
            </div>
          )}

          <div className="metadata-row">
            <span className="metadata-label">目標檔案：</span>
            <span className="metadata-value">{getTargetDisplay()}</span>
          </div>

          <div className="metadata-row">
            <span className="metadata-label">狀態：</span>
            <span className="metadata-value">{getStatusDisplay()}</span>
          </div>

          {execution && execution.startTime && (
            <div className="metadata-row">
              <span className="metadata-label">執行時間：</span>
              <span className="metadata-value">
                {new Date(execution.startTime).toLocaleString('zh-TW')}
              </span>
            </div>
          )}

          {conversation && conversation.updatedAt && (
            <div className="metadata-row">
              <span className="metadata-label">更新時間：</span>
              <span className="metadata-value">
                {new Date(conversation.updatedAt).toLocaleString('zh-TW')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="output-actions">
        <button className="pe-btn pe-btn-ghost" onClick={loadOutput}>
          <RefreshCw size={18} />
          重新載入
        </button>

        {execution && (
          <>
            <button
              className="pe-btn pe-btn-secondary"
              onClick={() => handleExport('markdown')}
            >
              <Download size={18} />
              匯出 Markdown
            </button>
            <button
              className="pe-btn pe-btn-secondary"
              onClick={() => handleExport('pdf')}
            >
              <Download size={18} />
              匯出 PDF
            </button>
          </>
        )}

        {conversation && (
          <button
            className="pe-btn pe-btn-primary"
            onClick={() => {
              const messagesText = conversation.messages
                .map(msg => `${msg.role === 'user' ? '您' : 'AI'}: ${msg.content}`)
                .join('\n\n');
              navigator.clipboard.writeText(messagesText);
              toast.success('對話內容已複製到剪貼板');
            }}
          >
            <Download size={18} />
            複製對話
          </button>
        )}
      </div>

      <div className="output-viewer-content">
        {isLoading ? (
          <div className="output-loading">載入輸出中...</div>
        ) : output ? (
          <div className="output-content" dangerouslySetInnerHTML={{ __html: output.replace(/\n/g, '<br/>') }} />
        ) : (
          <div className="output-empty">無輸出內容</div>
        )}
      </div>

      {execution?.error && (
        <div className="error-output">
          <h3>錯誤訊息</h3>
          <pre>{execution.error}</pre>
        </div>
      )}
    </div>
  );
}
