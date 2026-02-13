import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import './output-viewer.css';

export function AgentOutputViewer() {
  const { id } = useParams<{ id: string }>();
  const execution = useSelector((state: RootState) =>
    state.agent.executions.find(e => e.id === id)
  );
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (execution?.outputFilePath) {
      loadOutput();
    }
  }, [execution]);

  const loadOutput = async () => {
    if (!execution?.outputFilePath) return;

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
  };

  const handleExport = async (format: 'markdown' | 'pdf') => {
    if (!output) return;

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

  if (!execution) {
    return <div className="output-viewer-loading">載入中...</div>;
  }

  return (
    <div className="output-viewer">
      <div className="output-viewer-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          <ArrowLeft size={20} />
          返回
        </button>

        <h1>Agent 執行結果</h1>

        <div className="output-actions">
          <button className="pe-btn pe-btn-ghost" onClick={loadOutput}>
            <RefreshCw size={18} />
            重新載入
          </button>
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
        </div>
      </div>

      <div className="output-viewer-content">
        <div className="execution-metadata">
          <div className="metadata-row">
            <span className="metadata-label">Agent 類型:</span>
            <span className="metadata-value">{execution.agentType}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">目標檔案:</span>
            <div className="metadata-value">
              {execution.targetFiles.map(f => (
                <span key={f} className="file-tag">{f}</span>
              ))}
            </div>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">執行時間:</span>
            <span className="metadata-value">
              {new Date(execution.startTime).toLocaleString('zh-TW')}
            </span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">狀態:</span>
            <span className={`status-badge ${execution.status}`}>
              {execution.status === 'success' ? '成功' :
               execution.status === 'failed' ? '失敗' :
               execution.status === 'running' ? '執行中' : '等待中'}
            </span>
          </div>
          {execution.duration && (
            <div className="metadata-row">
              <span className="metadata-label">執行時間:</span>
              <span className="metadata-value">
                {(execution.duration / 1000).toFixed(2)} 秒
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="output-loading">載入輸出中...</div>
        ) : output ? (
          <div className="output-content" dangerouslySetInnerHTML={{ __html: output.replace(/\n/g, '<br/>') }} />
        ) : (
          <div className="output-empty">無輸出內容</div>
        )}

        {execution.error && (
          <div className="error-output">
            <h3>錯誤訊息</h3>
            <pre>{execution.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
