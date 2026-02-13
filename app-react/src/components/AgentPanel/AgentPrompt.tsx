import { useEffect, useState, useRef } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import './AgentPrompt.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentPromptProps {
  targetFile: string | null;
  onExecute?: (prompt: string) => void;
}

export function AgentPrompt({ targetFile, onExecute }: AgentPromptProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build prompt with @ file reference
      let prompt = input;
      if (targetFile) {
        prompt = `${input} @${targetFile}`;
      }

      // Call the execute callback if provided
      if (onExecute) {
        await onExecute(prompt);
      }

      // Simulate AI response (in real implementation, this would come from backend)
      const assistantMessage: Message = {
        role: 'assistant',
        content: `已收到您的請求。${targetFile ? `將參考文件 ${targetFile} 進行處理。` : '正在處理中...'}`,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `處理過程中發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="agent-prompt">
      <div className="agent-prompt-header">
        <h3>AI 對手</h3>
        <button
          className="agent-prompt-close"
          onClick={() => {/* Handle close - parent manages visibility */}
        }
        >
          <X size={18} />
        </button>
      </div>

      {targetFile && (
        <div className="agent-prompt-context">
          <span className="context-file">{`@${targetFile}`}</span>
          <span className="context-text">參考此文件進行對話</span>
        </div>
      )}

      <div className="agent-prompt-messages" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <div className="agent-prompt-welcome">
            <p>您好！我是您的 AI 助手。</p>
            <p>您可以：</p>
            <ul>
              <li>直接輸入問題或指令</li>
              {targetFile && <li>使用 <code>{`@${targetFile}`}</code> 參考當前文件</li>}
              <li>我會幫助您處理 Markdown 文件和編輯任務</li>
            </ul>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.timestamp} className={`agent-prompt-message ${msg.role}`}>
              <div className="message-content">
                {msg.role === 'user' ? (
                  <>
                    <span className="message-sender">您</span>
                    <span className="message-text">{msg.content}</span>
                  </>
                ) : (
                  <>
                    <span className="message-sender">AI</span>
                    <span className="message-text">{msg.content}</span>
                  </>
                )}
              </div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        {isLoading && (
          <div className="agent-prompt-message assistant">
            <div className="message-content">
              <span className="message-sender">AI</span>
              <span className="message-text loading">
                <Loader2 size={14} className="loading-icon" />
                正在處理中...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="agent-prompt-input-area">
        <textarea
          className="agent-prompt-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={targetFile
            ? `輸入您的問題... (使用 @${targetFile} 參考文件)`
            : '輸入您的問題...'}
          rows={3}
          disabled={isLoading}
        />
        <button
          className="agent-prompt-send"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          title="發送 (Enter)"
        >
          {isLoading ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>

      <div className="agent-prompt-suggestions">
        <button className="suggestion-chip">幫我撰寫文件摘要</button>
        <button className="suggestion-chip">檢查語法錯誤</button>
        <button className="suggestion-chip">優化內容結構</button>
      </div>
    </div>
  );
}
